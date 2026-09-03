import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ExchangeTicketSchema = z.object({
  ticket: z
    .string()
    .min(1, 'El ticket es obligatorio.')
    .max(255, 'El ticket es muy largo.'),
});

export class ExchangeTicketDto extends createZodDto(ExchangeTicketSchema) {}
