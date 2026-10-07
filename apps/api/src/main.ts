import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('NatiLottoBootstrap');
  const app = await NestFactory.create(AppModule);

  // Increase body size limit for photo uploads
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Security headers & compression (configured for cross-origin media & embed support)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(compression());

  // CORS configuration
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Request validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    })
  );

  // Swagger OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('NATI LOTTO API')
    .setDescription('Production-Grade Prize-Draw & Lottery Platform ("Your Chance. Your Moment.")')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Draws', 'Prize-draw discovery and details')
    .addTag('Orders', 'Concurrency-safe ticket ordering')
    .addTag('Tickets', 'User ticket wallet & QR verification')
    .addTag('Payments', 'Pluggable Telebirr & payment abstraction')
    .addTag('Verification', 'Cryptographic draw proof & ticket validation')
    .addTag('Winners', 'Public winners showcase and claim tracking')
    .addTag('Auth', 'OTP and JWT session management')
    .addTag('Admin', 'Operations, authorization, and audit logs')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`Nati Lotto Core API running on: http://localhost:${port}/api/v1`);
  logger.log(`Swagger OpenAPI Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
