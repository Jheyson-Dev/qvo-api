import { registerAs } from '@nestjs/config';
import { envSchema } from './env.validation';

export const appConfig = registerAs('app', () => {
  const env = envSchema.parse(process.env);

  return {
    port: env.PORT,
    database: {
      url: env.DATABASE_URL,
    },
    jwt: {
      secret: env.JWT_SECRET,
      expiresIn: env.JWT_EXPIRES_IN,
      issuer: 'qvo-api',
      audience: env.FRONTEND_URL,
    },
    throttler: {
      ttl: env.THROTTLER_TTL,
      limit: env.THROTTLER_LIMIT,
    },
    mail: {
      resendApiKey: env.RESEND_API_KEY,
      // Almacenamos en ms para que los use-cases no hagan conversiones
      emailVerificationExpiresMs: env.EMAIL_VERIFICATION_EXPIRES_IN * 1000,
      passwordResetExpiresMs: env.PASSWORD_RESET_EXPIRES_IN * 1000,
    },
    frontendUrl: env.FRONTEND_URL,
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
    discord: {
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
    },
  };
});
