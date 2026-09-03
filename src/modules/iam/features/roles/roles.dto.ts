import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// POST /iam/roles
const CreateRoleSchema = z.object({
  name: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre no puede superar los 100 caracteres'),
  description: z.string().max(500).optional(),
  permissionIds: z.array(z.string().uuid('ID de permiso inválido')),
});

export class CreateRoleDto extends createZodDto(CreateRoleSchema) {}

// PATCH /iam/roles/:id
const UpdateRoleSchema = z.object({
  name: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre no puede superar los 100 caracteres')
    .optional(),
  description: z.string().max(500).optional(),
  permissionIds: z.array(z.string().uuid('ID de permiso inválido')).optional(),
});

export class UpdateRoleDto extends createZodDto(UpdateRoleSchema) {}

// POST /iam/identities/:id/roles
const AssignRoleSchema = z.object({
  roleId: z.string().uuid('ID de rol inválido'),
});

export class AssignRoleDto extends createZodDto(AssignRoleSchema) {}
