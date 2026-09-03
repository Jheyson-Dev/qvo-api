import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DB_CONNECTION } from '#database/database.constants';
import type { DrizzleDb } from '#database/database.types';
import { RolesRepository } from '#modules/iam/shared/repositories/roles.repository';

@Injectable()
export class RevokeRoleFromIdentityUseCase {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly rolesRepository: RolesRepository,
  ) {}

  async execute(identityId: string, roleId: string): Promise<void> {
    // Es idempotente, si no existe no falla
    await this.rolesRepository.revokeRoleFromIdentity(
      this.db,
      identityId,
      roleId,
    );
  }
}
