import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '#common/decorators/public.decorator';
import { RequestPasswordResetUseCase } from './request-password-reset.use-case';
import { ResetPasswordUseCase } from './reset-password.use-case';
import { RequestPasswordResetDto } from './request-reset.dto';
import { ResetPasswordDto } from './reset-password.dto';

@ApiTags('IAM / Password Recovery')
@Public()
@Controller('iam/password-recovery')
export class PasswordRecoveryController {
  constructor(
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
  ) {}

  @Post('request')
  @HttpCode(HttpStatus.NO_CONTENT)
  async requestReset(@Body() dto: RequestPasswordResetDto): Promise<void> {
    await this.requestPasswordResetUseCase.execute(dto.email);
  }

  @Post('reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reset(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.resetPasswordUseCase.execute(dto.token, dto.newPassword);
  }
}
