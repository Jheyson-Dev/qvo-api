import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ZodResponse } from 'nestjs-zod';
import { Public } from '#common/decorators/public.decorator';
import { ClientInfo, type ClientInfoData } from '#common/decorators';
import {
  CurrentUser,
  JwtAuthGuard,
  type JwtPayload,
  LoginResponseDto,
} from '#modules/iam/shared';
import { SetupMfaUseCase } from './setup-mfa.use-case';
import { EnableMfaUseCase } from './enable-mfa.use-case';
import { DisableMfaUseCase } from './disable-mfa.use-case';
import { DisableMfaWithBackupUseCase } from './disable-mfa-with-backup.use-case';
import { VerifyMfaUseCase } from './verify-mfa.use-case';
import { LoginWithBackupMfaUseCase } from './login-with-backup-mfa.use-case';
import {
  MfaCodeDto,
  MfaVerifyDto,
  MfaLoginBackupDto,
  MfaDisableBackupDto,
} from './mfa.dto';
import {
  MfaSetupResponseDto,
  MfaEnableResponseDto,
} from './mfa-response.schema';

@ApiTags('IAM / MFA')
@ApiBearerAuth('access-token')
@Controller('iam/mfa')
@UseGuards(JwtAuthGuard)
export class MfaController {
  constructor(
    private readonly setupMfaUseCase: SetupMfaUseCase,
    private readonly enableMfaUseCase: EnableMfaUseCase,
    private readonly disableMfaUseCase: DisableMfaUseCase,
    private readonly disableMfaWithBackupUseCase: DisableMfaWithBackupUseCase,
    private readonly verifyMfaUseCase: VerifyMfaUseCase,
    private readonly loginWithBackupMfaUseCase: LoginWithBackupMfaUseCase,
  ) {}

  // Inicia el setup: genera secreto + URL para el QR
  @Post('setup')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: MfaSetupResponseDto })
  async setup(@CurrentUser() user: JwtPayload): Promise<MfaSetupResponseDto> {
    return this.setupMfaUseCase.execute(user.sub);
  }

  // Confirma el setup escaneando el QR (primer código válido activa el 2FA)
  @Post('enable')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: MfaEnableResponseDto })
  async enable(
    @CurrentUser() user: JwtPayload,
    @Body() dto: MfaCodeDto,
  ): Promise<MfaEnableResponseDto> {
    const backupCodes = await this.enableMfaUseCase.execute(user.sub, dto.code);
    return { backupCodes };
  }

  // Desactiva el 2FA (requiere código actual como confirmación)
  @Delete('disable')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disable(
    @CurrentUser() user: JwtPayload,
    @Body() dto: MfaCodeDto,
  ): Promise<void> {
    await this.disableMfaUseCase.execute(user.sub, dto.code);
  }

  // Desactiva el 2FA usando un código de respaldo (en caso de pérdida de dispositivo)
  @Delete('disable-backup')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disableBackup(
    @CurrentUser() user: JwtPayload,
    @Body() dto: MfaDisableBackupDto,
  ): Promise<void> {
    await this.disableMfaWithBackupUseCase.execute(user.sub, dto.code);
  }

  // Completa el login con 2FA: canjea mfaToken + código por JWT final
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Completar challenge 2FA',
    description:
      'Este endpoint es público. Recibe el `mfaToken` temporal emitido por el login y el código TOTP.',
  })
  @ZodResponse({ type: LoginResponseDto })
  async verify(
    @Body() dto: MfaVerifyDto,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<LoginResponseDto> {
    return this.verifyMfaUseCase.execute(dto, clientInfo);
  }

  // Completa el login usando un Backup Code (en caso de pérdida de dispositivo)
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('verify-backup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Completar challenge con Código de Respaldo',
    description: 'Quema un código de respaldo válido y emite la sesión.',
  })
  @ZodResponse({ type: LoginResponseDto })
  async loginWithBackup(
    @Body() dto: MfaLoginBackupDto,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<LoginResponseDto> {
    return this.loginWithBackupMfaUseCase.execute(dto, clientInfo);
  }
}
