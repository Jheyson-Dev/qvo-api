import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DB_CONNECTION } from '#database/database.constants';
import type { DrizzleDb } from '#database/database.types';
import { RolesRepository } from '#modules/iam/shared/repositories/roles.repository';

@Injectable()
export class DeleteRoleUseCase {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly rolesRepository: RolesRepository,
  ) {}

  async execute(roleId: string): Promise<void> {
    // 1. Validar que exista
    const role = await this.rolesRepository.findRoleById(this.db, roleId);
    if (!role) {
      throw new NotFoundException(`Rol con ID '${roleId}' no encontrado`);
    }

    // 2. Eliminar en transacción (primero dependencias, luego el rol)
    // Esto asegura que funcione aunque la BD no tenga ON DELETE CASCADE
    await this.db.transaction(async (tx) => {
      await this.rolesRepository.deleteRolePermissions(tx, roleId);
      await this.rolesRepository.deleteIdentityRoles(tx, roleId);
      await this.rolesRepository.deleteRole(tx, roleId);
    });
  }
}
