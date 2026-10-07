export interface VerifyTicketQueryDto {
  drawNumber: string; // e.g. "NL-000123"
  ticketNumber: string; // e.g. "0382" or "#0382"
}

export interface VerifyTicketResultDto {
  isValidTicket: boolean;
  isWinningTicket: boolean;
  drawId: string;
  drawNumber: string;
  drawTitle: string;
  prizeTitle: string;
  ticketNumber: string;
  purchaseDate: string;
  drawDate?: string;
  drawStatus: string;
  snapshotHash?: string;
  resultHash?: string;
  randomnessProof?: {
    algorithm: string;
    entropyTimestamp: string;
    seedHash: string;
    isProvablyValid: boolean;
  };
  winnerName?: string;
  verifiedAt: string;
}

export interface DrawVerificationSummaryDto {
  drawId: string;
  drawNumber: string;
  drawTitle: string;
  drawDate: string;
  totalEligibleTickets: number;
  winningTicketNumber: string;
  snapshotHash: string;
  resultHash: string;
  algorithmVersion: string;
  randomnessReference: string;
  publicVerificationUrl: string;
}
