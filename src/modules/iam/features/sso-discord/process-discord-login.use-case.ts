import {
  Inject,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as oauth2 from 'oauth4webapi';
import { DB_CONNECTION } from '#database/database.constants';
import { ssoExchangeTickets } from '#database/schema';
import { TokenService } from '#common/security';
import { ResolveOAuthAccountUseCase } from '#modules/iam/shared';
import type { DrizzleDb } from '#database/database.types';

type DiscordUser = {
  id: string;
  username: string;
  discriminator: string;
  global_name: string | null;
  avatar: string | null;
  verified: boolean;
  email: string;
  banner: string | null;
  accent_color: number | null;
  premium_type: number;
};

@Injectable()
export class ProcessDiscordLoginUseCase {
  private readonly logger = new Logger(ProcessDiscordLoginUseCase.name);
  private readonly as: oauth2.AuthorizationServer = {
    issuer: 'https://discord.com',
    authorization_endpoint: 'https://discord.com/oauth2/authorize',
    token_endpoint: 'https://discord.com/api/oauth2/token',
  };

  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
    private readonly resolveOAuthAccountUseCase: ResolveOAuthAccountUseCase,
  ) {}

  async execute(
    currentUrl: URL,
    expectedState: string,
    codeVerifier: string,
    redirectUri: string,
  ): Promise<string> {
    const client: oauth2.Client = {
      client_id: this.configService.get<string>('app.discord.clientId')!,
      client_secret: this.configService.get<string>(
        'app.discord.clientSecret',
      )!,
      token_endpoint_auth_method: 'client_secret_post',
    };

    const parameters = oauth2.validateAuthResponse(
      this.as,
      client,
      currentUrl,
      expectedState,
    );

    const tokenResponse = await oauth2.authorizationCodeGrantRequest(
      this.as,
      client,
      oauth2.ClientSecretPost(client.client_secret as string),
      parameters,
      redirectUri,
      codeVerifier,
    );

    const result = await oauth2.processAuthorizationCodeResponse(
      this.as,
      client,
      tokenResponse,
    );

    this.logger.debug('[Flujo Discord] Access token obtenido correctamente.');

    const accessToken = result.access_token;

    this.logger.debug('[Flujo Discord] Obteniendo perfil del usuario...');
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: 'Bearer ' + accessToken },
    });

    if (!userRes.ok) {
      throw new UnauthorizedException(
        'No se pudo obtener el perfil de Discord.',
      );
    }

    const discordUser = (await userRes.json()) as DiscordUser;
    this.logger.debug(
      '[Flujo Discord] Perfil recibido para: ' +
        discordUser.username +
        ' (' +
        discordUser.email +
        ')',
    );

    if (!discordUser.email || !discordUser.verified) {
      throw new UnauthorizedException(
        'Necesitas un email verificado en tu cuenta de Discord para iniciar sesion.',
      );
    }

    const avatarUrl = discordUser.avatar
      ? 'https://cdn.discordapp.com/avatars/' +
        discordUser.id +
        '/' +
        discordUser.avatar +
        '.png'
      : 'https://cdn.discordapp.com/embed/avatars/' +
        (parseInt(discordUser.discriminator || '0', 10) % 5) +
        '.png';

    this.logger.debug(
      '[Flujo Discord] Iniciando resolucion de cuenta para: ' +
        discordUser.email,
    );

    const identityId = await this.resolveOAuthAccountUseCase.execute({
      provider: 'DISCORD',
      providerAccountId: discordUser.id,
      email: discordUser.email,
      name: discordUser.global_name || discordUser.username,
      picture: avatarUrl,
      emailVerified: discordUser.verified,
      metadata: {
        username: discordUser.username,
        global_name: discordUser.global_name ?? null,
        discriminator: discordUser.discriminator,
        banner: discordUser.banner ?? null,
        accent_color: discordUser.accent_color ?? null,
        premium_type: discordUser.premium_type ?? 0,
      },
    });

    this.logger.debug(
      '[Flujo Discord] Cuenta resuelta (Identity ID: ' +
        identityId +
        '). Generando ticket temporal...',
    );
    const rawTicket = this.tokenService.generateOpaqueToken();
    const ticketHash = this.tokenService.hashOpaqueToken(rawTicket);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.db
      .insert(ssoExchangeTickets)
      .values({ identityId, ticketHash, expiresAt });

    return rawTicket;
  }
}
