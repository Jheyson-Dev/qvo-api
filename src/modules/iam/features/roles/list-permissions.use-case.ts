import { Injectable, Inject } from '@nestjs/common';
import { DB_CONNECTION } from '#database/database.constants';
import type { DrizzleDb } from '#database/database.types';
import {
  RolesRepository,
  type PermissionRecord,
} from '#modules/iam/shared/repositories/roles.repository';

@Injectable()
export class ListPermissionsUseCase {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly rolesRepository: RolesRepository,
  ) {}

  async execute(): Promise<PermissionRecord[]> {
    return this.rolesRepository.listPermissions(this.db);
  }
}
