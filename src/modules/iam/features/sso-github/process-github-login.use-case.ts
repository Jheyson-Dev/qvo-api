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

@Injectable()
export class ProcessGithubLoginUseCase {
  private readonly logger = new Logger(ProcessGithubLoginUseCase.name);
  private readonly as: oauth2.AuthorizationServer = {
    issuer: 'https://github.com/login/oauth',
    authorization_endpoint: 'https://github.com/login/oauth/authorize',
    token_endpoint: 'https://github.com/login/oauth/access_token',
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
      client_id: this.configService.get<string>('app.github.clientId')!,
      client_secret: this.configService.get<string>('app.github.clientSecret')!,
      token_endpoint_auth_method: 'client_secret_post', // GitHub uses POST for token endpoint
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

    this.logger.debug(
      `[Flujo GitHub] Access token y respuesta procesada correctamente.`,
    );

    const accessToken = result.access_token;

    // 2. Obtener el perfil del usuario de GitHub
    this.logger.debug('Obteniendo perfil del usuario de GitHub...');
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!userRes.ok) {
      throw new UnauthorizedException(
        'No se pudo obtener el perfil de GitHub.',
      );
    }

    const githubUser = await userRes.json();
    this.logger.debug(
      `[Flujo GitHub] Perfil crudo de GitHub: ${JSON.stringify(githubUser)}`,
    );

    // 3. Obtener los emails (GitHub puede no devolver el email público en `/user`)
    const emailsRes = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!emailsRes.ok) {
      throw new UnauthorizedException(
        'No se pudo obtener los emails de GitHub.',
      );
    }

    const githubEmails = await emailsRes.json();
    this.logger.debug(
      `[Flujo GitHub] Emails crudos de GitHub: ${JSON.stringify(githubEmails)}`,
    );

    const primaryEmail = githubEmails.find((e: any) => e.primary && e.verified);

    if (!primaryEmail) {
      throw new UnauthorizedException(
        'Necesitas un email verificado en GitHub para iniciar sesión.',
      );
    }

    // 4. Resolver la cuenta usando nuestro servicio centralizado
    this.logger.debug(
      `[Flujo GitHub] Iniciando resolución de cuenta para el email: ${primaryEmail.email}`,
    );
    const identityId = await this.resolveOAuthAccountUseCase.execute({
      provider: 'GITHUB',
      providerAccountId: String(githubUser.id),
      email: primaryEmail.email,
      name: githubUser.name || githubUser.login,
      picture: githubUser.avatar_url,
      emailVerified: true,
      metadata: {
        login: githubUser.login,
        bio: githubUser.bio ?? null,
        blog: githubUser.blog || null,
        location: githubUser.location ?? null,
        company: githubUser.company ?? null,
        twitter_username: githubUser.twitter_username ?? null,
        public_repos: githubUser.public_repos,
      },
    });

    // 5. Crear el Ticket de Intercambio (SSO Exchange Ticket)
    this.logger.debug(
      `[Flujo GitHub] Cuenta resuelta/vinculada exitosamente (Identity ID: ${identityId}). Generando ticket temporal...`,
    );
    const rawTicket = this.tokenService.generateOpaqueToken();
    const ticketHash = this.tokenService.hashOpaqueToken(rawTicket);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Expira en 5 minutos

    await this.db.insert(ssoExchangeTickets).values({
      identityId,
      ticketHash,
      expiresAt,
    });

    return rawTicket; // Retornamos el ticket plano al controlador para que lo mande en la URL
  }
}
