import { PaymentRequest, PaymentResponse, PaymentVerificationResult, WebhookProcessingResult } from '@nati-lotto/shared-types';

export interface IPaymentProvider {
  readonly providerName: string;
  createPayment(request: PaymentRequest): Promise<PaymentResponse>;
  verifyPayment(paymentId: string): Promise<PaymentVerificationResult>;
  handleWebhook(payload: any, signature?: string): Promise<WebhookProcessingResult>;
  refundPayment(paymentId: string, reason: string): Promise<{ success: boolean; refundId: string }>;
}
