import { Inject, Injectable } from '@nestjs/common';
import { DB_CONNECTION } from '#database/database.constants';
import type { DrizzleDb } from '#database/database.types';
import { SessionsRepository } from '#modules/iam/shared';
import { AuditLogService } from '#modules/iam/shared/services/audit-log.service';

@Injectable()
export class RevokeOtherSessionsUseCase {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly sessionsRepository: SessionsRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(identityId: string, currentSessionId: string): Promise<void> {
    await this.sessionsRepository.revokeAllExcept(
      this.db,
      identityId,
      currentSessionId,
    );

    void this.auditLogService.log({
      actorId: identityId,
      action: 'session.bulk_revoked',
      resource: 'session',
      metadata: { keepSessionId: currentSessionId },
    });
  }
}
