import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ZodResponse } from 'nestjs-zod';
import { Public } from '#common/decorators/public.decorator';
import { ClientInfo, type ClientInfoData } from '#common/decorators';
import { LoginResponseDto } from '#modules/iam/shared';
import { ProcessGoogleLoginUseCase } from './process-google-login.use-case';
import { GoogleSsoDto } from './google-sso.dto';

@ApiTags('IAM / SSO')
@Controller('iam/sso')
export class GoogleSsoController {
  constructor(
    private readonly processGoogleLoginUseCase: ProcessGoogleLoginUseCase,
  ) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login con Google (Token Exchange)',
    description:
      'Flujo: Frontend obtiene el `idToken` de Google Identity Services y lo envía aquí. ' +
      'El backend verifica el token con `google-auth-library` sin ningún redirect ni callback. ' +
      'Si el usuario tiene 2FA activo, devuelve `{ mfaRequired: true, mfaToken }`.',
  })
  @ZodResponse({ type: LoginResponseDto })
  async google(
    @Body() dto: GoogleSsoDto,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<LoginResponseDto> {
    return this.processGoogleLoginUseCase.execute(
      dto.idToken,
      clientInfo,
    ) as Promise<LoginResponseDto>;
  }
}
