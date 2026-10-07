import { PaymentMethod, PaymentStatus } from './enums.js';

export interface PaymentRequest {
  orderId: string;
  userId: string;
  amountEtb: number;
  paymentMethod: PaymentMethod;
  idempotencyKey: string;
  returnUrl?: string;
  phone?: string;
}

export interface PaymentResponse {
  paymentId: string;
  orderId: string;
  status: PaymentStatus;
  amountEtb: number;
  paymentMethod: PaymentMethod;
  checkoutUrl?: string;
  transactionReference?: string;
  ussdPromptCode?: string;
  expiresAt: string;
}

export interface PaymentVerificationResult {
  paymentId: string;
  orderId: string;
  status: PaymentStatus;
  providerReference: string;
  verifiedAt: string;
  amountEtb: number;
}

export interface WebhookProcessingResult {
  handled: boolean;
  paymentId: string;
  status: PaymentStatus;
  isDuplicate: boolean;
}
