import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'required_permissions';

/**
 * Decorador que marca un endpoint con los permisos requeridos.
 * El PermissionsGuard leerá estos metadatos para verificar el acceso.
 *
 * @example
 * @RequirePermissions('delete:sessions')
 * @Delete('others')
 * async revokeOtherSessions() { ... }
 *
 * @example (lógica AND: el usuario debe tener TODOS)
 * @RequirePermissions('read:users', 'update:users')
 * @Patch(':id')
 * async updateUser() { ... }
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
