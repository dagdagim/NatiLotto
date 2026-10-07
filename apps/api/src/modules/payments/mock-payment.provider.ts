import { Injectable, Logger } from '@nestjs/common';
import { IPaymentProvider } from './payment-provider.interface';
import { PaymentRequest, PaymentResponse, PaymentVerificationResult, WebhookProcessingResult, PaymentStatus, PaymentMethod } from '@nati-lotto/shared-types';

@Injectable()
export class MockPaymentProvider implements IPaymentProvider {
  readonly providerName = 'MOCK';
  private readonly logger = new Logger(MockPaymentProvider.name);

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const paymentId = `mock_pay_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    this.logger.log(`[MOCK_PAYMENT] Created checkout for Order ${request.orderId}, Amount: ${request.amountEtb} ETB`);

    return {
      paymentId,
      orderId: request.orderId,
      status: PaymentStatus.PENDING,
      amountEtb: request.amountEtb,
      paymentMethod: request.paymentMethod || PaymentMethod.MOCK,
      checkoutUrl: `http://localhost:4000/api/v1/payments/mock-checkout?paymentId=${paymentId}&orderId=${request.orderId}&amount=${request.amountEtb}`,
      transactionReference: `TX-MOCK-${Date.now()}`,
      ussdPromptCode: '*127*1*1#',
      expiresAt,
    };
  }

  async verifyPayment(paymentId: string): Promise<PaymentVerificationResult> {
    return {
      paymentId,
      orderId: 'mock-order-id',
      status: PaymentStatus.SUCCESS,
      providerReference: `MOCK-REF-${paymentId}`,
      verifiedAt: new Date().toISOString(),
      amountEtb: 100,
    };
  }

  async handleWebhook(payload: any, signature?: string): Promise<WebhookProcessingResult> {
    const paymentId = payload.paymentId || payload.outTradeNo;
    const status = payload.status === 'SUCCESS' ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;

    this.logger.log(`[MOCK_PAYMENT_WEBHOOK] Processed payment ${paymentId} -> ${status}`);

    return {
      handled: true,
      paymentId,
      status,
      isDuplicate: false,
    };
  }

  async refundPayment(paymentId: string, reason: string): Promise<{ success: boolean; refundId: string }> {
    return {
      success: true,
      refundId: `REFUND-MOCK-${Date.now()}`,
    };
  }
}
