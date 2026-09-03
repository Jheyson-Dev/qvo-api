import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const UserProfileResponseSchema = z
  .object({
    identityId: z.string().uuid(),
    email: z.string().email(),
    username: z.string(),
    displayName: z.string(),
    emailVerified: z.boolean().nullable(),
    hasMfaEnabled: z.boolean(),
  })
  .meta({ id: 'UserProfileResponse' });

export class UserProfileResponseDto extends createZodDto(
  UserProfileResponseSchema,
) {}
