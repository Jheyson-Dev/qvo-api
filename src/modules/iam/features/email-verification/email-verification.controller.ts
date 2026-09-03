import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '#common/decorators/public.decorator';
import { VerifyEmailUseCase } from './verify-email.use-case';
import { VerifyEmailDto } from './verify-email.dto';

@ApiTags('IAM / Email Verification')
@Controller('iam/email-verification')
export class EmailVerificationController {
  constructor(private readonly verifyEmailUseCase: VerifyEmailUseCase) {}

  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.NO_CONTENT)
  async verify(@Body() dto: VerifyEmailDto): Promise<void> {
    await this.verifyEmailUseCase.execute(dto.token);
  }
}
