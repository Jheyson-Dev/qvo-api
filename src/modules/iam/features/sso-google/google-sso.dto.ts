import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const GoogleSsoSchema = z.object({
  idToken: z.string().min(1, 'El idToken de Google es requerido'),
});

export class GoogleSsoDto extends createZodDto(GoogleSsoSchema) {}
