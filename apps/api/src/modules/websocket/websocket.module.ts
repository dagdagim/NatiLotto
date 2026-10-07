import { Global, Module } from '@nestjs/common';
import { DrawGateway } from './draw.gateway';

@Global()
@Module({
  providers: [DrawGateway],
  exports: [DrawGateway],
})
export class WebSocketModule {}
