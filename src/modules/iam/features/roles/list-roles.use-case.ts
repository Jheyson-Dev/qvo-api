import { Injectable, Inject } from '@nestjs/common';
import { DB_CONNECTION } from '#database/database.constants';
import type { DrizzleDb } from '#database/database.types';
import {
  RolesRepository,
  type RoleWithPermissions,
} from '#modules/iam/shared/repositories/roles.repository';

@Injectable()
export class ListRolesUseCase {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly rolesRepository: RolesRepository,
  ) {}

  async execute(): Promise<RoleWithPermissions[]> {
    return this.rolesRepository.listRoles(this.db);
  }
}
