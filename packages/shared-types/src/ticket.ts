import { TicketStatus } from './enums.js';

export interface TicketDto {
  id: string;
  ticketNumber: string; // e.g. "#0381"
  sequenceNumber: number;
  drawId: string;
  drawNumber: string;
  drawTitle: string;
  prizeTitle: string;
  prizeImageUrl: string;
  ticketPriceEtb: number;
  userId: string;
  orderId: string;
  status: TicketStatus;
  isWinningTicket: boolean;
  qrPayload: string;
  hashSignature: string;
  createdAt: string;
  drawDate?: string;
  drawStatus?: string;
}

export interface TicketAllocationResult {
  orderId: string;
  drawId: string;
  tickets: TicketDto[];
  totalPriceEtb: number;
}
