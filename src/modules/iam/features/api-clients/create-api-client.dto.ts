import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateApiClientSchema = z.object({
  name: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre no puede superar 100 caracteres'),
});

export class CreateApiClientDto extends createZodDto(CreateApiClientSchema) {}
