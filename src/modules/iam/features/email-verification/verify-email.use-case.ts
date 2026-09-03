import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { DB_CONNECTION } from '#database/database.constants';
import { VerificationRepository } from '#modules/iam/shared';
import { UsersRepository } from '#modules/users/shared/users.repository';
import type { DrizzleDb, DrizzleTx } from '#database/database.types';
import { createHash } from 'node:crypto';

@Injectable()
export class VerifyEmailUseCase {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly verificationRepository: VerificationRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async execute(rawToken: string): Promise<void> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    await this.db.transaction(async (tx: DrizzleTx) => {
      const record =
        await this.verificationRepository.findPendingEmailVerification(
          tx,
          tokenHash,
        );

      if (!record) {
        throw new BadRequestException(
          'El token de verificación es inválido o ya fue utilizado.',
        );
      }

      if (record.expiresAt < new Date()) {
        throw new BadRequestException(
          'El token de verificación ha expirado. Solicita uno nuevo.',
        );
      }

      await this.verificationRepository.markEmailVerified(tx, record.id);
      await this.usersRepository.setEmailVerified(tx, record.identityId);
    });
  }
}
