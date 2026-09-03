import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '#modules/iam/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '#modules/iam/shared/guards/permissions.guard';
import { RequirePermissions } from '#common/decorators/require-permissions.decorator';
import { ListPermissionsUseCase } from './list-permissions.use-case';
import { ListRolesUseCase } from './list-roles.use-case';
import { CreateRoleUseCase } from './create-role.use-case';
import { UpdateRoleUseCase } from './update-role.use-case';
import { DeleteRoleUseCase } from './delete-role.use-case';
import { AssignRoleToIdentityUseCase } from './assign-role-to-identity.use-case';
import { RevokeRoleFromIdentityUseCase } from './revoke-role-from-identity.use-case';
import { ListRolesForIdentityUseCase } from './list-roles-for-identity.use-case';
import { CreateRoleDto, UpdateRoleDto, AssignRoleDto } from './roles.dto';

@ApiTags('IAM / Roles & Permissions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('iam')
export class RolesController {
  constructor(
    private readonly listPermissionsUseCase: ListPermissionsUseCase,
    private readonly listRolesUseCase: ListRolesUseCase,
    private readonly createRoleUseCase: CreateRoleUseCase,
    private readonly updateRoleUseCase: UpdateRoleUseCase,
    private readonly deleteRoleUseCase: DeleteRoleUseCase,
    private readonly assignRoleToIdentityUseCase: AssignRoleToIdentityUseCase,
    private readonly revokeRoleFromIdentityUseCase: RevokeRoleFromIdentityUseCase,
    private readonly listRolesForIdentityUseCase: ListRolesForIdentityUseCase,
  ) {}

  // =========================================================================
  // PERMISSIONS
  // =========================================================================

  @Get('permissions')
  @RequirePermissions('read:permissions')
  @ApiOperation({ summary: 'Listar todos los permisos del sistema' })
  async listPermissions() {
    return this.listPermissionsUseCase.execute();
  }

  // =========================================================================
  // ROLES
  // =========================================================================

  @Get('roles')
  @RequirePermissions('read:roles')
  @ApiOperation({ summary: 'Listar todos los roles y sus permisos' })
  async listRoles() {
    return this.listRolesUseCase.execute();
  }

  @Post('roles')
  @RequirePermissions('create:roles')
  @ApiOperation({ summary: 'Crear un nuevo rol' })
  async createRole(@Body() dto: CreateRoleDto) {
    return this.createRoleUseCase.execute(dto);
  }

  @Patch('roles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('update:roles')
  @ApiOperation({ summary: 'Actualizar un rol y/o sus permisos' })
  async updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    await this.updateRoleUseCase.execute(id, dto);
  }

  @Delete('roles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('delete:roles')
  @ApiOperation({ summary: 'Eliminar un rol' })
  async deleteRole(@Param('id') id: string) {
    await this.deleteRoleUseCase.execute(id);
  }

  // =========================================================================
  // ASSIGNMENTS
  // =========================================================================

  @Get('identities/:identityId/roles')
  @RequirePermissions('read:roles')
  @ApiOperation({ summary: 'Listar roles de una identidad' })
  async listRolesForIdentity(@Param('identityId') identityId: string) {
    return this.listRolesForIdentityUseCase.execute(identityId);
  }

  @Post('identities/:identityId/roles')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('assign:roles')
  @ApiOperation({ summary: 'Asignar un rol a una identidad' })
  async assignRole(
    @Param('identityId') identityId: string,
    @Body() dto: AssignRoleDto,
  ) {
    await this.assignRoleToIdentityUseCase.execute(identityId, dto.roleId);
  }

  @Delete('identities/:identityId/roles/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('assign:roles') // Misma UI para asignar/revocar
  @ApiOperation({ summary: 'Revocar un rol a una identidad' })
  async revokeRole(
    @Param('identityId') identityId: string,
    @Param('roleId') roleId: string,
  ) {
    await this.revokeRoleFromIdentityUseCase.execute(identityId, roleId);
  }
}
