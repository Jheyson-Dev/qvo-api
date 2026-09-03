import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const SessionResponseSchema = z
  .object({
    id: z.string().uuid(),
    ipAddress: z.string(),
    userAgent: z.string(),
    platform: z.string().nullable(),
    city: z.string().nullable(),
    country: z.string().nullable(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    createdAt: z.string().datetime().nullable(), // JSON serializa Date → ISO string
    lastUsedAt: z.string().datetime().nullable(),
    isCurrent: z.boolean(),
  })
  .meta({ id: 'SessionResponse' });

export class SessionResponseDto extends createZodDto(SessionResponseSchema) {}
