import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DB_CONNECTION } from '#database/database.constants';
import type { DrizzleDb } from '#database/database.types';
import { SessionsRepository } from '#modules/iam/shared';
import { AuditLogService } from '#modules/iam/shared/services/audit-log.service';

@Injectable()
export class RevokeSessionUseCase {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly sessionsRepository: SessionsRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(sessionId: string, identityId: string): Promise<void> {
    const session = await this.sessionsRepository.findById(this.db, sessionId);

    if (!session) {
      throw new NotFoundException('Sesión no encontrada.');
    }

    if (session.identityId !== identityId) {
      throw new ForbiddenException(
        'No tienes permiso para revocar esta sesión.',
      );
    }

    if (!session.revoked) {
      await this.sessionsRepository.revokeSession(this.db, sessionId);

      void this.auditLogService.log({
        actorId: identityId,
        action: 'session.revoked',
        resource: 'session',
        resourceId: sessionId,
      });
    }
  }
}
