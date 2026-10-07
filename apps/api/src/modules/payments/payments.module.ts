import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { MockPaymentProvider } from './mock-payment.provider';
import { TelebirrPaymentProvider } from './telebirr-payment.provider';
import { ChapaPaymentProvider } from './chapa-payment.provider';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, MockPaymentProvider, TelebirrPaymentProvider, ChapaPaymentProvider],
  exports: [PaymentsService, ChapaPaymentProvider],
})
export class PaymentsModule {}
