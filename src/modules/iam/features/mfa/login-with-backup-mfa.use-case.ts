import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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
import type { MfaLoginBackupDto } from './mfa.dto';

type MfaTokenPayload = {
  sub: string;
  email: string;
  username: string;
  displayName: string;
  emailVerified: boolean | null;
  mfaPending: true;
};

@Injectable()
export class LoginWithBackupMfaUseCase {
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
    dto: MfaLoginBackupDto,
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

    // 2. Verificar que la cuenta existe y está activa
    const user = await this.usersRepository.findById(this.db, payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Tu cuenta está inactiva o suspendida.');
    }

    // 3. Hashear el código provisto y buscarlo
    const codeHash = this.tokenService.hashOpaqueToken(dto.code);
    const backupCode = await this.mfaRepository.findBackupCodeByHash(
      this.db,
      payload.sub,
      codeHash,
    );

    if (!backupCode) {
      throw new UnauthorizedException(
        'Código de respaldo incorrecto o ya utilizado.',
      );
    }

    // 4. Upsert del dispositivo FUERA de la transacción (no la extendemos sin necesidad)
    const deviceId = await this.devicesRepository.upsertDevice(this.db, {
      identityId: payload.sub,
      fingerprint: dto.fingerprint,
      browser: clientInfo.browser,
      operatingSystem: clientInfo.operatingSystem,
      ipAddress: clientInfo.ipAddress,
    });

    // 5. Quemar el código y crear sesión en una transacción
    const refreshToken = this.tokenService.generateOpaqueToken();
    const sessionTokenHash = this.tokenService.hashOpaqueToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const session = await this.db.transaction(async (tx) => {
      await this.mfaRepository.markBackupCodeUsed(tx, backupCode.id);

      return this.sessionsRepository.createSession(tx, {
        identityId: payload.sub,
        tokenHash: sessionTokenHash,
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
    });

    // 5. Completar el login: emitir JWT real
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
