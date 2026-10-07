import { Module } from '@nestjs/common';
import { DrawEngineService } from './draw-engine.service';

@Module({
  providers: [DrawEngineService],
  exports: [DrawEngineService],
})
export class DrawEngineModule {}
