import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('System')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'API Root Status & Information' })
  getRoot() {
    return {
      name: 'Nati Lotto Core API',
      tagline: 'Your Chance. Your Moment.',
      version: '1.0.0',
      status: 'online',
      timestamp: new Date().toISOString(),
      docs: '/api/docs',
      apiPrefix: '/api/v1',
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Health Check' })
  getHealth() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
