import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DB_CONNECTION } from '#database/database.constants';
import { HashingService, TokenService } from '#common/security';
import { UsersRepository } from '#modules/users/shared/users.repository';
import type { DrizzleDb } from '#database/database.types';
import {
  LoginAttemptsRepository,
  MfaRepository,
  SessionsRepository,
  DevicesRepository,
  type LoginResult,
} from '#modules/iam/shared';
import { ClientInfoData } from '#common/decorators';
import { LoginDto } from './login.dto';

// Política OWASP: 5 intentos fallidos → bloqueo de 15 minutos
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutos en ms

// Mensaje genérico intencionalmente ambiguo para evitar enumeración de usuarios
const INVALID_CREDENTIALS_MSG = 'Credenciales inválidas.';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly hashingService: HashingService,
    private readonly tokenService: TokenService,
    private readonly sessionsRepository: SessionsRepository,
    private readonly mfaRepository: MfaRepository,
    private readonly loginAttemptsRepository: LoginAttemptsRepository,
    private readonly devicesRepository: DevicesRepository,
  ) {}

  async execute(
    dto: LoginDto,
    clientInfo: ClientInfoData,
  ): Promise<LoginResult> {
    const user = await this.usersRepository.findByEmail(this.db, dto.email);

    // ── 1. Si el usuario no existe o no tiene contraseña, rechazamos
    //       sin revelar si el email está registrado (anti-enumeración)
    if (!user || !user.passwordHash) {
      // Registramos el intento fallido sin identityId (usuario desconocido)
      void this.loginAttemptsRepository.recordAttempt(this.db, {
        email: dto.email,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        success: false,
        failureReason: 'USER_NOT_FOUND',
      });
      throw new UnauthorizedException(INVALID_CREDENTIALS_MSG);
    }

    // ── 2. Verificar si la cuenta está suspendida por el administrador
    if (!user.isActive) {
      void this.loginAttemptsRepository.recordAttempt(this.db, {
        identityId: user.identityId,
        email: dto.email,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        success: false,
        failureReason: 'ACCOUNT_INACTIVE',
      });
      // Aquí sí informamos del estado porque es una decisión administrativa, no un fallo de credenciales
      throw new UnauthorizedException('Tu cuenta está inactiva o suspendida.');
    }

    // ── 3. Verificar si la cuenta está en período de lockout (brute-force)
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const remainingMs = user.lockoutUntil.getTime() - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      void this.loginAttemptsRepository.recordAttempt(this.db, {
        identityId: user.identityId,
        email: dto.email,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        success: false,
        failureReason: 'ACCOUNT_LOCKED',
      });
      throw new UnauthorizedException(
        `Cuenta bloqueada temporalmente por múltiples intentos fallidos. Intenta de nuevo en ${remainingMinutes} minuto(s).`,
      );
    }

    // ── 4. Verificar la contraseña
    const isPasswordValid = await this.hashingService.verify(
      user.passwordHash,
      dto.password,
    );

    if (!isPasswordValid) {
      // Calcular el nuevo total de fallos ANTES de incrementar para decidir si bloqueamos
      const newFailedCount = (user.failedLoginAttempts ?? 0) + 1;
      const shouldLockout = newFailedCount >= MAX_FAILED_ATTEMPTS;
      const lockoutUntil = shouldLockout
        ? new Date(Date.now() + LOCKOUT_DURATION_MS)
        : undefined;

      // Incrementar contador en BD (y bloquear si aplica)
      await this.usersRepository.incrementFailedAttempts(
        this.db,
        user.identityId,
        lockoutUntil,
      );

      // Registrar el intento fallido
      void this.loginAttemptsRepository.recordAttempt(this.db, {
        identityId: user.identityId,
        email: dto.email,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        success: false,
        failureReason: shouldLockout
          ? 'INVALID_PASSWORD_LOCKOUT'
          : 'INVALID_PASSWORD',
      });

      // Siempre el mismo mensaje para evitar enumeración
      throw new UnauthorizedException(INVALID_CREDENTIALS_MSG);
    }

    // ── 5. Login exitoso: resetear contador de fallos y lockout
    await this.usersRepository.resetFailedAttempts(this.db, user.identityId);

    // Registrar el login exitoso en login_attempts
    void this.loginAttemptsRepository.recordAttempt(this.db, {
      identityId: user.identityId,
      email: dto.email,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      success: true,
    });

    // ── 6. Comprobar si el usuario tiene 2FA activo ────────────────────────────
    const mfaFactor = await this.mfaRepository.findByIdentityId(
      this.db,
      user.identityId,
    );

    if (mfaFactor?.isVerified) {
      // 2FA activo: emitir token temporal de 5 minutos para completar el challenge
      const mfaToken = await this.jwtService.signAsync(
        {
          sub: user.identityId,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          emailVerified: user.emailVerified,
          mfaPending: true,
        },
        { expiresIn: 300 }, // 5 minutos
      );

      return { mfaRequired: true, mfaToken };
    }
    // ──────────────────────────────────────────────────────────────────────────

    // ── 7. Sin 2FA: login normal, crear sesión y emitir JWT ───────────────────
    const refreshToken = this.tokenService.generateOpaqueToken();
    const tokenHash = this.tokenService.hashOpaqueToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    // Vincular o registrar el dispositivo antes de crear la sesión
    const deviceId = await this.devicesRepository.upsertDevice(this.db, {
      identityId: user.identityId,
      fingerprint: dto.fingerprint,
      browser: clientInfo.browser,
      operatingSystem: clientInfo.operatingSystem,
      ipAddress: clientInfo.ipAddress,
    });

    const session = await this.sessionsRepository.createSession(this.db, {
      identityId: user.identityId,
      tokenHash,
      deviceId,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      platform: clientInfo.platform,
      city:
        clientInfo.geo?.city?.names?.es ||
        clientInfo.geo?.city?.names?.en ||
        null,
      region:
        clientInfo.geo?.subdivisions?.[0]?.names?.es ||
        clientInfo.geo?.subdivisions?.[0]?.names?.en ||
        null,
      country:
        clientInfo.geo?.country?.names?.es ||
        clientInfo.geo?.country?.names?.en ||
        null,
      countryCode: clientInfo.geo?.country?.iso_code || null,
      continent:
        clientInfo.geo?.continent?.names?.es ||
        clientInfo.geo?.continent?.names?.en ||
        null,
      continentCode: clientInfo.geo?.continent?.code || null,
      latitude: clientInfo.geo?.location?.latitude ?? null,
      longitude: clientInfo.geo?.location?.longitude ?? null,
      timezone: clientInfo.geo?.timezone || null,
      expiresAt,
    });

    const payload = {
      sub: user.identityId,
      email: user.email,
      username: user.username,
      sessionId: session.id,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      mfaRequired: false,
      accessToken,
      refreshToken,
      user: {
        identityId: user.identityId,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
      },
    };
  }
}
