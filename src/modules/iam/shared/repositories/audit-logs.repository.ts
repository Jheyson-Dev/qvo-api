import { Injectable } from '@nestjs/common';
import { auditLogs } from '#database/schema';
import type { DbOrTx } from '#database/database.types';

type InsertAuditLog = typeof auditLogs.$inferInsert;

export type AuditLogData = {
  actorId?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class AuditLogsRepository {
  async insert(db: DbOrTx, data: AuditLogData): Promise<void> {
    const row: InsertAuditLog = {
      actorId: data.actorId ?? null,
      action: data.action,
      resource: data.resource ?? null,
      resourceId: data.resourceId ?? null,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
      metadata: data.metadata ?? null,
    };
    await db.insert(auditLogs).values(row);
  }
}
