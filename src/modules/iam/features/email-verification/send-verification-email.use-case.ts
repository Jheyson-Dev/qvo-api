import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'node:crypto';
import { MailService } from '#common/mail/mail.service';
import { VerificationRepository } from '#modules/iam/shared';
import type { DbOrTx } from '#database/database.types';

@Injectable()
export class SendVerificationEmailUseCase {
  constructor(
    private readonly verificationRepository: VerificationRepository,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async execute(tx: DbOrTx, identityId: string, email: string): Promise<void> {
    // Token aleatorio criptográficamente seguro (64 chars hex)
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresMs = this.configService.get<number>(
      'app.mail.emailVerificationExpiresMs',
    )!;
    const expiresAt = new Date(Date.now() + expiresMs);

    await this.verificationRepository.createEmailVerification(
      tx,
      identityId,
      tokenHash,
      expiresAt,
    );

    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    const verificationUrl = `${frontendUrl}/verify-email?token=${rawToken}`;

    // El correo se envía FUERA de la transacción (no bloquea el commit de la BD)
    await this.mailService.sendVerificationEmail(email, verificationUrl);
  }
}
