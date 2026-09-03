import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const RequestPasswordResetSchema = z.object({
  email: z.string().email('El correo electrónico no es válido'),
});

export class RequestPasswordResetDto extends createZodDto(
  RequestPasswordResetSchema,
) {}
