import {
  Inject,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { DB_CONNECTION } from '#database/database.constants';
import { TokenService } from '#common/security';
import {
  MfaRepository,
  SessionsRepository,
  ResolveOAuthAccountUseCase,
  type LoginResult,
} from '#modules/iam/shared';
import { UsersRepository } from '#modules/users/shared/users.repository';
import type { DrizzleDb } from '#database/database.types';
import type { ClientInfoData } from '#common/decorators';

@Injectable()
export class ProcessGoogleLoginUseCase {
  private readonly googleClient: OAuth2Client;
  private readonly logger = new Logger(ProcessGoogleLoginUseCase.name);

  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly tokenService: TokenService,
    private readonly resolveOAuthAccountUseCase: ResolveOAuthAccountUseCase,
    private readonly usersRepository: UsersRepository,
    private readonly sessionsRepository: SessionsRepository,
    private readonly mfaRepository: MfaRepository,
  ) {
    const clientId = this.configService.get<string>('app.google.clientId');
    this.googleClient = new OAuth2Client(clientId);
  }

  async execute(
    idToken: string,
    clientInfo: ClientInfoData,
  ): Promise<LoginResult> {
    // 1. Verificar el idToken con los servidores de Google
    const ticket = await this.googleClient
      .verifyIdToken({
        idToken,
        audience: this.configService.get<string>('app.google.clientId'),
      })
      .catch(() => {
        throw new UnauthorizedException(
          'El token de Google es inválido o ha expirado.',
        );
      });

    const googlePayload = ticket.getPayload();
    if (!googlePayload || !googlePayload.sub || !googlePayload.email) {
      throw new UnauthorizedException(
        'No se pudo obtener la información del usuario de Google.',
      );
    }

    this.logger.debug(
      `[Flujo Google] Payload recibido para el email: ${googlePayload.email}`,
    );

    const {
      sub: googleId,
      email,
      name,
      picture,
      email_verified,
    } = googlePayload;

    // 2. Resolver cuenta (Vincular o Crear)
    const identityId = await this.resolveOAuthAccountUseCase.execute({
      provider: 'GOOGLE',
      providerAccountId: googleId,
      email,
      name,
      picture,
      emailVerified: email_verified ?? false,
      metadata: {
        given_name: googlePayload.given_name ?? null,
        family_name: googlePayload.family_name ?? null,
      },
    });

    // 3. Comprobar estado de la cuenta
    const user = await this.usersRepository.findById(this.db, identityId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Tu cuenta está inactiva o suspendida.');
    }

    // 4. Comprobar MFA
    const mfaFactor = await this.mfaRepository.findByIdentityId(
      this.db,
      identityId,
    );

    if (mfaFactor?.isVerified) {
      const mfaToken = await this.jwtService.signAsync(
        {
          sub: identityId,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          emailVerified: user.emailVerified,
          mfaPending: true,
        },
        { expiresIn: 300 },
      );
      return { mfaRequired: true, mfaToken };
    }

    const refreshToken = this.tokenService.generateOpaqueToken();
    const tokenHash = this.tokenService.hashOpaqueToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const session = await this.sessionsRepository.createSession(this.db, {
      identityId,
      tokenHash,
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

    const accessToken = await this.jwtService.signAsync({
      sub: identityId,
      email: user.email,
      username: user.username,
      sessionId: session.id,
    });

    return {
      mfaRequired: false,
      accessToken,
      refreshToken,
      user: {
        identityId,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
      },
    };
  }
}
