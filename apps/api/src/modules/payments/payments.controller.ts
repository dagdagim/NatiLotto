import { Controller, Post, Get, Body, Param, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { PaymentMethod } from '@nati-lotto/shared-types';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @ApiOperation({ summary: 'Initiate a payment for an order' })
  async initiatePayment(
    @Body()
    body: {
      orderId: string;
      userId: string;
      paymentMethod: PaymentMethod;
      idempotencyKey: string;
      returnUrl?: string;
    }
  ) {
    return this.paymentsService.initiatePayment(body);
  }

  @Post('webhook/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive payment status notification webhook from provider' })
  async handleWebhook(
    @Param('provider') provider: string,
    @Body() payload: any,
    @Headers('x-signature') signature?: string
  ) {
    return this.paymentsService.processWebhook(provider.toUpperCase(), payload, signature);
  }

  @Post('mock-simulate/:paymentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Simulate successful payment for development and QA testing' })
  async simulatePayment(@Param('paymentId') paymentId: string) {
    const success = await this.paymentsService.simulateMockPaymentSuccess(paymentId);
    return { success, message: 'Mock payment simulated successfully' };
  }

  @Post('verify/:reference')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Directly verify and settle a payment using transaction reference' })
  async verifyPaymentPost(@Param('reference') reference: string) {
    return this.paymentsService.verifyAndSettleTransaction(reference);
  }

  @Get('verify/:reference')
  @ApiOperation({ summary: 'Directly verify and settle a payment using transaction reference' })
  async verifyPaymentGet(@Param('reference') reference: string) {
    return this.paymentsService.verifyAndSettleTransaction(reference);
  }
}
