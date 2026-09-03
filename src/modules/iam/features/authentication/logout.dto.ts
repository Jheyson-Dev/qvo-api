import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const LogoutSchema = z.object({
  refreshToken: z.string().min(1, 'El refreshToken es requerido.'),
});

export class LogoutDto extends createZodDto(LogoutSchema) {}
