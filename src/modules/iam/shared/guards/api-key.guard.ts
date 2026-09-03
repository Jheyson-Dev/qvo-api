import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { DB_CONNECTION } from '#database/database.constants';
import type { DrizzleDb } from '#database/database.types';
import { TokenService } from '#common/security';
import { ApiClientsRepository } from '#modules/iam/shared/repositories/api-clients.repository';
import type {
  ApiClientPayload,
  JwtPayload,
} from '#modules/iam/shared/types/jwt-payload.type';

// Mensaje genérico intencionalmente ambiguo para evitar enumeración de clientes
const INVALID_API_KEY_MSG = 'API Key inválida o expirada.';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly apiClientsRepository: ApiClientsRepository,
    private readonly tokenService: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    // 1. Leer el header x-api-key
    const rawKey = request.headers['x-api-key'];
    if (!rawKey || typeof rawKey !== 'string') {
      throw new UnauthorizedException('API Key no proporcionada.');
    }

    // 2. Separar clientId y secret por el primer '.'
    //    Formato: qvo_client_<hex>.<secret_hex>
    const dotIndex = rawKey.indexOf('.');
    if (dotIndex === -1) {
      throw new UnauthorizedException('Formato de API Key inválido.');
    }

    const clientId = rawKey.slice(0, dotIndex);
    const secret = rawKey.slice(dotIndex + 1);

    if (!clientId || !secret) {
      throw new UnauthorizedException('Formato de API Key inválido.');
    }

    // 3. Lookup O(1) por clientId (UNIQUE index en BD)
    const record = await this.apiClientsRepository.findByClientId(
      this.db,
      clientId,
    );

    // Anti-enumeración: mismo mensaje para "no existe" y "hash incorrecto"
    if (!record) {
      throw new UnauthorizedException(INVALID_API_KEY_MSG);
    }

    // 4. Verificar expiración si aplica
    if (record.expiresAt && record.expiresAt <= new Date()) {
      throw new UnauthorizedException(INVALID_API_KEY_MSG);
    }

    // 5. Validar el hash del secret
    const secretHash = this.tokenService.hashOpaqueToken(secret);
    if (secretHash !== record.secretHash) {
      throw new UnauthorizedException(INVALID_API_KEY_MSG);
    }

    // 6. Actualizar lastUsedAt en segundo plano (Fire & Forget)
    void this.apiClientsRepository.updateLastUsed(this.db, clientId);

    // 7. Inyectar payload en request.user para compatibilidad con @CurrentUser() y PermissionsGuard
    const payload: ApiClientPayload = {
      type: 'API_CLIENT',
      sub: record.identityId,
      clientId,
    };

    (request as FastifyRequest & { user?: JwtPayload }).user = payload;

    return true;
  }
}
