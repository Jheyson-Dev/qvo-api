import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ──────────────────────────────────────────────────────────────────────────────
// Shared sub-schemas
// ──────────────────────────────────────────────────────────────────────────────
const UserInfoSchema = z
  .object({
    identityId: z.string().uuid(),
    email: z.string().email(),
    username: z.string(),
    displayName: z.string(),
    emailVerified: z.boolean().nullable(),
  })
  .meta({ id: 'UserInfo' });

// ──────────────────────────────────────────────────────────────────────────────
// Login responses — compartidos entre AuthController, GoogleSsoController y MfaController
// ──────────────────────────────────────────────────────────────────────────────
export const LoginResponseSchema = z
  .object({
    mfaRequired: z.literal(false),
    accessToken: z.string(),
    refreshToken: z.string(),
    user: UserInfoSchema,
  })
  .meta({ id: 'LoginResponse' });

export class LoginResponseDto extends createZodDto(LoginResponseSchema) {}

export const MfaChallengeResponseSchema = z
  .object({
    mfaRequired: z.literal(true),
    mfaToken: z.string(),
  })
  .meta({ id: 'MfaChallengeResponse' });

export class MfaChallengeResponseDto extends createZodDto(
  MfaChallengeResponseSchema,
) {}
