import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { CurrentUser, type JwtPayload } from '#modules/iam/shared';
import { GetMeUseCase } from './get-me.use-case';
import { UserProfileResponseDto } from './profile-response.schema';

@ApiTags('IAM / Profile')
@ApiBearerAuth('access-token')
@Controller('iam/profile')
export class ProfileController {
  constructor(private readonly getMeUseCase: GetMeUseCase) {}

  @Get('me')
  @ZodResponse({ type: UserProfileResponseDto })
  async getMe(
    @CurrentUser() user: JwtPayload,
  ): Promise<UserProfileResponseDto> {
    return this.getMeUseCase.execute(user);
  }
}
