import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DB_CONNECTION } from '#database/database.constants';
import type { DrizzleDb } from '#database/database.types';
import { RolesRepository } from '#modules/iam/shared/repositories/roles.repository';
import { IdentitiesRepository } from '#modules/iam/shared/repositories/identities.repository';

@Injectable()
export class AssignRoleToIdentityUseCase {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly rolesRepository: RolesRepository,
    private readonly identitiesRepository: IdentitiesRepository,
  ) {}

  async execute(identityId: string, roleId: string): Promise<void> {
    // 1. Validar existencia de identidad
    const identity = await this.identitiesRepository.findById(
      this.db,
      identityId,
    );
    if (!identity) {
      throw new NotFoundException(
        `Identidad con ID '${identityId}' no encontrada`,
      );
    }

    // 2. Validar existencia de rol
    const role = await this.rolesRepository.findRoleById(this.db, roleId);
    if (!role) {
      throw new NotFoundException(`Rol con ID '${roleId}' no encontrado`);
    }

    // 3. Asignar (idempotente)
    await this.rolesRepository.assignRoleToIdentity(
      this.db,
      identityId,
      roleId,
    );
  }
}
