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
    },
  };
});
