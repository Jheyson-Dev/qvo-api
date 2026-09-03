import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { verify } from 'otplib';
import { DB_CONNECTION } from '#database/database.constants';
import { MfaRepository } from '#modules/iam/shared';
import type { DrizzleDb } from '#database/database.types';
import { AuditLogService } from '#modules/iam/shared/services/audit-log.service';

@Injectable()
export class DisableMfaUseCase {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly mfaRepository: MfaRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(identityId: string, code: string): Promise<void> {
    const factor = await this.mfaRepository.findByIdentityId(
      this.db,
      identityId,
    );

    if (!factor || !factor.isVerified || !factor.secret) {
      throw new BadRequestException('No tienes el 2FA activado.');
    }

    const isValid = verify({ token: code, secret: factor.secret });

    if (!isValid) {
      throw new BadRequestException(
        'El código es incorrecto. No se puede desactivar el 2FA.',
      );
    }

    await this.db.transaction(async (tx) => {
      await this.mfaRepository.deleteFactor(tx, factor.id);
      await this.mfaRepository.deleteBackupCodes(tx, identityId);
    });

    void this.auditLogService.log({
      actorId: identityId,
      action: 'mfa.disabled',
      resource: 'mfa_factor',
      resourceId: factor.id,
    });
  }
}
