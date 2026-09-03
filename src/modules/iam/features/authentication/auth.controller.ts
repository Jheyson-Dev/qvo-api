import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ZodResponse } from 'nestjs-zod';
import { Public } from '#common/decorators/public.decorator';
import { ClientInfo, type ClientInfoData } from '#common/decorators';
import {
  CurrentUser,
  type JwtPayload,
  type LoginResult,
  LoginResponseDto,
} from '#modules/iam/shared';
import { LoginDto } from './login.dto';
import { LoginUseCase } from './login.use-case';
import { LogoutDto } from './logout.dto';
import { LogoutUseCase } from './logout.use-case';
import { RefreshTokenDto } from './refresh-token.dto';
import { RefreshTokenUseCase } from './refresh-token.use-case';
import { RefreshTokenResponseDto } from './refresh-token-response.schema';

@ApiTags('IAM / Authentication')
@Controller('iam/auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login tradicional',
    description:
      'Si el usuario tiene 2FA activo, devuelve `{ mfaRequired: true, mfaToken }`. ' +
      'En ese caso, completa el login en POST /iam/mfa/verify.',
  })
  @ZodResponse({ type: LoginResponseDto })
  async login(
    @Body() loginDto: LoginDto,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<LoginResponseDto> {
    return this.loginUseCase.execute(
      loginDto,
      clientInfo,
    ) as Promise<LoginResponseDto>;
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: RefreshTokenResponseDto })
  async refreshToken(
    @Body() dto: RefreshTokenDto,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<RefreshTokenResponseDto> {
    return this.refreshTokenUseCase.execute(dto, clientInfo);
  }

  @ApiBearerAuth('access-token')
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Body() dto: LogoutDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.logoutUseCase.execute(dto, user.sub);
  }
}
