import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verify } from 'otplib';
import { DB_CONNECTION } from '#database/database.constants';
import {
  MfaRepository,
  SessionsRepository,
  DevicesRepository,
} from '#modules/iam/shared';
import { UsersRepository } from '#modules/users/shared/users.repository';
import { TokenService } from '#common/security';
import type { DrizzleDb } from '#database/database.types';
import type { LoginResponse } from '#modules/iam/shared';
import type { ClientInfoData } from '#common/decorators';
import type { MfaVerifyDto } from './mfa.dto';

// Tipo del payload que viaja en el mfaToken temporal
type MfaTokenPayload = {
  sub: string;
  email: string;
  username: string;
  displayName: string;
  emailVerified: boolean | null;
  mfaPending: true; // discriminador para que no pueda usarse como accessToken
};

@Injectable()
export class VerifyMfaUseCase {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly mfaRepository: MfaRepository,
    private readonly usersRepository: UsersRepository,
    private readonly sessionsRepository: SessionsRepository,
    private readonly jwtService: JwtService,
    private readonly tokenService: TokenService,
    private readonly devicesRepository: DevicesRepository,
  ) {}

  async execute(
    dto: MfaVerifyDto,
    clientInfo: ClientInfoData,
  ): Promise<LoginResponse> {
    // 1. Verificar y decodificar el mfaToken temporal
    let payload: MfaTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<MfaTokenPayload>(
        dto.mfaToken,
      );
    } catch {
      throw new UnauthorizedException(
        'El token MFA es inválido o ha expirado.',
      );
    }

    if (!payload.mfaPending) {
      throw new BadRequestException('Token inválido para verificación MFA.');
    }

    // 2. Verificar que el factor MFA sigue activo
    const factor = await this.mfaRepository.findByIdentityId(
      this.db,
      payload.sub,
    );
    if (!factor || !factor.isVerified || !factor.secret) {
      throw new UnauthorizedException('El 2FA no está activo en esta cuenta.');
    }

    // 3. Validar el código TOTP
    const isValid = verify({
      token: dto.code,
      secret: factor.secret,
    });
    if (!isValid) {
      throw new UnauthorizedException('Código 2FA incorrecto.');
    }

    await this.mfaRepository.updateLastUsed(this.db, factor.id);

    const refreshToken = this.tokenService.generateOpaqueToken();
    const tokenHash = this.tokenService.hashOpaqueToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Vincular o registrar el dispositivo antes de crear la sesión
    const deviceId = await this.devicesRepository.upsertDevice(this.db, {
      identityId: payload.sub,
      fingerprint: dto.fingerprint,
      browser: clientInfo.browser,
      operatingSystem: clientInfo.operatingSystem,
      ipAddress: clientInfo.ipAddress,
    });

    const session = await this.sessionsRepository.createSession(this.db, {
      identityId: payload.sub,
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

    // 4. Completar el login: emitir JWT real + sesión
    const accessPayload = {
      sub: payload.sub,
      email: payload.email,
      username: payload.username,
      sessionId: session.id,
    };
    const accessToken = await this.jwtService.signAsync(accessPayload);

    return {
      mfaRequired: false,
      accessToken,
      refreshToken,
      user: {
        identityId: payload.sub,
        email: payload.email,
        username: payload.username,
        displayName: payload.displayName,
        emailVerified: payload.emailVerified,
      },
    };
  }
}
