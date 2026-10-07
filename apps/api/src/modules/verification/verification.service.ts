import { Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { VerifyTicketResultDto, DrawVerificationSummaryDto } from '@nati-lotto/shared-types';

@Injectable()
export class VerificationService {
  constructor(private readonly prisma: PrismaService) {}

  async verifyTicket(drawNumber: string, ticketNumber: string): Promise<VerifyTicketResultDto> {
    const cleanDrawNumber = drawNumber.trim().toUpperCase();
    let cleanTicketNumber = ticketNumber.trim();
    if (!cleanTicketNumber.startsWith('#')) {
      cleanTicketNumber = `#${cleanTicketNumber.padStart(4, '0')}`;
    }

    const draw = await this.prisma.draw.findFirst({
      where: {
        OR: [{ drawNumber: cleanDrawNumber }, { id: cleanDrawNumber }],
      },
      include: {
        prize: true,
        result: {
          include: { randomnessRecord: true },
        },
        winner: true,
      },
    });

    if (!draw) {
      throw new NotFoundException(`Draw not found: ${cleanDrawNumber}`);
    }

    const ticket = await this.prisma.ticket.findFirst({
      where: {
        drawId: draw.id,
        ticketNumber: cleanTicketNumber,
      },
      include: { user: true },
    });

    const isWinningTicket = draw.result?.winningTicketNumber === cleanTicketNumber;

    let randomnessProof = undefined;
    if (draw.result && draw.result.randomnessRecord) {
      const rec = draw.result.randomnessRecord;
      const seedHashCheck = crypto.createHash('sha256').update(rec.seedHex).digest('hex') === rec.seedHash;
      randomnessProof = {
        algorithm: draw.result.algorithmVersion,
        entropyTimestamp: rec.entropyTimestamp.toISOString(),
        seedHash: rec.seedHash,
        isProvablyValid: seedHashCheck,
      };
    }

    return {
      isValidTicket: !!ticket,
      isWinningTicket,
      drawId: draw.id,
      drawNumber: draw.drawNumber,
      drawTitle: draw.title,
      prizeTitle: draw.prize?.title || 'Grand Prize',
      ticketNumber: cleanTicketNumber,
      purchaseDate: ticket ? ticket.createdAt.toISOString() : '',
      drawDate: draw.drawDate.toISOString(),
      drawStatus: draw.status,
      snapshotHash: draw.snapshotHash || undefined,
      resultHash: draw.resultHash || undefined,
      randomnessProof,
      winnerName: isWinningTicket ? draw.winner?.winnerDisplayName : undefined,
      verifiedAt: new Date().toISOString(),
    };
  }

  async getDrawVerificationSummary(drawId: string): Promise<DrawVerificationSummaryDto> {
    const draw = await this.prisma.draw.findFirst({
      where: {
        OR: [{ id: drawId }, { drawNumber: drawId }],
      },
      include: {
        result: {
          include: { randomnessRecord: true },
        },
        snapshot: true,
      },
    });

    if (!draw) {
      throw new NotFoundException('Draw not found');
    }

    if (!draw.result) {
      throw new NotFoundException('Draw has not been finalized yet. Public verification proof is generated upon draw completion.');
    }

    return {
      drawId: draw.id,
      drawNumber: draw.drawNumber,
      drawTitle: draw.title,
      drawDate: draw.drawDate.toISOString(),
      totalEligibleTickets: draw.snapshot?.eligibleCount || draw.soldTickets,
      winningTicketNumber: draw.result.winningTicketNumber,
      snapshotHash: draw.result.snapshotHash,
      resultHash: draw.result.resultHash,
      algorithmVersion: draw.result.algorithmVersion,
      randomnessReference: draw.result.randomnessRecord.seedHash,
      publicVerificationUrl: `https://natilotto.et/verify?drawNumber=${draw.drawNumber}&ticketNumber=${encodeURIComponent(draw.result.winningTicketNumber)}`,
    };
  }
}
