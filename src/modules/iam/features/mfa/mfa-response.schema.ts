import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const MfaSetupResponseSchema = z
  .object({
    secret: z.string(),
    otpauthUrl: z.string(),
  })
  .meta({ id: 'MfaSetupResponse' });

export class MfaSetupResponseDto extends createZodDto(MfaSetupResponseSchema) {}

export const MfaEnableResponseSchema = z
  .object({
    backupCodes: z.array(z.string()),
  })
  .meta({ id: 'MfaEnableResponse' });

export class MfaEnableResponseDto extends createZodDto(
  MfaEnableResponseSchema,
) {}
