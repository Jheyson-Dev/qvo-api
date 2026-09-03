import { Injectable } from '@nestjs/common';
import { eq, inArray, sql } from 'drizzle-orm';
import {
  identityRoles,
  roles,
  rolePermissions,
  permissions,
} from '#database/schema';
import type { DbOrTx, DrizzleTx } from '#database/database.types';

export type PermissionRecord = {
  id: string;
  name: string;
  description: string | null;
  resource: string;
  action: string;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type RoleRecord = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type RoleWithPermissions = RoleRecord & {
  permissions: PermissionRecord[];
};

@Injectable()
export class RolesRepository {
  /**
   * Listar todos los permisos disponibles en el sistema.
   */
  async listPermissions(db: DbOrTx): Promise<PermissionRecord[]> {
    return db
      .select()
      .from(permissions)
      .orderBy(permissions.resource, permissions.action);
  }

  /**
   * Listar todos los roles con sus permisos asociados.
   */
  async listRoles(db: DbOrTx): Promise<RoleWithPermissions[]> {
    const allRoles = await db.select().from(roles).orderBy(roles.name);

    if (allRoles.length === 0) {
      return [];
    }

    const roleIds = allRoles.map((r) => r.id);

    // Obtener los permisos de estos roles
    const perms = await db
      .select({
        roleId: rolePermissions.roleId,
        permission: permissions,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(inArray(rolePermissions.roleId, roleIds));

    // Agrupar
    return allRoles.map((role) => ({
      ...role,
      permissions: perms
        .filter((p) => p.roleId === role.id)
        .map((p) => p.permission),
    }));
  }

  /**
   * Buscar un rol por ID con sus permisos.
   */
  async findRoleById(
    db: DbOrTx,
    roleId: string,
  ): Promise<RoleWithPermissions | null> {
    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    if (!role) {
      return null;
    }

    const perms = await db
      .select({
        permission: permissions,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId));

    return {
      ...role,
      permissions: perms.map((p) => p.permission),
    };
  }

  /**
   * Buscar un rol por nombre (case-insensitive para uniqueness).
   */
  async findRoleByName(db: DbOrTx, name: string): Promise<RoleRecord | null> {
    const [role] = await db
      .select()
      .from(roles)
      .where(sql`LOWER(${roles.name}) = LOWER(${name})`)
      .limit(1);

    return role ?? null;
  }

  /**
   * Crear un rol y asignarle permisos en una transacción.
   */
  async createRole(
    tx: DrizzleTx,
    data: { name: string; description?: string; permissionIds: string[] },
  ): Promise<string> {
    const [role] = await tx
      .insert(roles)
      .values({
        name: data.name,
        description: data.description ?? null,
      })
      .returning({ id: roles.id });

    if (data.permissionIds.length > 0) {
      const inserts = data.permissionIds.map((permId) => ({
        roleId: role.id,
        permissionId: permId,
      }));
      await tx.insert(rolePermissions).values(inserts);
    }

    return role.id;
  }

  /**
   * Actualizar nombre, descripción y/o permisos. (Replace strategy).
   */
  async updateRole(
    tx: DrizzleTx,
    roleId: string,
    data: { name?: string; description?: string; permissionIds?: string[] },
  ): Promise<void> {
    const updates: Partial<typeof roles.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;

    if (Object.keys(updates).length > 1) {
      await tx.update(roles).set(updates).where(eq(roles.id, roleId));
    }

    if (data.permissionIds !== undefined) {
      // Estrategia REPLACE: Borrar todos y re-insertar
      await tx
        .delete(rolePermissions)
        .where(eq(rolePermissions.roleId, roleId));

      if (data.permissionIds.length > 0) {
        const inserts = data.permissionIds.map((permId) => ({
          roleId,
          permissionId: permId,
        }));
        await tx.insert(rolePermissions).values(inserts);
      }
    }
  }

  /**
   * Eliminar un rol. Debe llamarse dentro de una TX que haya borrado hijos primero.
   */
  async deleteRole(tx: DrizzleTx, roleId: string): Promise<void> {
    await tx.delete(roles).where(eq(roles.id, roleId));
  }

  /**
   * Eliminar permisos de un rol. Para borrado en cascada manual.
   */
  async deleteRolePermissions(tx: DrizzleTx, roleId: string): Promise<void> {
    await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
  }

  /**
   * Eliminar asignaciones de un rol. Para borrado en cascada manual.
   */
  async deleteIdentityRoles(tx: DrizzleTx, roleId: string): Promise<void> {
    await tx.delete(identityRoles).where(eq(identityRoles.roleId, roleId));
  }

  // =========================================================================
  // GESTIÓN DE ASIGNACIONES (identity_roles)
  // =========================================================================

  /**
   * Listar roles asignados a una identidad concreta.
   */
  async listRolesForIdentity(
    db: DbOrTx,
    identityId: string,
  ): Promise<RoleRecord[]> {
    const rows = await db
      .select({ role: roles })
      .from(identityRoles)
      .innerJoin(roles, eq(identityRoles.roleId, roles.id))
      .where(eq(identityRoles.identityId, identityId));

    return rows.map((r) => r.role);
  }

  /**
   * Asignar un rol a una identidad (idempotente).
   */
  async assignRoleToIdentity(
    db: DbOrTx,
    identityId: string,
    roleId: string,
  ): Promise<void> {
    await db
      .insert(identityRoles)
      .values({ identityId, roleId })
      .onConflictDoNothing({
        target: [identityRoles.identityId, identityRoles.roleId],
      });
  }

  /**
   * Revocar un rol de una identidad (idempotente).
   */
  async revokeRoleFromIdentity(
    db: DbOrTx,
    identityId: string,
    roleId: string,
  ): Promise<void> {
    await db
      .delete(identityRoles)
      .where(
        sql`${identityRoles.identityId} = ${identityId} AND ${identityRoles.roleId} = ${roleId}`,
      );
  }
}
