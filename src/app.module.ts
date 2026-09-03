import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { ThrottlerModule } from '@nestjs/throttler';
import { appConfig } from './config/app.config';
import { validate } from './config/env.validation';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { PostgresExceptionFilter } from './common/filters/postgres-exception.filter';
import { ZodExceptionFilter } from './common/filters/zod-exception.filter';
import { SecurityModule } from './common/security';
import { CustomThrottlerGuard } from './common/security/guards/custom-throttler.guard';
import { DrizzleModule } from './database/drizzle.module';
import { MailModule } from './common/mail/mail.module';
import { IamModule } from './modules/iam/iam.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('app.throttler.ttl') ?? 60000,
          limit: configService.get<number>('app.throttler.limit') ?? 60,
        },
      ],
    }),
    DrizzleModule,
    MailModule,
    SecurityModule,
    UsersModule,
    IamModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
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
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}
