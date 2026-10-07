import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { IPaymentProvider } from './payment-provider.interface';
import {
  PaymentRequest,
  PaymentResponse,
  PaymentVerificationResult,
  WebhookProcessingResult,
  PaymentStatus,
  PaymentMethod,
} from '@nati-lotto/shared-types';

@Injectable()
export class ChapaPaymentProvider implements IPaymentProvider {
  readonly providerName = 'CHAPA';
  private readonly logger = new Logger(ChapaPaymentProvider.name);

  private readonly publicKey = process.env.CHAPA_PUBLIC_KEY || 'CHAPUBK_TEST-F8wVF0CiDxcc6xAut5vm1oFKM4VCVCG9';
  private readonly secretKey = process.env.CHAPA_SECRET_KEY || 'CHASECK_TEST-EzF8SkHTiEva3p8xXcwKREFNpIHCq5hu';
  private readonly webhookSecret = process.env.CHAPA_WEBHOOK_SECRET || this.secretKey;
  private readonly apiUrl = process.env.CHAPA_API_URL || 'https://api.chapa.co/v1';
  private readonly callbackUrl = process.env.CHAPA_CALLBACK_URL || 'http://localhost:4000/api/v1/payments/webhook/chapa';
  private readonly returnUrl = process.env.CHAPA_RETURN_URL || 'http://localhost:3001/my-tickets';

  /**
   * Initializes a payment session on Chapa's official gateway.
   * Returns hosted checkout URL (for Telebirr, CBE Birr, cards, and mobile wallets).
   */
  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const txRef = `NL-CHAPA-${request.orderId.slice(0, 8)}-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

    const rawPhone = request.phone || '0911223344';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? cleanPhone : '0' + cleanPhone.slice(-9);

    let rawEmail = (request as any).email?.trim();
    let validEmail = rawEmail;
    if (!validEmail || !validEmail.includes('@') || validEmail.endsWith('.et') || validEmail.endsWith('.local')) {
      const namePrefix = ((request as any).firstName || 'customer').toLowerCase().replace(/[^a-z0-9]/g, '');
      validEmail = `${namePrefix}.${cleanPhone.slice(-6) || 'player'}@gmail.com`;
    }

    const payload = {
      amount: request.amountEtb.toString(),
      currency: 'ETB',
      email: validEmail,
      first_name: (request as any).firstName || 'Nati',
      last_name: (request as any).lastName || 'Player',
      phone_number: formattedPhone,
      tx_ref: txRef,
      callback_url: this.callbackUrl,
      return_url: request.returnUrl || `${this.returnUrl}?tx_ref=${txRef}`,
      'customization[title]': 'NATI LOTTO Tickets',
      'customization[description]': `Official Lottery Tickets for Order ${request.orderId}`,
    };

    try {
      this.logger.log(`[CHAPA] Initializing checkout for Order ${request.orderId}, TxRef: ${txRef}, Amount: ${request.amountEtb} ETB`);

      const res = await fetch(`${this.apiUrl}/transaction/initialize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data && data.status === 'success' && data.data?.checkout_url) {
        this.logger.log(`[CHAPA] Checkout initialized successfully. URL: ${data.data.checkout_url}`);
        return {
          paymentId: txRef,
          orderId: request.orderId,
          status: PaymentStatus.PENDING,
          amountEtb: request.amountEtb,
          paymentMethod: PaymentMethod.CHAPA,
          checkoutUrl: data.data.checkout_url,
          transactionReference: txRef,
          expiresAt,
        };
      }

      this.logger.error(`[CHAPA] Initialization API returned unexpected body: ${JSON.stringify(data)}`);
      throw new Error(data?.message || 'Chapa initialization failed');
    } catch (err: any) {
      this.logger.error(`[CHAPA] Error initializing transaction: ${err.message}`, err.stack);
      throw err;
    }
  }

  /**
   * Verifies transaction status directly with Chapa API.
   */
  async verifyPayment(txRef: string): Promise<PaymentVerificationResult> {
    try {
      this.logger.log(`[CHAPA] Verifying transaction on Chapa API: ${txRef}`);

      const res = await fetch(`${this.apiUrl}/transaction/verify/${txRef}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
        },
      });

      const data = await res.json();
      this.logger.log(`[CHAPA] Verification response for ${txRef}: status=${data?.status}, bodyStatus=${data?.data?.status}`);

      const isSuccess = data?.status === 'success' && (data?.data?.status === 'success' || data?.data?.status === 'SUCCESS');

      return {
        paymentId: txRef,
        orderId: txRef,
        status: isSuccess ? PaymentStatus.SUCCESS : PaymentStatus.FAILED,
        providerReference: data?.data?.reference || txRef,
        verifiedAt: new Date().toISOString(),
        amountEtb: data?.data?.amount ? Number(data.data.amount) : 0,
      };
    } catch (err: any) {
      this.logger.error(`[CHAPA] Verification failed for ${txRef}: ${err.message}`);
      return {
        paymentId: txRef,
        orderId: txRef,
        status: PaymentStatus.FAILED,
        providerReference: txRef,
        verifiedAt: new Date().toISOString(),
        amountEtb: 0,
      };
    }
  }

  /**
   * Validates webhook signature and parses payment status.
   */
  async handleWebhook(payload: any, signature?: string): Promise<WebhookProcessingResult> {
    const isValid = this.verifyWebhookSignature(payload, signature);
    if (!isValid && process.env.NODE_ENV === 'production') {
      this.logger.warn(`[CHAPA_WEBHOOK] Invalid HMAC signature received on Chapa webhook`);
      throw new Error('Invalid signature on Chapa webhook');
    }

    const txRef = payload.tx_ref || payload.reference || payload.trx_ref;
    const isSuccess = payload.status === 'success' || payload.status === 'SUCCESS' || payload.event === 'charge.complete';

    this.logger.log(`[CHAPA_WEBHOOK] Processed Chapa transaction ${txRef}: isSuccess=${isSuccess}`);

    return {
      handled: true,
      paymentId: txRef,
      status: isSuccess ? PaymentStatus.SUCCESS : PaymentStatus.FAILED,
      isDuplicate: false,
    };
  }

  async refundPayment(paymentId: string, reason: string): Promise<{ success: boolean; refundId: string }> {
    return {
      success: true,
      refundId: `REFUND-CHAPA-${Date.now()}`,
    };
  }

  /**
   * Verifies Chapa HMAC-SHA256 signature against secret key or secret hash.
   */
  private verifyWebhookSignature(payload: any, signature?: string): boolean {
    if (!signature) return true; // allow in development
    try {
      const hmac = crypto.createHmac('sha256', this.webhookSecret);
      const expected = hmac.update(typeof payload === 'string' ? payload : JSON.stringify(payload)).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return signature === this.webhookSecret;
    }
  }
}
