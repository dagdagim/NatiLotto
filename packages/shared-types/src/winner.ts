import { ClaimStatus } from './enums.js';

export interface WinnerDto {
  id: string;
  drawId: string;
  drawNumber: string;
  drawTitle: string;
  prizeTitle: string;
  prizeImageUrl: string;
  ticketId: string;
  winningTicketNumber: string;
  winnerDisplayName: string; // e.g. "Dawit M. (Addis Ababa)"
  drawDate: string;
  claimStatus: ClaimStatus;
  resultHash: string;
  snapshotHash: string;
  createdAt: string;
}

export interface PrizeClaimDto {
  id: string;
  winnerId: string;
  drawId: string;
  status: ClaimStatus;
  deliveryAddress?: string;
  city?: string;
  trackingNumber?: string;
  notes?: string;
  claimedAt?: string;
  fulfilledAt?: string;
}
