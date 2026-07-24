import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { DB_CONNECTION } from './database.constants';

export const drizzleProvider: Provider = {
  provide: DB_CONNECTION,
  inject: [ConfigService],

  useFactory: (configService: ConfigService) => {
    const databaseUrl = configService.get<string>('app.database.url');

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not defined in configuration');
    }

    // Inicialización simple y directa como dice la documentación
    return drizzle(databaseUrl);
  },
};
