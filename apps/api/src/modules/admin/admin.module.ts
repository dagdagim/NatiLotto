import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { DrawsModule } from '../draws/draws.module';
import { DrawEngineModule } from '../draw-engine/draw-engine.module';
import { WinnersModule } from '../winners/winners.module';

@Module({
  imports: [DrawsModule, DrawEngineModule, WinnersModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}

