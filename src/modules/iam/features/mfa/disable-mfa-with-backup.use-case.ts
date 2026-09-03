import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { DB_CONNECTION } from '#database/database.constants';
import { MfaRepository } from '#modules/iam/shared';
import { TokenService } from '#common/security';
import type { DrizzleDb } from '#database/database.types';
import { AuditLogService } from '#modules/iam/shared/services/audit-log.service';

@Injectable()
export class DisableMfaWithBackupUseCase {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly mfaRepository: MfaRepository,
    private readonly tokenService: TokenService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(identityId: string, code: string): Promise<void> {
    const factor = await this.mfaRepository.findByIdentityId(
      this.db,
      identityId,
    );

    if (!factor || !factor.isVerified) {
      throw new BadRequestException('No tienes el 2FA activado.');
    }

    // Hashear el código y buscar si existe
    const codeHash = this.tokenService.hashOpaqueToken(code);
    const backupCode = await this.mfaRepository.findBackupCodeByHash(
      this.db,
      identityId,
      codeHash,
    );

    if (!backupCode) {
      throw new BadRequestException(
        'El código de respaldo es incorrecto o ya fue utilizado.',
      );
    }

    // Borramos todo en una transacción (factor y todos los backup codes viejos)
    await this.db.transaction(async (tx) => {
      await this.mfaRepository.deleteFactor(tx, factor.id);
      await this.mfaRepository.deleteBackupCodes(tx, identityId);
    });

    void this.auditLogService.log({
      actorId: identityId,
      action: 'mfa.disabled_with_backup',
      resource: 'mfa_factor',
      resourceId: factor.id,
    });
  }
}
