import { OrderStatus, PaymentMethod } from './enums.js';
import { TicketDto } from './ticket.js';

export interface CreateOrderDto {
  drawId: string;
  quantity: number;
  paymentMethod: PaymentMethod;
  idempotencyKey: string;
}

export interface OrderItemDto {
  id: string;
  ticketNumber: string;
  priceEtb: number;
}

export interface OrderDto {
  id: string;
  orderNumber: string; // e.g. "ORD-NL-2026-94812"
  userId: string;
  drawId: string;
  drawTitle: string;
  prizeTitle: string;
  quantity: number;
  unitPriceEtb: number;
  subtotalEtb: number;
  feeEtb: number;
  totalEtb: number;
  status: OrderStatus;
  idempotencyKey: string;
  paymentId?: string;
  tickets?: TicketDto[];
  createdAt: string;
  updatedAt: string;
}
