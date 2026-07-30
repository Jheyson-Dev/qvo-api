import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .email({ message: 'El formato del correo electrónico es inválido' }),
  password: z.string().min(1, { message: 'La contraseña es requerida' }),
});

export class LoginDto extends createZodDto(loginSchema) {}
