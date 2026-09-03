import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'El token es requerido'),
  newPassword: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe incluir al menos una letra mayúscula')
    .regex(/[0-9]/, 'Debe incluir al menos un número'),
});

export class ResetPasswordDto extends createZodDto(ResetPasswordSchema) {}
