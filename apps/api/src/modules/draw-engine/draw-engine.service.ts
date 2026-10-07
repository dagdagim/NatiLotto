import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { DrawStatus, TicketStatus, ClaimStatus } from '@nati-lotto/shared-types';

export interface DrawExecutionOutput {
  drawId: string;
  drawNumber: string;
  winningTicketNumber: string;
  winningSequenceNumber: number;
  winnerUserId: string;
  winnerDisplayName: string;
  prizeTitle: string;
  snapshotHash: string;
  seedHex: string;
  seedHash: string;
  resultHash: string;
  totalEligibleTickets: number;
  completedAt: Date;
}

@Injectable()
export class DrawEngineService {
  private readonly logger = new Logger(DrawEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Step 1 & 2: Freeze sales, collect eligible ticket snapshot, hash it
   */
  async createSnapshot(drawId: string, actorId: string, actorRole: string): Promise<string> {
    const draw = await this.prisma.draw.findUnique({
      where: { id: drawId },
      include: { snapshot: true },
    });

    if (!draw) {
      throw new BadRequestException('Draw not found');
    }

    if (draw.snapshot) {
      return draw.snapshot.snapshotHash;
    }

    // Must be in CLOSING or CLOSED state to snapshot
    if (draw.status !== DrawStatus.CLOSED && draw.status !== DrawStatus.CLOSING) {
      throw new ForbiddenException(`Cannot snapshot draw in '${draw.status}' status. Draw sales must be CLOSED first.`);
    }

    // Fetch all confirmed tickets sorted deterministically by sequenceNumber
    const eligibleTickets = await this.prisma.ticket.findMany({
      where: {
        drawId,
        status: TicketStatus.CONFIRMED,
      },
      orderBy: { sequenceNumber: 'asc' },
      select: {
        id: true,
        ticketNumber: true,
        sequenceNumber: true,
        userId: true,
      },
    });

    if (eligibleTickets.length === 0) {
      throw new BadRequestException('Cannot execute draw with 0 eligible tickets');
    }

    // Deterministic payload string for cryptographic hashing
    const snapshotPayload = eligibleTickets
      .map((t) => `${t.sequenceNumber}:${t.ticketNumber}:${t.id}:${t.userId}`)
      .join('|');

    const snapshotHash = crypto.createHash('sha256').update(snapshotPayload).digest('hex');

    await this.prisma.$transaction(async (tx) => {
      await tx.drawSnapshot.create({
        data: {
          drawId,
          eligibleCount: eligibleTickets.length,
          snapshotHash,
          ticketRangeStart: eligibleTickets[0].sequenceNumber,
          ticketRangeEnd: eligibleTickets[eligibleTickets.length - 1].sequenceNumber,
          snapshotData: eligibleTickets.map((t) => ({
            seq: t.sequenceNumber,
            num: t.ticketNumber,
            id: t.id,
          })),
        },
      });

      await tx.draw.update({
        where: { id: drawId },
        data: { snapshotHash },
      });
    });

    await this.audit.log({
      actorId,
      actorRole,
      action: 'DRAW_SNAPSHOT_CREATED',
      entityType: 'Draw',
      entityId: drawId,
      details: {
        eligibleCount: eligibleTickets.length,
        snapshotHash,
      },
    });

    this.logger.log(`[DRAW_SNAPSHOT] Draw ${draw.drawNumber} snapshotted: ${eligibleTickets.length} tickets, Hash: ${snapshotHash}`);
    return snapshotHash;
  }

  /**
   * Authorize the draw for execution after snapshot verification
   */
  async authorizeDraw(drawId: string, actorId: string, actorRole: string): Promise<void> {
    const draw = await this.prisma.draw.findUnique({
      where: { id: drawId },
      include: { snapshot: true },
    });

    if (!draw) {
      throw new BadRequestException('Draw not found');
    }

    if (!draw.snapshot) {
      throw new BadRequestException('Draw snapshot must be created and verified before authorization.');
    }

    if (draw.status !== DrawStatus.CLOSED) {
      throw new ForbiddenException(`Draw must be CLOSED to be authorized. Current: ${draw.status}`);
    }

    await this.prisma.draw.update({
      where: { id: drawId },
      data: { status: DrawStatus.AUTHORIZED },
    });

    await this.audit.log({
      actorId,
      actorRole,
      action: 'DRAW_AUTHORIZED',
      entityType: 'Draw',
      entityId: drawId,
      details: {
        snapshotHash: draw.snapshot.snapshotHash,
        eligibleCount: draw.snapshot.eligibleCount,
      },
    });

    this.logger.log(`[DRAW_AUTHORIZED] Draw ${draw.drawNumber} authorized for execution by ${actorRole}:${actorId}`);
  }

  /**
   * Execute the authoritative draw using Cryptographically Secure Pseudo-Random Number Generation (CSPRNG)
   */
  async executeDraw(drawId: string, actorId: string, actorRole: string): Promise<DrawExecutionOutput> {
    const draw = await this.prisma.draw.findUnique({
      where: { id: drawId },
      include: {
        snapshot: true,
        prize: true,
        result: true,
      },
    });

    if (!draw) {
      throw new BadRequestException('Draw not found');
    }

    if (draw.result) {
      throw new BadRequestException('Draw has already been executed. Results are permanently committed.');
    }

    if (draw.status !== DrawStatus.AUTHORIZED) {
      throw new ForbiddenException(`Draw is not in AUTHORIZED status. Current status: ${draw.status}`);
    }

    const snapshot = draw.snapshot;
    if (!snapshot) {
      throw new BadRequestException('Snapshot is missing for authorized draw');
    }

    // Step 5: Acquire cryptographically secure 256-bit randomness
    const entropyBuffer = crypto.randomBytes(32);
    const seedHex = entropyBuffer.toString('hex');
    const seedHash = crypto.createHash('sha256').update(seedHex).digest('hex');
    const entropyTimestamp = new Date();

    // Fetch verified eligible tickets ordered deterministically
    const eligibleTickets = await this.prisma.ticket.findMany({
      where: {
        drawId,
        status: TicketStatus.CONFIRMED,
      },
      orderBy: { sequenceNumber: 'asc' },
      include: { user: true },
    });

    const eligibleCount = BigInt(eligibleTickets.length);
    if (eligibleCount <= 0n) {
      throw new BadRequestException('No eligible tickets found for drawing');
    }

    // Step 7: Deterministic winner selection: winningIndex = seed % eligibleCount
    const seedBigInt = BigInt('0x' + seedHex);
    const winningIndex = Number(seedBigInt % eligibleCount);
    const winningTicket = eligibleTickets[winningIndex];

    // Step 8: Calculate immutable result hash
    // Result hash binds snapshotHash + seedHex + winningTicketNumber + ticketId
    const resultHash = crypto
      .createHash('sha256')
      .update(`${snapshot.snapshotHash}:${seedHex}:${winningTicket.ticketNumber}:${winningTicket.id}`)
      .digest('hex');

    const winnerUser = winningTicket.user;
    const winnerDisplayName = `${winnerUser.firstName || 'Player'} ${winnerUser.lastName ? winnerUser.lastName[0] + '.' : ''} (${winnerUser.phone.slice(0, 4)}***${winnerUser.phone.slice(-3)})`;

    // Step 9: Atomically commit draw result, update ticket, and set draw to COMPLETED
    const completedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      // Create Randomness record
      const randomnessRecord = await tx.randomnessRecord.create({
        data: {
          drawId,
          provider: 'NodeCryptoCSPRNG-v1',
          seedHash,
          seedHex,
          entropyTimestamp,
        },
      });

      // Create DrawResult
      await tx.drawResult.create({
        data: {
          drawId,
          winningTicketId: winningTicket.id,
          winningTicketNumber: winningTicket.ticketNumber,
          winningSequenceNumber: winningTicket.sequenceNumber,
          winnerUserId: winningTicket.userId,
          snapshotHash: snapshot.snapshotHash,
          resultHash,
          algorithmVersion: '1.0.0-csprng-sha256',
          randomnessRecordId: randomnessRecord.id,
          publishedAt: completedAt,
        },
      });

      // Mark winning ticket
      await tx.ticket.update({
        where: { id: winningTicket.id },
        data: { isWinningTicket: true, status: TicketStatus.WON },
      });

      // Mark losing tickets
      await tx.ticket.updateMany({
        where: {
          drawId,
          id: { not: winningTicket.id },
          status: TicketStatus.CONFIRMED,
        },
        data: { status: TicketStatus.LOST },
      });

      // Create Winner record
      await tx.winner.create({
        data: {
          drawId,
          userId: winningTicket.userId,
          ticketId: winningTicket.id,
          winningTicketNumber: winningTicket.ticketNumber,
          winnerDisplayName,
          claimStatus: ClaimStatus.PENDING_CLAIM,
        },
      });

      // Finalize draw status
      await tx.draw.update({
        where: { id: drawId },
        data: {
          status: DrawStatus.COMPLETED,
          resultHash,
        },
      });

      // Create notification for winner
      await tx.notification.create({
        data: {
          userId: winningTicket.userId,
          type: 'PRIZE_WON',
          title: 'Congratulations! You won!',
          message: `Your ticket ${winningTicket.ticketNumber} won the ${draw.prize?.title || 'prize'} in draw ${draw.drawNumber}!`,
          metadata: {
            drawId,
            drawNumber: draw.drawNumber,
            ticketNumber: winningTicket.ticketNumber,
            resultHash,
          },
        },
      });
    });

    await this.audit.log({
      actorId,
      actorRole,
      action: 'DRAW_EXECUTED',
      entityType: 'Draw',
      entityId: drawId,
      details: {
        winningTicketNumber: winningTicket.ticketNumber,
        winningSequenceNumber: winningTicket.sequenceNumber,
        winnerUserId: winningTicket.userId,
        snapshotHash: snapshot.snapshotHash,
        seedHash,
        resultHash,
      },
    });

    this.logger.log(`[DRAW_EXECUTED] Draw ${draw.drawNumber} completed. Winner: ${winningTicket.ticketNumber} (${winnerDisplayName}), ResultHash: ${resultHash}`);

    return {
      drawId,
      drawNumber: draw.drawNumber,
      winningTicketNumber: winningTicket.ticketNumber,
      winningSequenceNumber: winningTicket.sequenceNumber,
      winnerUserId: winningTicket.userId,
      winnerDisplayName,
      prizeTitle: draw.prize?.title || 'Grand Prize',
      snapshotHash: snapshot.snapshotHash,
      seedHex,
      seedHash,
      resultHash,
      totalEligibleTickets: Number(eligibleCount),
      completedAt,
    };
  }

  /**
   * Mathematical and cryptographic verification function.
   * Anyone can independently verify that:
   * 1. sha256(seedHex) === seedHash
   * 2. (seedBigInt % eligibleCount) === winningIndex
   * 3. sha256(snapshotHash + seedHex + ticketNumber + ticketId) === resultHash
   */
  verifyDrawIntegrity(params: {
    snapshotHash: string;
    seedHex: string;
    seedHash: string;
    eligibleCount: number;
    winningSequenceIndex: number;
    winningTicketNumber: string;
    winningTicketId: string;
    resultHash: string;
  }): {
    isSeedValid: boolean;
    isModuloCorrect: boolean;
    isResultHashValid: boolean;
    isFullyVerified: boolean;
  } {
    const computedSeedHash = crypto.createHash('sha256').update(params.seedHex).digest('hex');
    const isSeedValid = computedSeedHash === params.seedHash;

    const seedBigInt = BigInt('0x' + params.seedHex);
    const computedWinningIndex = Number(seedBigInt % BigInt(params.eligibleCount));
    const isModuloCorrect = computedWinningIndex === params.winningSequenceIndex;

    const computedResultHash = crypto
      .createHash('sha256')
      .update(`${params.snapshotHash}:${params.seedHex}:${params.winningTicketNumber}:${params.winningTicketId}`)
      .digest('hex');
    const isResultHashValid = computedResultHash === params.resultHash;

    const isFullyVerified = isSeedValid && isModuloCorrect && isResultHashValid;

    return {
      isSeedValid,
      isModuloCorrect,
      isResultHashValid,
      isFullyVerified,
    };
  }
}
