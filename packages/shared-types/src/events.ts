import { DrawStatus, WebSocketEventType } from './enums.js';

export interface DrawTicketsUpdatedPayload {
  drawId: string;
  drawNumber: string;
  soldTickets: number;
  remainingTickets: number;
  percentage: number;
}

export interface DrawStatusChangedPayload {
  drawId: string;
  drawNumber: string;
  previousStatus: DrawStatus;
  newStatus: DrawStatus;
  timestamp: string;
}

export interface DrawCountdownPayload {
  drawId: string;
  remainingSeconds: number;
  serverTimestamp: number;
}

export interface DrawStartedPayload {
  drawId: string;
  drawNumber: string;
  prizeTitle: string;
  eligibleCount: number;
  countdownSeconds: number;
}

export interface DrawRollingPayload {
  drawId: string;
  drawNumber: string;
  durationMs: number;
}

export interface DrawWinnerAnnouncedPayload {
  drawId: string;
  drawNumber: string;
  winningTicketNumber: string;
  winnerDisplayName: string;
  prizeTitle: string;
  resultHash: string;
  snapshotHash: string;
  completedAt: string;
}
