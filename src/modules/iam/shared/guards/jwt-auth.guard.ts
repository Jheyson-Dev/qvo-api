import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { FastifyRequest } from 'fastify';
import type {
  JwtPayload,
  HumanJwtPayload,
} from '#modules/iam/shared/types/jwt-payload.type';
import { DB_CONNECTION } from '#database/database.constants';
import type { DrizzleDb } from '#database/database.types';
import { SessionsRepository } from '#modules/iam/shared/repositories/sessions.repository';
import { IS_PUBLIC_KEY } from '#common/decorators/public.decorator';

/** Tipo del JWT "crudo" emitido por el flujo HUMAN, sin el discriminador 'type' */
type RawHumanJwtPayload = Omit<HumanJwtPayload, 'type'>;

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly sessionsRepository: SessionsRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token de acceso no proporcionado.');
    }

    try {
      const secret = this.configService.get<string>('app.jwt.secret');
      const issuer = this.configService.get<string>('app.jwt.issuer');
      const audience = this.configService.get<string>('app.jwt.audience');
      // Verificamos como RawHumanJwtPayload (sin el campo 'type') porque los JWT
      // existentes no lo incluyen — lo añadimos nosotros al inyectar en request.user
      const payload = await this.jwtService.verifyAsync<RawHumanJwtPayload>(
        token,
        {
          secret,
          issuer,
          audience,
        },
      );

      // Tokens JWT válidos vienen del flujo HUMAN: email + username + sessionId
      // Los tokens sin sessionId son tokens MFA temporales, no son válidos aquí
      if (!payload.sessionId) {
        throw new UnauthorizedException(
          'Token obsoleto o inválido (sin sesión).',
        );
      }

      const session = await this.sessionsRepository.findById(
        this.db,
        payload.sessionId,
      );

      if (!session) {
        throw new UnauthorizedException('La sesión ya no existe.');
      }

      if (session.revoked) {
        throw new UnauthorizedException('La sesión ha sido revocada.');
      }

      if (session.expiresAt && session.expiresAt <= new Date()) {
        throw new UnauthorizedException('La sesión ha expirado.');
      }

      // Construir HumanJwtPayload explícitamente para evitar conflicto de 'type'
      const humanPayload: HumanJwtPayload = {
        type: 'HUMAN',
        sub: payload.sub,
        email: payload.email,
        username: payload.username,
        sessionId: payload.sessionId,
        iat: payload.iat,
        exp: payload.exp,
      };

      (request as FastifyRequest & { user?: JwtPayload }).user = humanPayload;
    } catch {
      throw new UnauthorizedException('Token de acceso inválido o expirado.');
    }

    return true;
  }

  private extractTokenFromHeader(request: FastifyRequest): string | undefined {
    const authorization = request.headers.authorization;
    if (!authorization) {
      return undefined;
    }

    const [type, token] = authorization.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
