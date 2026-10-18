import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Prisma connected to database successfully.');
    } catch (err: any) {
      this.logger.error(`Database connection failed on startup: ${err.message}. Ensure DATABASE_URL is configured in Vercel environment variables.`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

