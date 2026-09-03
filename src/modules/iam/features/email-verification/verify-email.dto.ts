import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const VerifyEmailSchema = z.object({
  token: z.string().min(1, 'El token es requerido'),
});

export class VerifyEmailDto extends createZodDto(VerifyEmailSchema) {}
