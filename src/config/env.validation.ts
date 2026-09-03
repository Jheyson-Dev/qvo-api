import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.coerce.number(),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.coerce.number(),
  THROTTLER_TTL: z.coerce.number(),
  THROTTLER_LIMIT: z.coerce.number(),
  RESEND_API_KEY: z.string().startsWith('re_'),
  FRONTEND_URL: z.string().url(),
  // Tiempo en segundos. Defaults: 24h=86400, 1h=3600
  EMAIL_VERIFICATION_EXPIRES_IN: z.coerce.number(),
  PASSWORD_RESET_EXPIRES_IN: z.coerce.number(),
  // Google SSO
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  // GitHub SSO
  GITHUB_CLIENT_ID: z.string(),
  GITHUB_CLIENT_SECRET: z.string(),
  // Discord SSO
  DISCORD_CLIENT_ID: z.string(),
  DISCORD_CLIENT_SECRET: z.string(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validate(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    throw new Error(`Config validation error: ${result.error.message}`);
  }

  return result.data;
}
