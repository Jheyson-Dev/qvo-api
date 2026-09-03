import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DB_CONNECTION } from '#database/database.constants';
import type { DrizzleDb } from '#database/database.types';
import {
  RolesRepository,
  type RoleRecord,
} from '#modules/iam/shared/repositories/roles.repository';
import { IdentitiesRepository } from '#modules/iam/shared/repositories/identities.repository';

@Injectable()
export class ListRolesForIdentityUseCase {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly rolesRepository: RolesRepository,
    private readonly identitiesRepository: IdentitiesRepository,
  ) {}

  async execute(identityId: string): Promise<RoleRecord[]> {
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

    return this.rolesRepository.listRolesForIdentity(this.db, identityId);
  }
}
