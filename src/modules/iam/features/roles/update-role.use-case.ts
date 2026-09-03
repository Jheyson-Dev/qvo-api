import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DB_CONNECTION } from '#database/database.constants';
import type { DrizzleDb } from '#database/database.types';
import { RolesRepository } from '#modules/iam/shared/repositories/roles.repository';

@Injectable()
export class UpdateRoleUseCase {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly rolesRepository: RolesRepository,
  ) {}

  async execute(
    roleId: string,
    data: { name?: string; description?: string; permissionIds?: string[] },
  ): Promise<void> {
    // 1. Validar existencia
    const role = await this.rolesRepository.findRoleById(this.db, roleId);
    if (!role) {
      throw new NotFoundException(`Rol con ID '${roleId}' no encontrado`);
    }

    // 2. Validar colisión de nombre si se está cambiando
    if (data.name && data.name.toLowerCase() !== role.name.toLowerCase()) {
      const existing = await this.rolesRepository.findRoleByName(
        this.db,
        data.name,
      );
      if (existing) {
        throw new ConflictException(
          `Ya existe un rol con el nombre '${data.name}'`,
        );
      }
    }

    // 3. Actualizar en transacción (Replace strategy para permisos)
    await this.db.transaction(async (tx) => {
      await this.rolesRepository.updateRole(tx, roleId, data);
    });
  }
}
