import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DB_CONNECTION } from '#database/database.constants';
import { VerificationRepository } from '#modules/iam/shared';
import { UsersRepository } from '#modules/users/shared/users.repository';
import { HashingService } from '#common/security';
import type { DrizzleDb, DrizzleTx } from '#database/database.types';
import { AuditLogService } from '#modules/iam/shared/services/audit-log.service';

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly verificationRepository: VerificationRepository,
    private readonly usersRepository: UsersRepository,
    private readonly hashingService: HashingService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    await this.db.transaction(async (tx: DrizzleTx) => {
      const record = await this.verificationRepository.findPendingPasswordReset(
        tx,
        tokenHash,
      );

      if (!record) {
        throw new BadRequestException(
          'El token de recuperación es inválido o ya fue utilizado.',
        );
      }

      if (record.expiresAt < new Date()) {
        throw new BadRequestException(
          'El token de recuperación ha expirado. Solicita uno nuevo.',
        );
      }

      const passwordHash = await this.hashingService.hash(newPassword);

      await this.verificationRepository.markPasswordResetUsed(tx, record.id);
      await this.usersRepository.updatePasswordHash(
        tx,
        record.identityId,
        passwordHash,
      );

      // Fire and Forget: el audit log se dispara DESPUÉS de que la tx confirma
      void this.auditLogService.log({
        actorId: record.identityId,
        action: 'user.password_reset',
        resource: 'user',
        resourceId: record.identityId,
      });
    });
  }
}
