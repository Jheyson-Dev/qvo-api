import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  identityRoles,
  roles,
  rolePermissions,
  permissions,
} from '#database/schema';
import type { DbOrTx } from '#database/database.types';

@Injectable()
export class PermissionsRepository {
  /**
   * Obtiene todos los permisos asignados a una identidad a través de sus roles.
   * Ejecuta un JOIN de 4 tablas en una sola query optimizada.
   * Devuelve un array de strings en formato "action:resource" (ej. "delete:sessions").
   */
  async findPermissionsForIdentity(
    db: DbOrTx,
    identityId: string,
  ): Promise<string[]> {
    const rows = await db
      .select({ name: permissions.name })
      .from(identityRoles)
      .innerJoin(roles, eq(identityRoles.roleId, roles.id))
      .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(identityRoles.identityId, identityId));

    return rows.map((row) => row.name);
  }
}
