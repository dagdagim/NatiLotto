import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { IPaymentProvider } from './payment-provider.interface';
import { MockPaymentProvider } from './mock-payment.provider';
import { TelebirrPaymentProvider } from './telebirr-payment.provider';
import { ChapaPaymentProvider } from './chapa-payment.provider';
import { PaymentRequest, PaymentResponse, PaymentMethod, PaymentStatus, OrderStatus, TicketStatus } from '@nati-lotto/shared-types';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly providers: Map<PaymentMethod, IPaymentProvider> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mockProvider: MockPaymentProvider,
    private readonly telebirrProvider: TelebirrPaymentProvider,
    private readonly chapaProvider: ChapaPaymentProvider,
  ) {
    this.providers.set(PaymentMethod.MOCK, this.mockProvider);
    this.providers.set(PaymentMethod.TELEBIRR, this.telebirrProvider);
    this.providers.set(PaymentMethod.CBE_BIRR, this.mockProvider);
    this.providers.set(PaymentMethod.CHAPA, this.chapaProvider);
  }

  getProvider(method: PaymentMethod): IPaymentProvider {
    const provider = this.providers.get(method) || this.mockProvider;
    return provider;
  }

  async initiatePayment(params: {
    orderId: string;
    userId: string;
    paymentMethod: PaymentMethod;
    idempotencyKey: string;
    returnUrl?: string;
  }): Promise<PaymentResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      include: { draw: true, user: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(`Order cannot be paid in current status: ${order.status}`);
    }

    // Check if payment already initiated with this idempotency key
    const existingPayment = await this.prisma.payment.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });

    if (existingPayment) {
      return {
        paymentId: existingPayment.id,
        orderId: existingPayment.orderId,
        status: existingPayment.status as PaymentStatus,
        amountEtb: existingPayment.amountEtb,
        paymentMethod: existingPayment.paymentMethod as PaymentMethod,
        checkoutUrl: existingPayment.checkoutUrl || undefined,
        transactionReference: existingPayment.providerReference || undefined,
        expiresAt: new Date(existingPayment.createdAt.getTime() + 15 * 60 * 1000).toISOString(),
      };
    }

    const provider = this.getProvider(params.paymentMethod);
    const paymentRequest: PaymentRequest = {
      orderId: order.id,
      userId: params.userId,
      amountEtb: order.totalEtb,
      paymentMethod: params.paymentMethod,
      idempotencyKey: params.idempotencyKey,
      returnUrl: params.returnUrl,
      phone: order.user.phone,
    };

    const providerResponse = await provider.createPayment(paymentRequest);

    // Persist Payment record
    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        userId: params.userId,
        amountEtb: order.totalEtb,
        paymentMethod: params.paymentMethod as any,
        status: PaymentStatus.PENDING,
        providerReference: providerResponse.transactionReference,
        idempotencyKey: params.idempotencyKey,
        checkoutUrl: providerResponse.checkoutUrl,
        rawResponse: providerResponse as any,
      },
    });

    await this.audit.log({
      actorId: params.userId,
      actorRole: 'USER',
      action: 'PAYMENT_INITIATED',
      entityType: 'Payment',
      entityId: payment.id,
      details: {
        orderId: order.id,
        amountEtb: order.totalEtb,
        method: params.paymentMethod,
      },
    });

    return {
      ...providerResponse,
      paymentId: payment.id,
    };
  }

  /**
   * Process webhook from payment gateway with strict idempotency and anti-replay protection.
   */
  async processWebhook(providerName: string, payload: any, signature?: string): Promise<{ success: boolean; isDuplicate: boolean }> {
    // Record raw webhook audit
    await this.prisma.paymentWebhook.create({
      data: {
        provider: providerName,
        event: payload.event || payload.tradeStatus || 'PAYMENT_RESULT',
        payload: payload as any,
        signature,
      },
    });

    const providerRef =
      payload.tx_ref ||
      payload.trx_ref ||
      payload.reference ||
      payload.outTradeNo ||
      payload.transactionReference ||
      payload.paymentId ||
      payload.data?.tx_ref ||
      payload.data?.reference;

    if (!providerRef) {
      this.logger.warn(`Webhook received without provider reference`);
      return { success: false, isDuplicate: false };
    }

    // Find corresponding payment
    const payment = await this.prisma.payment.findFirst({
      where: {
        OR: [
          { providerReference: providerRef },
          { id: providerRef },
          { idempotencyKey: providerRef },
        ],
      },
      include: {
        order: {
          include: { tickets: true, draw: true },
        },
      },
    });

    if (!payment) {
      this.logger.warn(`No payment found for reference ${providerRef}`);
      return { success: false, isDuplicate: false };
    }

    // Check for duplicate webhook execution (Idempotency)
    if (payment.status === PaymentStatus.SUCCESS) {
      this.logger.log(`[PAYMENT_WEBHOOK] Payment ${payment.id} already settled. Ignoring duplicate webhook.`);
      return { success: true, isDuplicate: true };
    }

    const isSuccess =
      payload.status === 'SUCCESS' ||
      payload.status === 'success' ||
      payload.tradeStatus === 'COMPLETED' ||
      payload.tradeStatus === 'SUCCESS' ||
      payload.event === 'charge.complete' ||
      payload.data?.status === 'success';

    if (isSuccess) {
      await this.prisma.$transaction(async (tx) => {
        // 1. Mark payment as SUCCESS
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.SUCCESS,
            verifiedAt: new Date(),
          },
        });

        // 2. Mark order as COMPLETED
        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: OrderStatus.COMPLETED },
        });

        // 3. Mark all reserved tickets as CONFIRMED
        await tx.ticket.updateMany({
          where: { orderId: payment.orderId },
          data: { status: TicketStatus.CONFIRMED },
        });

        // 4. Record financial transaction ledger entry
        const user = await tx.user.findUnique({ where: { id: payment.userId } });
        await tx.transaction.create({
          data: {
            transactionNumber: `TX-NL-${Date.now()}`,
            userId: payment.userId,
            paymentId: payment.id,
            type: 'TICKET_PURCHASE',
            amountEtb: payment.amountEtb,
            balanceAfterEtb: user?.walletBalanceEtb || 0,
            reference: payment.providerReference || payment.id,
            description: `Payment for Order ${payment.order.orderNumber} (${payment.order.quantity} tickets)`,
          },
        });

        // 5. Create ticket purchased notification
        await tx.notification.create({
          data: {
            userId: payment.userId,
            type: 'TICKET_PURCHASED',
            title: 'Tickets Confirmed!',
            message: `Your ${payment.order.quantity} tickets for ${payment.order.draw.title} are confirmed!`,
            metadata: {
              orderId: payment.orderId,
              drawId: payment.order.drawId,
              ticketsCount: payment.order.quantity,
            },
          },
        });
      });

      await this.audit.log({
        actorId: 'SYSTEM',
        actorRole: 'PAYMENT_GATEWAY',
        action: 'PAYMENT_CONFIRMED',
        entityType: 'Payment',
        entityId: payment.id,
        details: {
          orderId: payment.orderId,
          amountEtb: payment.amountEtb,
          providerRef,
        },
      });

      this.logger.log(`[PAYMENT_WEBHOOK] Payment ${payment.id} confirmed and tickets sealed.`);
      return { success: true, isDuplicate: false };
    } else {
      // Payment failed: Release reserved tickets and mark order as FAILED
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.FAILED },
        });

        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: OrderStatus.FAILED },
        });

        // Cancel tickets and decrement draw sold count
        await tx.ticket.updateMany({
          where: { orderId: payment.orderId },
          data: { status: TicketStatus.CANCELLED },
        });

        await tx.draw.update({
          where: { id: payment.order.drawId },
          data: {
            soldTickets: {
              decrement: payment.order.quantity,
            },
          },
        });
      });

      this.logger.log(`[PAYMENT_WEBHOOK] Payment ${payment.id} marked FAILED, reserved tickets released.`);
      return { success: true, isDuplicate: false };
    }
  }

  async simulateMockPaymentSuccess(paymentId: string): Promise<boolean> {
    const payment = await this.prisma.payment.findFirst({
      where: {
        OR: [
          { id: paymentId },
          { providerReference: paymentId },
          { orderId: paymentId },
        ],
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    const result = await this.processWebhook('MOCK', {
      paymentId: payment.id,
      outTradeNo: payment.providerReference || payment.id,
      status: 'SUCCESS',
    });

    return result.success;
  }

  /**
   * Directly verifies a transaction (e.g., when user returns from Chapa hosted checkout)
   * and settles the order and tickets.
   */
  async verifyAndSettleTransaction(reference: string): Promise<{
    success: boolean;
    orderId?: string;
    orderNumber?: string;
    drawId?: string;
    drawNumber?: string;
    drawTitle?: string;
    userId?: string;
    quantity?: number;
    totalEtb?: number;
    ticketNumbers?: string[];
    status: string;
    message: string;
  }> {
    this.logger.log(`[PAYMENT_VERIFY] Direct verification requested for: ${reference}`);

    // First check if already settled in local database
    const localPayment = await this.prisma.payment.findFirst({
      where: {
        OR: [
          { providerReference: reference },
          { id: reference },
          { idempotencyKey: reference },
        ],
      },
    });

    if (localPayment && localPayment.status === PaymentStatus.SUCCESS) {
      const settledOrder = await this.prisma.order.findUnique({
        where: { id: localPayment.orderId },
        include: {
          tickets: { select: { ticketNumber: true, sequenceNumber: true } },
          draw: { select: { id: true, drawNumber: true, title: true } },
          user: { select: { id: true, firstName: true, phone: true } },
        },
      });

      return {
        success: true,
        orderId: localPayment.orderId,
        orderNumber: settledOrder?.orderNumber,
        drawId: settledOrder?.draw?.id,
        drawNumber: settledOrder?.draw?.drawNumber,
        drawTitle: settledOrder?.draw?.title,
        userId: settledOrder?.userId,
        quantity: settledOrder?.quantity,
        totalEtb: settledOrder?.totalEtb,
        ticketNumbers: settledOrder?.tickets?.map((t: any) => t.ticketNumber) || [],
        status: 'SUCCESS',
        message: 'Payment already verified and confirmed',
      };
    }

    // Call Chapa verify endpoint
    const verification = await this.chapaProvider.verifyPayment(reference);

    if (verification.status === PaymentStatus.SUCCESS) {
      // Process webhook settlement logic
      const result = await this.processWebhook('CHAPA', {
        tx_ref: reference,
        reference: verification.providerReference,
        status: 'success',
      });

      const orderId = localPayment?.orderId;
      let settledOrder: any = null;
      if (orderId) {
        settledOrder = await this.prisma.order.findUnique({
          where: { id: orderId },
          include: {
            tickets: { select: { ticketNumber: true, sequenceNumber: true } },
            draw: { select: { id: true, drawNumber: true, title: true } },
            user: { select: { id: true, firstName: true, phone: true } },
          },
        });
      }

      return {
        success: result.success,
        orderId,
        orderNumber: settledOrder?.orderNumber,
        drawId: settledOrder?.draw?.id,
        drawNumber: settledOrder?.draw?.drawNumber,
        drawTitle: settledOrder?.draw?.title,
        userId: settledOrder?.userId,
        quantity: settledOrder?.quantity,
        totalEtb: settledOrder?.totalEtb,
        ticketNumbers: settledOrder?.tickets?.map((t: any) => t.ticketNumber) || [],
        status: 'SUCCESS',
        message: 'Chapa payment verified successfully. Tickets confirmed!',
      };
    }

    return {
      success: false,
      orderId: localPayment?.orderId,
      status: verification.status,
      message: 'Payment verification pending or unsuccessful on gateway',
    };
  }
}
