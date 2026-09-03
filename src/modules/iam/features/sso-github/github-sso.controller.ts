import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  Redirect,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import * as oauth2 from 'oauth4webapi';
import { Public } from '#common/decorators/public.decorator';
import { ProcessGithubLoginUseCase } from './process-github-login.use-case';

@ApiTags('IAM / SSO / GitHub')
@Controller('iam/sso/github')
export class GithubSsoController {
  constructor(
    private readonly configService: ConfigService,
    private readonly processGithubLoginUseCase: ProcessGithubLoginUseCase,
  ) {}

  @Public()
  @Get()
  @Redirect()
  @ApiOperation({
    summary: 'Iniciar flujo de OAuth con GitHub',
    description:
      'Genera estado y PKCE, los guarda en cookies seguras HTTP-only y redirige al usuario a GitHub.',
  })
  async login(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const clientId = this.configService.get<string>('app.github.clientId');
    if (!clientId) {
      throw new Error('GITHUB_CLIENT_ID no configurado.');
    }

    // El redirect URI debe ser el de este backend, no el frontend.
    const redirectUri = `${req.protocol}://${req.headers.host}/api/v1/iam/sso/github/callback`;

    const state = oauth2.generateRandomState();
    const codeVerifier = oauth2.generateRandomCodeVerifier();
    const codeChallenge = await oauth2.calculatePKCECodeChallenge(codeVerifier);

    const isProd = process.env.NODE_ENV === 'production';
    const cookieOptions = `HttpOnly; Path=/; Max-Age=600; SameSite=Lax${isProd ? '; Secure' : ''}`;

    res.header('Set-Cookie', [
      `github_oauth_state=${state}; ${cookieOptions}`,
      `github_oauth_verifier=${codeVerifier}; ${cookieOptions}`,
    ]);

    const authorizationUrl = new URL(
      'https://github.com/login/oauth/authorize',
    );
    authorizationUrl.searchParams.set('client_id', clientId);
    authorizationUrl.searchParams.set('redirect_uri', redirectUri);
    authorizationUrl.searchParams.set('scope', 'user:email');
    authorizationUrl.searchParams.set('state', state);
    authorizationUrl.searchParams.set('code_challenge', codeChallenge);
    authorizationUrl.searchParams.set('code_challenge_method', 'S256');

    return { url: authorizationUrl.toString() };
  }

  @Public()
  @Get('callback')
  @Redirect()
  @ApiOperation({
    summary: 'Callback de GitHub OAuth',
    description:
      'Intercambia el code por el Access Token, obtiene usuario, genera un ticket temporal y redirige al Frontend.',
  })
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const frontendUrl = this.configService.get<string>('app.frontendUrl');

    // Manejar caso donde el usuario cancela la autorización
    if (error) {
      return {
        url: `${frontendUrl}/auth/login?error=${error}&error_description=${encodeURIComponent(errorDescription || 'Autenticación cancelada')}`,
      };
    }

    const cookieHeader = req.headers.cookie || '';
    const getCookie = (name: string) => {
      const match = cookieHeader.match(
        new RegExp(`(^|;\\s*)(${name})=([^;]*)`),
      );
      return match ? decodeURIComponent(match[3]) : undefined;
    };

    const stateCookie = getCookie('github_oauth_state');
    const verifierCookie = getCookie('github_oauth_verifier');

    if (!stateCookie || stateCookie !== state) {
      throw new UnauthorizedException(
        'El estado de OAuth es inválido o ha expirado.',
      );
    }

    if (!verifierCookie) {
      throw new UnauthorizedException(
        'El verificador PKCE es inválido o ha expirado.',
      );
    }

    if (!code) {
      return {
        url: `${frontendUrl}/auth/login?error=missing_code&error_description=GitHub+no+envió+el+código+de+autorización`,
      };
    }

    // El redirect URI usado en el login para que haga match en el token exchange
    const redirectUri = `${req.protocol}://${req.headers.host}/api/v1/iam/sso/github/callback`;

    const currentUrl = new URL(
      req.url,
      `${req.protocol}://${req.headers.host}`,
    );

    // Procesar el login
    const rawTicket = await this.processGithubLoginUseCase.execute(
      currentUrl,
      stateCookie, // stateCookie original validado
      verifierCookie,
      redirectUri,
    );

    // Limpiar cookies
    const isProd = process.env.NODE_ENV === 'production';
    const clearOptions = `HttpOnly; Path=/; Max-Age=0; SameSite=Lax${isProd ? '; Secure' : ''}`;
    res.header('Set-Cookie', [
      `github_oauth_state=; ${clearOptions}`,
      `github_oauth_verifier=; ${clearOptions}`,
    ]);

    // Redirigir al frontend SPA con el ticket temporal
    // Asumimos que el frontend tiene una ruta /auth/sso/callback para recibir el ticket
    return { url: `${frontendUrl}/auth/sso/callback?ticket=${rawTicket}` };
  }
}
