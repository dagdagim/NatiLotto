import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAuditLogParams {
  actorId: string;
  actorRole: string;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: CreateAuditLogParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: params.actorId,
          actorRole: params.actorRole,
          actorEmail: params.actorEmail,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          details: params.details ?? {},
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          correlationId: params.correlationId,
        },
      });
      this.logger.log(`[AUDIT] ${params.action} on ${params.entityType}:${params.entityId} by ${params.actorRole}:${params.actorId}`);
    } catch (error) {
      this.logger.error(`Failed to record audit log: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  async getLogs(query: {
    entityType?: string;
    entityId?: string;
    action?: string;
    actorId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;
    if (query.action) where.action = query.action;
    if (query.actorId) where.actorId = query.actorId;

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return { total, page, limit, logs };
  }
}
