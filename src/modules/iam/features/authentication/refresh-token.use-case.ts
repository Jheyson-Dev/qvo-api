import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DB_CONNECTION } from '#database/database.constants';
import { TokenService } from '#common/security';
import type { DrizzleDb } from '#database/database.types';
import {
  SessionsRepository,
  type RefreshTokenResponse,
} from '#modules/iam/shared';
import { ClientInfoData } from '#common/decorators';
import { RefreshTokenDto } from './refresh-token.dto';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly sessionsRepository: SessionsRepository,
    private readonly tokenService: TokenService,
    private readonly jwtService: JwtService,
  ) {}

  async execute(
    dto: RefreshTokenDto,
    clientInfo: ClientInfoData,
  ): Promise<RefreshTokenResponse> {
    const tokenHash = this.tokenService.hashOpaqueToken(dto.refreshToken);
    const result = await this.sessionsRepository.findByTokenHash(
      this.db,
      tokenHash,
    );

    if (
      !result ||
      result.session.revoked ||
      result.session.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Sesión inválida o expirada.');
    }

    if (!result.user.isActive) {
      throw new UnauthorizedException('Tu cuenta está inactiva o suspendida.');
    }

    const newRefreshToken = this.tokenService.generateOpaqueToken();
    const newTokenHash = this.tokenService.hashOpaqueToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    const newSession = await this.db.transaction(async (tx) => {
      await this.sessionsRepository.revokeSession(tx, result.session.id);
      return this.sessionsRepository.createSession(tx, {
        identityId: result.user.identityId,
        tokenHash: newTokenHash,
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

    const payload = {
      sub: result.user.identityId,
      email: result.user.email,
      username: result.user.username,
      sessionId: newSession.id,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }
}
