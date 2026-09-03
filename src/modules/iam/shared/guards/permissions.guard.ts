import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { PERMISSIONS_KEY } from '#common/decorators/require-permissions.decorator';
import { DB_CONNECTION } from '#database/database.constants';
import type { DrizzleDb } from '#database/database.types';
import type { JwtPayload } from '#modules/iam/shared/types/jwt-payload.type';
import { PermissionsRepository } from '#modules/iam/shared/repositories/permissions.repository';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly permissionsRepository: PermissionsRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Extraer los permisos requeridos por el decorador @RequirePermissions(...)
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 2. Cortocircuito: si el endpoint no tiene el decorador, no consultar la BD
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // 3. Obtener el usuario del request (ya adjuntado por JwtAuthGuard)
    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user?: JwtPayload }>();
    const user = request.user;

    if (!user?.sub) {
      throw new ForbiddenException(
        'No se pudo determinar la identidad del usuario.',
      );
    }

    // 4. Consultar todos los permisos que tiene este usuario a través de sus roles
    const userPermissions =
      await this.permissionsRepository.findPermissionsForIdentity(
        this.db,
        user.sub,
      );

    // 5. Lógica AND: el usuario debe tener TODOS los permisos requeridos
    const hasAllPermissions = requiredPermissions.every((requiredPerm) =>
      userPermissions.includes(requiredPerm),
    );

    if (!hasAllPermissions) {
      // Calculamos cuáles le faltan para dar un mensaje de error útil en desarrollo
      const missingPermissions = requiredPermissions.filter(
        (p) => !userPermissions.includes(p),
      );
      throw new ForbiddenException(
        `Acceso denegado. Permisos faltantes: [${missingPermissions.join(', ')}]`,
      );
    }

    return true;
  }
}
