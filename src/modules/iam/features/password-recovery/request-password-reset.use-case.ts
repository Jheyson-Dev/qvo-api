import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'node:crypto';
import { DB_CONNECTION } from '#database/database.constants';
import { VerificationRepository } from '#modules/iam/shared';
import { UsersRepository } from '#modules/users/shared/users.repository';
import { MailService } from '#common/mail/mail.service';
import type { DrizzleDb } from '#database/database.types';

@Injectable()
export class RequestPasswordResetUseCase {
  private readonly logger = new Logger(RequestPasswordResetUseCase.name);

  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly usersRepository: UsersRepository,
    private readonly verificationRepository: VerificationRepository,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async execute(email: string): Promise<void> {
    const user = await this.usersRepository.findByEmail(this.db, email);

    // Seguridad: no revelamos si el correo existe o no (anti-enumeration)
    if (!user) {
      this.logger.log(`Solicitud de reseteo para email inexistente: ${email}`);
      return;
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresMs = this.configService.get<number>(
      'app.mail.passwordResetExpiresMs',
    )!;
    const expiresAt = new Date(Date.now() + expiresMs);

    await this.verificationRepository.createPasswordReset(
      this.db,
      user.identityId,
      tokenHash,
      expiresAt,
    );

    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    await this.mailService.sendPasswordResetEmail(email, resetUrl);
    this.logger.log(`Correo de recuperación enviado a ${email}`);
  }
}
