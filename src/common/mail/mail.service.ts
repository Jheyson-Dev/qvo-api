import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('app.mail.resendApiKey');
    this.resend = new Resend(apiKey);
  }

  async sendVerificationEmail(
    to: string,
    verificationUrl: string,
  ): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: 'QVO <noreply@tramifacil.com>',
      to,
      subject: 'Verifica tu correo electrónico',
      html: `
        <h2>¡Bienvenido!</h2>
        <p>Haz clic en el siguiente enlace para verificar tu correo electrónico. El enlace expira en 24 horas.</p>
        <a href="${verificationUrl}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;">
          Verificar correo
        </a>
        <p>Si no creaste una cuenta, ignora este correo.</p>
      `,
    });

    if (error) {
      this.logger.error(
        `Error enviando correo de verificación a ${to}:`,
        error,
      );
      throw new Error('No se pudo enviar el correo de verificación.');
    }

    this.logger.log(`Correo de verificación enviado a ${to}`);
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: 'QVO <noreply@tramifacil.com>',
      to,
      subject: 'Recuperación de contraseña',
      html: `
        <h2>Recuperación de contraseña</h2>
        <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el siguiente enlace. El enlace expira en 1 hora.</p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;">
          Restablecer contraseña
        </a>
        <p>Si no solicitaste esto, ignora este correo. Tu contraseña no cambiará.</p>
      `,
    });

    if (error) {
      this.logger.error(`Error enviando correo de reseteo a ${to}:`, error);
      throw new Error('No se pudo enviar el correo de recuperación.');
    }

    this.logger.log(`Correo de recuperación enviado a ${to}`);
  }
}
