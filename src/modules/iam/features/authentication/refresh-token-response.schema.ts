import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const RefreshTokenResponseSchema = z
  .object({
    accessToken: z.string(),
    refreshToken: z.string(),
  })

export class RefreshTokenResponseDto extends createZodDto(
  RefreshTokenResponseSchema,
) {}
