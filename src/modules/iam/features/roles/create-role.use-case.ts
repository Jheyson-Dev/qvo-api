import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { DB_CONNECTION } from '#database/database.constants';
import type { DrizzleDb } from '#database/database.types';
import { RolesRepository } from '#modules/iam/shared/repositories/roles.repository';

@Injectable()
export class CreateRoleUseCase {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly rolesRepository: RolesRepository,
  ) {}

  async execute(data: {
    name: string;
    description?: string;
    permissionIds: string[];
  }): Promise<{ id: string }> {
    // 1. Validar que no exista un rol con el mismo nombre
    const existing = await this.rolesRepository.findRoleByName(
      this.db,
      data.name,
    );
    if (existing) {
      throw new ConflictException(
        `Ya existe un rol con el nombre '${data.name}'`,
      );
    }

    // 2. Crear rol y asignar permisos en transacción
    const roleId = await this.db.transaction(async (tx) => {
      return this.rolesRepository.createRole(tx, data);
    });

    return { id: roleId };
  }
}
