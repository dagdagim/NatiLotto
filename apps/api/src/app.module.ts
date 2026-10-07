import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuditModule } from './modules/audit/audit.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { AuthModule } from './modules/auth/auth.module';
import { DrawsModule } from './modules/draws/draws.module';
import { OrdersModule } from './modules/orders/orders.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { DrawEngineModule } from './modules/draw-engine/draw-engine.module';
import { VerificationModule } from './modules/verification/verification.module';
import { WinnersModule } from './modules/winners/winners.module';
import { AdminModule } from './modules/admin/admin.module';
import { WebSocketModule } from './modules/websocket/websocket.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AuditModule,
    ComplianceModule,
    WebSocketModule,
    AuthModule,
    DrawsModule,
    OrdersModule,
    TicketsModule,
    PaymentsModule,
    DrawEngineModule,
    VerificationModule,
    WinnersModule,
    AdminModule,
  ],
})
export class AppModule {}
