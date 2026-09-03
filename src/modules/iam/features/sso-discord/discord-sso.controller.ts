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
import { ProcessDiscordLoginUseCase } from './process-discord-login.use-case';

@ApiTags('IAM / SSO / Discord')
@Controller('iam/sso/discord')
export class DiscordSsoController {
  constructor(
    private readonly configService: ConfigService,
    private readonly processDiscordLoginUseCase: ProcessDiscordLoginUseCase,
  ) {}

  @Public()
  @Get()
  @Redirect()
  @ApiOperation({
    summary: 'Iniciar flujo de OAuth con Discord',
    description:
      'Genera estado y PKCE, los guarda en cookies seguras HTTP-only y redirige al usuario a Discord.',
  })
  async login(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const clientId = this.configService.get<string>('app.discord.clientId');
    if (!clientId) {
      throw new Error('DISCORD_CLIENT_ID no configurado.');
    }

    const redirectUri =
      req.protocol +
      '://' +
      req.headers.host +
      '/api/v1/iam/sso/discord/callback';

    const state = oauth2.generateRandomState();
    const codeVerifier = oauth2.generateRandomCodeVerifier();
    const codeChallenge = await oauth2.calculatePKCECodeChallenge(codeVerifier);

    const isProd = process.env.NODE_ENV === 'production';
    const cookieOptions =
      'HttpOnly; Path=/; Max-Age=600; SameSite=Lax' +
      (isProd ? '; Secure' : '');

    res.header('Set-Cookie', [
      'discord_oauth_state=' + state + '; ' + cookieOptions,
      'discord_oauth_verifier=' + codeVerifier + '; ' + cookieOptions,
    ]);

    const authorizationUrl = new URL('https://discord.com/oauth2/authorize');
    authorizationUrl.searchParams.set('client_id', clientId);
    authorizationUrl.searchParams.set('redirect_uri', redirectUri);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('scope', 'identify email');
    authorizationUrl.searchParams.set('state', state);
    authorizationUrl.searchParams.set('code_challenge', codeChallenge);
    authorizationUrl.searchParams.set('code_challenge_method', 'S256');

    return { url: authorizationUrl.toString() };
  }

  @Public()
  @Get('callback')
  @Redirect()
  @ApiOperation({
    summary: 'Callback de Discord OAuth',
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

    if (error) {
      return {
        url:
          frontendUrl +
          '/auth/login?error=' +
          error +
          '&error_description=' +
          encodeURIComponent(errorDescription || 'Autenticacion cancelada'),
      };
    }

    const cookieHeader = req.headers.cookie || '';
    const getCookie = (name: string) => {
      const match = cookieHeader.match(
        new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'),
      );
      return match ? decodeURIComponent(match[3]) : undefined;
    };

    const stateCookie = getCookie('discord_oauth_state');
    const verifierCookie = getCookie('discord_oauth_verifier');

    if (!stateCookie || stateCookie !== state) {
      throw new UnauthorizedException(
        'El estado de OAuth es invalido o ha expirado.',
      );
    }

    if (!verifierCookie) {
      throw new UnauthorizedException(
        'El verificador PKCE es invalido o ha expirado.',
      );
    }

    if (!code) {
      return {
        url:
          frontendUrl +
          '/auth/login?error=missing_code&error_description=Discord+no+envio+el+codigo+de+autorizacion',
      };
    }

    const redirectUri =
      req.protocol +
      '://' +
      req.headers.host +
      '/api/v1/iam/sso/discord/callback';

    const currentUrl = new URL(
      req.url,
      req.protocol + '://' + req.headers.host,
    );

    const rawTicket = await this.processDiscordLoginUseCase.execute(
      currentUrl,
      stateCookie,
      verifierCookie,
      redirectUri,
    );

    const isProd = process.env.NODE_ENV === 'production';
    const clearOptions =
      'HttpOnly; Path=/; Max-Age=0; SameSite=Lax' + (isProd ? '; Secure' : '');
    res.header('Set-Cookie', [
      'discord_oauth_state=; ' + clearOptions,
      'discord_oauth_verifier=; ' + clearOptions,
    ]);

    return { url: frontendUrl + '/auth/sso/callback?ticket=' + rawTicket };
  }
}
