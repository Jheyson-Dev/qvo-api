import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const MfaCodeSchema = z.object({
  code: z
    .string()
    .length(6, 'El código TOTP debe tener exactamente 6 dígitos')
    .regex(/^\d+$/, 'El código TOTP solo puede contener dígitos'),
});

export class MfaCodeDto extends createZodDto(MfaCodeSchema) {}

const MfaVerifySchema = z.object({
  mfaToken: z.string().min(1, 'El token MFA es requerido'),
  code: z
    .string()
    .length(6, 'El código TOTP debe tener exactamente 6 dígitos')
    .regex(/^\d+$/, 'El código TOTP solo puede contener dígitos'),
  fingerprint: z.string().max(255).optional(),
});

export class MfaVerifyDto extends createZodDto(MfaVerifySchema) {}

const MfaLoginBackupSchema = z.object({
  mfaToken: z.string().min(1, 'El token MFA es requerido'),
  code: z
    .string()
    .length(8, 'El código de respaldo debe tener exactamente 8 caracteres')
    .regex(
      /^[A-Za-z0-9]+$/,
      'El código de respaldo solo puede contener letras y números',
    ),
  fingerprint: z.string().max(255).optional(),
});

export class MfaLoginBackupDto extends createZodDto(MfaLoginBackupSchema) {}

const MfaDisableBackupSchema = z.object({
  code: z
    .string()
    .length(8, 'El código de respaldo debe tener exactamente 8 caracteres')
    .regex(
      /^[A-Za-z0-9]+$/,
      'El código de respaldo solo puede contener letras y números',
    ),
});

export class MfaDisableBackupDto extends createZodDto(MfaDisableBackupSchema) {}
