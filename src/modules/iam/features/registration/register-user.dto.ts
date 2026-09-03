import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const registerUserSchema = z.object({
  email: z
    .string()
    .email({ message: 'El formato del correo electrónico es inválido' }),
  password: z
    .string()
    .min(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/, {
      message:
        'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
    }),
  username: z
    .string()
    .min(3, {
      message: 'El nombre de usuario debe tener al menos 3 caracteres',
    })
    .regex(/^[a-zA-Z0-9_-]+$/, {
      message:
        'El nombre de usuario solo puede contener letras, números, guiones y guiones bajos',
    }),
  displayName: z.string().min(2, {
    message: 'El nombre para mostrar debe tener al menos 2 caracteres',
  }),
});

export class RegisterUserDto extends createZodDto(registerUserSchema) {}
