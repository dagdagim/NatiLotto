import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ComplianceService } from '../compliance/compliance.service';
import { AuditService } from '../audit/audit.service';
import { DrawStatus, OrderStatus, TicketStatus, PaymentMethod, PaymentStatus } from '@nati-lotto/shared-types';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly compliance: ComplianceService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Concurrency-safe ticket purchasing and order creation.
   * Utilizes raw PostgreSQL row-level locking (SELECT ... FOR UPDATE)
   * to guarantee zero overselling under arbitrary concurrent load.
   */
  async createOrder(params: {
    userId: string;
    drawId: string;
    quantity: number;
    paymentMethod: PaymentMethod;
    idempotencyKey: string;
    selectedSequenceNumbers?: number[];
    returnUrl?: string;
  }) {
    const { userId, drawId, quantity, paymentMethod, idempotencyKey, selectedSequenceNumbers, returnUrl: clientReturnUrl } = params;

    if (quantity <= 0 || quantity > 50) {
      throw new BadRequestException('Ticket quantity must be between 1 and 50 per order');
    }

    // 1. Check idempotency: If order exists with this key, return it
    const existingOrder = await this.prisma.order.findUnique({
      where: { idempotencyKey },
      include: { tickets: true, payment: true, draw: true },
    });

    if (existingOrder) {
      this.logger.log(`[ORDER_IDEMPOTENT] Returning existing order ${existingOrder.id} for idempotency key`);
      return existingOrder;
    }

    // 2. Perform compliance verification (age, active restrictions, daily limits)
    await this.compliance.verifyUserEligibility(userId, quantity, drawId);

    // 3. Atomic Database Transaction with Pessimistic Row Lock
    const orderResult = await this.prisma.$transaction(async (tx) => {
      // Execute SELECT ... FOR UPDATE to acquire exclusive lock on this Draw row
      const lockedDrawRows: any[] = await tx.$queryRaw`
        SELECT "id", "drawNumber", "title", "ticketPriceEtb", "totalTickets", "soldTickets", "status", "salesEndDate"
        FROM "Draw"
        WHERE "id" = ${drawId} OR "drawNumber" = ${drawId}
        LIMIT 1
        FOR UPDATE
      `;

      if (!lockedDrawRows || lockedDrawRows.length === 0) {
        throw new NotFoundException('Draw not found');
      }

      const draw = lockedDrawRows[0];

      // Verify draw status is active and not completed/cancelled
      if (draw.status === DrawStatus.COMPLETED || draw.status === DrawStatus.CANCELLED) {
        throw new BadRequestException(`Tickets cannot be purchased: Draw is currently in '${draw.status}' status`);
      }

      const currentSold = Number(draw.soldTickets);
      const totalTickets = Number(draw.totalTickets);
      const remainingTickets = totalTickets - currentSold;

      // STRICT OVERSELLING GUARD
      if (remainingTickets < quantity) {
        throw new BadRequestException(
          `Insufficient tickets available. Requested: ${quantity}, Remaining: ${remainingTickets}`
        );
      }

      // Determine sequence numbers to allocate
      let allocatedSeqs: number[] = [];

      if (selectedSequenceNumbers && selectedSequenceNumbers.length > 0) {
        if (selectedSequenceNumbers.length !== quantity) {
          throw new BadRequestException('Selected ticket count must match order quantity');
        }

        // Validate each is in range 1..totalTickets
        for (const seq of selectedSequenceNumbers) {
          if (seq < 1 || seq > totalTickets) {
            throw new BadRequestException(`Ticket number #${seq} is out of bounds (1-${totalTickets})`);
          }
        }

        // Check uniqueness in the requested list
        const uniqueSeqs = new Set(selectedSequenceNumbers);
        if (uniqueSeqs.size !== quantity) {
          throw new BadRequestException('Duplicate ticket numbers selected in request');
        }

        // Check if any are already booked in DB
        const alreadyBooked = await tx.ticket.findMany({
          where: {
            drawId: draw.id,
            sequenceNumber: { in: selectedSequenceNumbers },
          },
          select: { sequenceNumber: true, ticketNumber: true },
        });

        if (alreadyBooked.length > 0) {
          const bookedNums = alreadyBooked.map((t) => t.ticketNumber).join(', ');
          throw new BadRequestException(`The following tickets are already taken: ${bookedNums}`);
        }

        allocatedSeqs = [...selectedSequenceNumbers];
      } else {
        // Auto-allocate available ticket numbers
        const allBooked = await tx.ticket.findMany({
          where: { drawId: draw.id },
          select: { sequenceNumber: true },
        });
        const bookedSet = new Set(allBooked.map((t) => t.sequenceNumber));

        for (let s = 1; s <= totalTickets && allocatedSeqs.length < quantity; s++) {
          if (!bookedSet.has(s)) {
            allocatedSeqs.push(s);
          }
        }

        if (allocatedSeqs.length < quantity) {
          throw new BadRequestException('Insufficient available tickets in this draw');
        }
      }

      const unitPriceEtb = Number(draw.ticketPriceEtb);
      const subtotalEtb = unitPriceEtb * quantity;
      const feeEtb = 0; // Transparent zero hidden fees
      const totalEtb = subtotalEtb + feeEtb;

      const orderNumber = `ORD-NL-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

      const isChapa = paymentMethod === PaymentMethod.CHAPA || (paymentMethod as string) === 'CHAPA';
      const orderStatus = isChapa ? OrderStatus.PENDING : OrderStatus.COMPLETED;
      const paymentStatus = isChapa ? PaymentStatus.PENDING : PaymentStatus.SUCCESS;
      const ticketStatus = isChapa ? TicketStatus.RESERVED : TicketStatus.CONFIRMED;

      // Create Order in PENDING status for Chapa (unconfirmed until gateway webhook), COMPLETED for direct
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          drawId: draw.id,
          quantity,
          unitPriceEtb,
          subtotalEtb,
          feeEtb,
          totalEtb,
          status: orderStatus,
          idempotencyKey,
          paymentMethod: paymentMethod as any,
        },
      });

      const txRef = isChapa
        ? `NL-CHAPA-${order.id.slice(0, 8)}-${Date.now()}`
        : `TX-NL-${Date.now().toString().slice(-8)}`;

      // Record payment in database (PENDING for Chapa until callback verified)
      await tx.payment.create({
        data: {
          orderId: order.id,
          userId,
          amountEtb: totalEtb,
          paymentMethod: paymentMethod as any,
          status: paymentStatus,
          idempotencyKey: `pay-${idempotencyKey}`,
          providerReference: txRef,
        },
      });

      const startSeq = Math.min(...allocatedSeqs);
      const endSeq = Math.max(...allocatedSeqs);

      const batch = await tx.ticketBatch.create({
        data: {
          drawId: draw.id,
          orderId: order.id,
          startSeq,
          endSeq,
          quantity,
        },
      });

      const ticketsData = [];
      const orderItemsData = [];
      const padLength = totalTickets > 9999 ? 6 : 4;

      for (const seq of allocatedSeqs) {
        const ticketNumber = `#${String(seq).padStart(padLength, '0')}`;

        // Cryptographic integrity signature
        const hashSignature = crypto
          .createHash('sha256')
          .update(`${draw.drawNumber}:${ticketNumber}:${seq}:${userId}:${order.id}`)
          .digest('hex');

        ticketsData.push({
          ticketNumber,
          sequenceNumber: seq,
          drawId: draw.id,
          userId,
          orderId: order.id,
          batchId: batch.id,
          status: ticketStatus,
          hashSignature,
        });

        orderItemsData.push({
          orderId: order.id,
          ticketNumber,
          priceEtb: unitPriceEtb,
        });
      }

      // Bulk insert tickets and order items
      await tx.ticket.createMany({ data: ticketsData });
      await tx.orderItem.createMany({ data: orderItemsData });

      // Atomically update Draw tickets count
      const updatedSoldTickets = currentSold + quantity;
      const isNowSoldOut = updatedSoldTickets >= totalTickets;

      await tx.draw.update({
        where: { id: draw.id },
        data: {
          soldTickets: updatedSoldTickets,
          status: isNowSoldOut ? DrawStatus.CLOSING : draw.status,
        },
      });

      this.logger.log(
        `[ORDER_CREATED] Order ${orderNumber}: ${isChapa ? 'Reserved' : 'Allocated'} ${quantity} tickets for Draw ${draw.drawNumber}`
      );

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        drawId: draw.id,
        drawNumber: draw.drawNumber,
        quantity,
        unitPriceEtb,
        totalEtb,
        status: order.status,
        allocatedRange: `${startSeq} - ${endSeq}`,
        ticketsReserved: quantity,
        ticketNumbers: isChapa ? [] : allocatedSeqs.map((s) => `#${String(s).padStart(padLength, '0')}`),
        txRef,
        paymentMethod,
        requiresPayment: isChapa,
      };
    });

    // If Chapa payment method, initialize Chapa transaction outside database lock
    let chapaCheckoutUrl: string | undefined = undefined;
    const isChapa = paymentMethod === PaymentMethod.CHAPA || (paymentMethod as string) === 'CHAPA';
    if (isChapa) {
      try {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        const secretKey = process.env.CHAPA_SECRET_KEY || 'CHASECK_TEST-EzF8SkHTiEva3p8xXcwKREFNpIHCq5hu';
        const apiUrl = process.env.CHAPA_API_URL || 'https://api.chapa.co/v1';
        const callbackUrl = process.env.CHAPA_CALLBACK_URL || 'http://localhost:4000/api/v1/payments/webhook/chapa';
        const baseReturnUrl = clientReturnUrl || process.env.CHAPA_RETURN_URL || 'http://localhost:3000/#draw-detail';
        let chapaReturnUrl = '';
        if (baseReturnUrl.includes('#')) {
          const [originAndPath, hashAndQuery] = baseReturnUrl.split('#');
          const sep = hashAndQuery.includes('?') ? '&' : '?';
          chapaReturnUrl = `${originAndPath}#${hashAndQuery}${sep}tx_ref=${orderResult.txRef}`;
        } else {
          const sep = baseReturnUrl.includes('?') ? '&' : '?';
          chapaReturnUrl = `${baseReturnUrl}${sep}tx_ref=${orderResult.txRef}`;
        }

        const rawPhone = user?.phone || '0911223344';
        const cleanPhone = rawPhone.replace(/\D/g, '');
        const formattedPhone = cleanPhone.startsWith('0') ? cleanPhone : '0' + cleanPhone.slice(-9);

        // Chapa strictly validates email syntax and known MX domain
        let validEmail = user?.email?.trim();
        if (!validEmail || !validEmail.includes('@') || validEmail.endsWith('.et') || validEmail.endsWith('.local')) {
          const namePrefix = (user?.firstName || user?.displayName?.split(' ')[0] || 'customer')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');
          validEmail = `${namePrefix}.${cleanPhone.slice(-6) || 'player'}@gmail.com`;
        }

        const chapaRes = await fetch(`${apiUrl}/transaction/initialize`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: orderResult.totalEtb.toString(),
            currency: 'ETB',
            email: validEmail,
            first_name: user?.firstName || user?.displayName?.split(' ')[0] || 'Nati',
            last_name: user?.lastName || 'Player',
            phone_number: formattedPhone,
            tx_ref: orderResult.txRef,
            callback_url: callbackUrl,
            return_url: chapaReturnUrl,
            'customization[title]': 'NATI LOTTO Tickets',
            'customization[description]': `Official Lottery Tickets for Order ${orderResult.orderNumber}`,
          }),
        });

        const chapaData = await chapaRes.json();
        if (chapaData && chapaData.status === 'success' && chapaData.data?.checkout_url) {
          chapaCheckoutUrl = chapaData.data.checkout_url;
          this.logger.log(`[CHAPA_ORDER] Initialized Chapa checkout URL: ${chapaCheckoutUrl}`);
        } else {
          this.logger.error(`[CHAPA_ORDER] Chapa initialization failed: ${JSON.stringify(chapaData)}`);
        }
      } catch (err: any) {
        this.logger.error(`[CHAPA_ORDER] Error initializing Chapa: ${err.message}`);
      }

      if (chapaCheckoutUrl) {
        await this.prisma.payment.updateMany({
          where: { orderId: orderResult.orderId },
          data: { checkoutUrl: chapaCheckoutUrl },
        });
      }
    }

    return {
      ...orderResult,
      checkoutUrl: chapaCheckoutUrl,
    };
  }

  async findUserOrders(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: {
        draw: {
          include: { prize: true },
        },
        payment: true,
        tickets: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => {
      if (order.status !== OrderStatus.COMPLETED) {
        return {
          ...order,
          tickets: order.tickets.map((t) => ({
            ...t,
            ticketNumber: 'RESERVED - PENDING PAYMENT',
            hashSignature: '',
          })),
        };
      }
      return order;
    });
  }

  async findOrderById(id: string, userId?: string) {
    const where: any = { id };
    if (userId) where.userId = userId;

    const order = await this.prisma.order.findFirst({
      where,
      include: {
        draw: {
          include: {
            prize: { include: { images: true } },
          },
        },
        payment: true,
        tickets: {
          orderBy: { sequenceNumber: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Mask ticket numbers if payment is still pending confirmation
    if (order.status !== OrderStatus.COMPLETED) {
      return {
        ...order,
        tickets: order.tickets.map((t) => ({
          ...t,
          ticketNumber: 'RESERVED - PENDING PAYMENT',
          hashSignature: '',
        })),
      };
    }

    return order;
  }
}
