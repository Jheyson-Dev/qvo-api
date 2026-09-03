import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { generateSecret, generateURI } from 'otplib';
import { DB_CONNECTION } from '#database/database.constants';
import { MfaRepository } from '#modules/iam/shared';
import { UsersRepository } from '#modules/users/shared/users.repository';
import type { DrizzleDb } from '#database/database.types';
import type { MfaSetupResponse } from './mfa-setup-response.type';

@Injectable()
export class SetupMfaUseCase {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly mfaRepository: MfaRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async execute(identityId: string): Promise<MfaSetupResponse> {
    // Verificar si ya tiene MFA activo
    const existing = await this.mfaRepository.findByIdentityId(
      this.db,
      identityId,
    );
    if (existing?.isVerified) {
      throw new ConflictException('El 2FA ya está activado en esta cuenta.');
    }

    // Si hay un factor pendiente (no verificado), eliminarlo para reiniciar
    if (existing && !existing.isVerified) {
      await this.mfaRepository.deleteFactor(this.db, existing.id);
    }

    // Obtener email del usuario para el label del QR
    const user = await this.usersRepository.findById(this.db, identityId);
    const label = user?.email ?? identityId;

    // Generar secreto TOTP
    const secret = generateSecret();
    const otpauthUrl = generateURI({
      issuer: 'QVO',
      label,
      secret,
    });

    // Guardar en BD como no-verificado (pendiente de confirmación)
    await this.mfaRepository.createFactor(this.db, {
      identityId,
      type: 'TOTP',
      secret,
      isVerified: false,
    });

    return { secret, otpauthUrl };
  }
}
