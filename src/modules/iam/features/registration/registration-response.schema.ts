import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const RegisteredUserResponseSchema = z
  .object({
    identityId: z.string().uuid(),
    email: z.string().email(),
    username: z.string(),
    displayName: z.string(),
    emailVerified: z.boolean().nullable(),
    createdAt: z.string().datetime(), // JSON serializa Date → ISO string
  })
  .meta({ id: 'RegisteredUserResponse' });

export class RegisteredUserResponseDto extends createZodDto(
  RegisteredUserResponseSchema,
) {}
