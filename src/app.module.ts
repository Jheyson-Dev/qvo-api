import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { appConfig } from './config/app.config';
import { validate } from './config/env.validation';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { PostgresExceptionFilter } from './common/filters/postgres-exception.filter';
import { ZodExceptionFilter } from './common/filters/zod-exception.filter';
import { DrizzleModule } from './database/drizzle.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate,
    }),
    DrizzleModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Registro de filtros en orden de evaluación
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: PostgresExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: ZodExceptionFilter,
    },
  ],
})
export class AppModule {}
