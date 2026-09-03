import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { verify } from 'otplib';
import * as crypto from 'crypto';
import { DB_CONNECTION } from '#database/database.constants';
import { MfaRepository } from '#modules/iam/shared';
import { TokenService } from '#common/security';
import type { DrizzleDb } from '#database/database.types';

@Injectable()
export class EnableMfaUseCase {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly mfaRepository: MfaRepository,
    private readonly tokenService: TokenService,
  ) {}

  async execute(identityId: string, code: string): Promise<string[]> {
    const factor = await this.mfaRepository.findByIdentityId(
      this.db,
      identityId,
    );

    if (!factor || !factor.secret) {
      throw new BadRequestException(
        'Primero debes iniciar el setup del 2FA (POST /iam/mfa/setup).',
      );
    }

    if (factor.isVerified) {
      throw new BadRequestException('El 2FA ya está activado en esta cuenta.');
    }

    const isValid = verify({ token: code, secret: factor.secret });

    if (!isValid) {
      throw new BadRequestException(
        'El código es incorrecto. Asegúrate de que tu app autenticadora esté sincronizada.',
      );
    }

    const plainCodes: string[] = [];
    const backupCodesInsert: { identityId: string; codeHash: string }[] = [];

    for (let i = 0; i < 10; i++) {
      const plainCode = crypto.randomBytes(4).toString('hex').toUpperCase(); // Ej: A1B2C3D4
      plainCodes.push(plainCode);

      const codeHash = this.tokenService.hashOpaqueToken(plainCode);
      backupCodesInsert.push({
        identityId,
        codeHash, 
      });
    }

    await this.db.transaction(async (tx) => {
      await this.mfaRepository.markVerified(tx, factor.id);
      await this.mfaRepository.createBackupCodes(tx, backupCodesInsert);
    });

    return plainCodes;
  }
}
