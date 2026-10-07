export interface AuditLogDto {
  id: string;
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
  timestamp: string;
}
