import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { TicketStatus } from '@nati-lotto/shared-types';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserTickets(userId: string, status?: TicketStatus) {
    const where: any = { userId };
    if (status) {
      where.status = status;
    } else {
      // Critical security rule: Do not expose unconfirmed/reserved tickets until Chapa payment succeeds
      where.status = { not: TicketStatus.RESERVED };
    }

    const tickets = await this.prisma.ticket.findMany({
      where,
      include: {
        draw: {
          include: {
            prize: {
              include: { images: { where: { isPrimary: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      sequenceNumber: t.sequenceNumber,
      drawId: t.drawId,
      drawNumber: t.draw.drawNumber,
      drawTitle: t.draw.title,
      prizeTitle: t.draw.prize?.title || 'Grand Prize',
      prizeImageUrl: t.draw.prize?.images[0]?.url || '',
      ticketPriceEtb: t.draw.ticketPriceEtb,
      userId: t.userId,
      orderId: t.orderId,
      status: t.status,
      isWinningTicket: t.isWinningTicket,
      qrPayload: `NATILOTTO:VERIFY:${t.draw.drawNumber}:${t.ticketNumber}:${t.hashSignature.slice(0, 16)}`,
      hashSignature: t.hashSignature,
      createdAt: t.createdAt.toISOString(),
      drawDate: t.draw.drawDate.toISOString(),
      drawStatus: t.draw.status,
    }));
  }

  async getTicketDetails(ticketId: string, userId?: string) {
    const where: any = { id: ticketId };
    if (userId) where.userId = userId;

    const ticket = await this.prisma.ticket.findFirst({
      where,
      include: {
        draw: {
          include: {
            prize: {
              include: { images: true },
            },
            result: true,
          },
        },
        order: {
          include: { payment: true },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.status === TicketStatus.RESERVED) {
      throw new BadRequestException('This ticket is reserved pending payment confirmation from Chapa. Ticket number cannot be revealed until payment succeeds.');
    }

    const qrPayload = `NATILOTTO:VERIFY:${ticket.draw.drawNumber}:${ticket.ticketNumber}:${ticket.hashSignature.slice(0, 16)}`;
    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 256, margin: 1 });
    } catch {
      qrDataUrl = '';
    }

    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      sequenceNumber: ticket.sequenceNumber,
      drawId: ticket.drawId,
      drawNumber: ticket.draw.drawNumber,
      drawTitle: ticket.draw.title,
      prizeTitle: ticket.draw.prize?.title || 'Grand Prize',
      prizeDescription: ticket.draw.prize?.description,
      prizeImageUrl: ticket.draw.prize?.images[0]?.url || '',
      ticketPriceEtb: ticket.draw.ticketPriceEtb,
      userId: ticket.userId,
      orderId: ticket.orderId,
      orderNumber: ticket.order.orderNumber,
      paymentStatus: ticket.order.payment?.status,
      status: ticket.status,
      isWinningTicket: ticket.isWinningTicket,
      qrPayload,
      qrDataUrl,
      hashSignature: ticket.hashSignature,
      createdAt: ticket.createdAt.toISOString(),
      drawDate: ticket.draw.drawDate.toISOString(),
      drawStatus: ticket.draw.status,
      snapshotHash: ticket.draw.snapshotHash,
      resultHash: ticket.draw.resultHash,
    };
  }
}
