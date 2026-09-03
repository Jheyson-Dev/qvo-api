import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '#modules/users/users.module';

import {
  IdentitiesRepository,
  JwtAuthGuard,
  LoginAttemptsRepository,
  DevicesRepository,
  MfaRepository,
  OauthRepository,
  PermissionsGuard,
  PermissionsRepository,
  SessionsRepository,
  VerificationRepository,
  ResolveOAuthAccountUseCase,
} from './shared';
import { AuditLogsRepository } from './shared/repositories/audit-logs.repository';
import { AuditLogService } from './shared/services/audit-log.service';
import { AuthController } from './features/authentication/auth.controller';
import { ProfileController } from './features/profile/profile.controller';
import {
  GetSessionsUseCase,
  RevokeSessionUseCase,
  RevokeOtherSessionsUseCase,
  SessionsController,
} from './features/sessions';
import { RegistrationController } from './features/registration/registration.controller';
import { RegisterUserUseCase } from './features/registration/register-user.use-case';
import { LoginUseCase } from './features/authentication/login.use-case';
import { GetMeUseCase } from './features/profile/get-me.use-case';
import { RefreshTokenUseCase } from './features/authentication/refresh-token.use-case';
import { LogoutUseCase } from './features/authentication/logout.use-case';
import { EmailVerificationController } from './features/email-verification/email-verification.controller';
import { SendVerificationEmailUseCase } from './features/email-verification/send-verification-email.use-case';
import { VerifyEmailUseCase } from './features/email-verification/verify-email.use-case';
import { PasswordRecoveryController } from './features/password-recovery/password-recovery.controller';
import { RequestPasswordResetUseCase } from './features/password-recovery/request-password-reset.use-case';
import { ResetPasswordUseCase } from './features/password-recovery/reset-password.use-case';
import { MfaController } from './features/mfa/mfa.controller';
import { SetupMfaUseCase } from './features/mfa/setup-mfa.use-case';
import { EnableMfaUseCase } from './features/mfa/enable-mfa.use-case';
import { DisableMfaUseCase } from './features/mfa/disable-mfa.use-case';
import { DisableMfaWithBackupUseCase } from './features/mfa/disable-mfa-with-backup.use-case';
import { VerifyMfaUseCase } from './features/mfa/verify-mfa.use-case';
import { LoginWithBackupMfaUseCase } from './features/mfa/login-with-backup-mfa.use-case';
import { GoogleSsoController } from './features/sso-google/google-sso.controller';
import { ProcessGoogleLoginUseCase } from './features/sso-google/process-google-login.use-case';
import { SsoExchangeController } from './features/sso-exchange/sso-exchange.controller';
import { ExchangeTicketUseCase } from './features/sso-exchange/exchange-ticket.use-case';
import { GithubSsoController } from './features/sso-github/github-sso.controller';
import { ProcessGithubLoginUseCase } from './features/sso-github/process-github-login.use-case';
import { DiscordSsoController } from './features/sso-discord/discord-sso.controller';
import { ProcessDiscordLoginUseCase } from './features/sso-discord/process-discord-login.use-case';
import { ApiClientsController } from './features/api-clients/api-clients.controller';
import { CreateApiClientUseCase } from './features/api-clients/create-api-client.use-case';
import { ApiClientsRepository } from './shared/repositories/api-clients.repository';
import { ApiKeyGuard } from './shared/guards/api-key.guard';

import { RolesController } from './features/roles/roles.controller';
import { ListPermissionsUseCase } from './features/roles/list-permissions.use-case';
import { ListRolesUseCase } from './features/roles/list-roles.use-case';
import { CreateRoleUseCase } from './features/roles/create-role.use-case';
import { UpdateRoleUseCase } from './features/roles/update-role.use-case';
import { DeleteRoleUseCase } from './features/roles/delete-role.use-case';
import { AssignRoleToIdentityUseCase } from './features/roles/assign-role-to-identity.use-case';
import { RevokeRoleFromIdentityUseCase } from './features/roles/revoke-role-from-identity.use-case';
import { ListRolesForIdentityUseCase } from './features/roles/list-roles-for-identity.use-case';
import { RolesRepository } from './shared/repositories/roles.repository';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('app.jwt.secret');
        const expiresIn = configService.get<number>('app.jwt.expiresIn');
        const issuer = configService.get<string>('app.jwt.issuer');
        const audience = configService.get<string>('app.jwt.audience');
        return {
          secret,
          signOptions: {
            expiresIn,
            issuer,
            audience,
          },
        };
      },
    }),
  ],
  controllers: [
    AuthController,
    ProfileController,
    SessionsController,
    RegistrationController,
    EmailVerificationController,
    PasswordRecoveryController,
    MfaController,
    GoogleSsoController,
    SsoExchangeController,
    GithubSsoController,
    DiscordSsoController,
    ApiClientsController,
    RolesController,
  ],
  providers: [
    IdentitiesRepository,
    SessionsRepository,
    VerificationRepository,
    MfaRepository,
    OauthRepository,
    LoginAttemptsRepository,
    DevicesRepository,
    AuditLogsRepository,
    AuditLogService,
    PermissionsRepository,
    RolesRepository,
    ResolveOAuthAccountUseCase,
    LoginUseCase,
    GetMeUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    GetSessionsUseCase,
    RevokeSessionUseCase,
    RevokeOtherSessionsUseCase,
    RegisterUserUseCase,
    SendVerificationEmailUseCase,
    VerifyEmailUseCase,
    RequestPasswordResetUseCase,
    ResetPasswordUseCase,
    SetupMfaUseCase,
    EnableMfaUseCase,
    DisableMfaUseCase,
    DisableMfaWithBackupUseCase,
    VerifyMfaUseCase,
    LoginWithBackupMfaUseCase,
    ApiClientsRepository,
    ApiKeyGuard,
    CreateApiClientUseCase,
    ListPermissionsUseCase,
    ListRolesUseCase,
    CreateRoleUseCase,
    UpdateRoleUseCase,
    DeleteRoleUseCase,
    AssignRoleToIdentityUseCase,
    RevokeRoleFromIdentityUseCase,
    ListRolesForIdentityUseCase,
    ProcessGoogleLoginUseCase,
    ExchangeTicketUseCase,
    ProcessGithubLoginUseCase,
    ProcessDiscordLoginUseCase,
    JwtAuthGuard,
    PermissionsGuard,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
  exports: [
    JwtModule,
    JwtAuthGuard,
    PermissionsGuard,
    PermissionsRepository,
    SessionsRepository,
    AuditLogService,
    ApiKeyGuard,
    ApiClientsRepository,
    RolesRepository,
  ],
})
export class IamModule {}
