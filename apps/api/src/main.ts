import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import { json, urlencoded, Express } from 'express';
import express from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';

export function configureApp(app: INestApplication) {
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
}

// Standalone Server Bootstrap (Docker, VPS, local node)
async function bootstrap() {
  const logger = new Logger('NatiLottoBootstrap');
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Nati Lotto Core API running on: http://localhost:${port}/api/v1`);
  logger.log(`Swagger OpenAPI Documentation: http://localhost:${port}/api/docs`);
}

// Vercel Serverless Function Handler
let server: Express;

export default async function handler(req: any, res: any) {
  if (!server) {
    server = express();
    const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
    configureApp(app);
    await app.init();
  }
  return server(req, res);
}

// Only auto-start persistent HTTP server when not running in Vercel Serverless
if (!process.env.VERCEL) {
  bootstrap();
}
