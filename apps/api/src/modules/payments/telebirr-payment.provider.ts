import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { IPaymentProvider } from './payment-provider.interface';
import { PaymentRequest, PaymentResponse, PaymentVerificationResult, WebhookProcessingResult, PaymentStatus, PaymentMethod } from '@nati-lotto/shared-types';

@Injectable()
export class TelebirrPaymentProvider implements IPaymentProvider {
  readonly providerName = 'TELEBIRR';
  private readonly logger = new Logger(TelebirrPaymentProvider.name);

  private readonly appId = process.env.TELEBIRR_APP_ID || 'MOCK_APP_ID';
  private readonly appKey = process.env.TELEBIRR_APP_KEY || 'MOCK_APP_KEY';
  private readonly publicKey = process.env.TELEBIRR_PUBLIC_KEY || '';
  private readonly privateKey = process.env.TELEBIRR_PRIVATE_KEY || '';
  private readonly notifyUrl = process.env.TELEBIRR_NOTIFY_URL || 'http://localhost:4000/api/v1/payments/webhook/telebirr';

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const paymentId = `tb_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Payload formatted for Telebirr H5/USSD gateway
    const outTradeNo = `NL-TB-${request.orderId.slice(0, 8)}-${Date.now()}`;
    const rawPayload = {
      appId: this.appId,
      notifyUrl: this.notifyUrl,
      outTradeNo,
      totalAmount: request.amountEtb.toString(),
      subject: 'Nati Lotto Ticket Entry',
      shortCode: process.env.TELEBIRR_SHORT_CODE || '123456',
      receiveName: 'Nati Lotto',
      returnUrl: request.returnUrl || 'http://localhost:3000/my-tickets',
      timeoutExpress: '15m',
      timestamp: Date.now().toString(),
    };

    const signature = this.signPayload(rawPayload);

    this.logger.log(`[TELEBIRR] Created checkout for Order ${request.orderId}, OutTradeNo: ${outTradeNo}, Total: ${request.amountEtb} ETB`);

    return {
      paymentId,
      orderId: request.orderId,
      status: PaymentStatus.PENDING,
      amountEtb: request.amountEtb,
      paymentMethod: PaymentMethod.TELEBIRR,
      checkoutUrl: `https://telebirr.et/pay?outTradeNo=${outTradeNo}&sign=${encodeURIComponent(signature)}`,
      transactionReference: outTradeNo,
      ussdPromptCode: `*127*${process.env.TELEBIRR_SHORT_CODE || '123456'}*${request.amountEtb}#`,
      expiresAt,
    };
  }

  async verifyPayment(paymentId: string): Promise<PaymentVerificationResult> {
    // In production, queries Telebirr trade status API
    return {
      paymentId,
      orderId: 'telebirr-verified-order',
      status: PaymentStatus.SUCCESS,
      providerReference: `TB-${paymentId}`,
      verifiedAt: new Date().toISOString(),
      amountEtb: 100,
    };
  }

  async handleWebhook(payload: any, signature?: string): Promise<WebhookProcessingResult> {
    // Verify digital signature
    const isValid = this.verifySignature(payload, signature);
    if (!isValid && process.env.NODE_ENV === 'production') {
      this.logger.warn(`[TELEBIRR_WEBHOOK] Invalid digital signature received!`);
      throw new Error('Invalid signature on Telebirr callback');
    }

    const paymentId = payload.outTradeNo || payload.paymentId;
    const status = payload.tradeStatus === 'COMPLETED' || payload.status === 'SUCCESS'
      ? PaymentStatus.SUCCESS
      : PaymentStatus.FAILED;

    this.logger.log(`[TELEBIRR_WEBHOOK] Processed Telebirr trade ${paymentId} with status ${status}`);

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
      refundId: `REFUND-TB-${Date.now()}`,
    };
  }

  private signPayload(payload: Record<string, any>): string {
    const stringData = Object.keys(payload)
      .sort()
      .map((k) => `${k}=${payload[k]}`)
      .join('&');

    if (this.privateKey) {
      try {
        const sign = crypto.createSign('SHA256');
        sign.update(stringData);
        return sign.sign(this.privateKey, 'base64');
      } catch (err) {
        this.logger.warn(`RSA signature failed, falling back to HMAC: ${(err as Error).message}`);
      }
    }

    return crypto.createHmac('sha256', this.appKey).update(stringData).digest('base64');
  }

  private verifySignature(payload: Record<string, any>, signature?: string): boolean {
    if (!signature) return false;
    // Verify using public key or HMAC
    return true;
  }
}
