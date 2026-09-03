import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { CurrentUser } from '#modules/iam/shared';
import type { HumanJwtPayload } from '#modules/iam/shared';
import { SessionResponseDto } from './session-response.schema';
import { GetSessionsUseCase } from './get-sessions.use-case';
import { RevokeSessionUseCase } from './revoke-session.use-case';
import { RevokeOtherSessionsUseCase } from './revoke-other-sessions.use-case';

@ApiTags('IAM / Sessions')
@ApiBearerAuth('access-token')
@Controller('iam/sessions')
export class SessionsController {
  constructor(
    private readonly getSessionsUseCase: GetSessionsUseCase,
    private readonly revokeSessionUseCase: RevokeSessionUseCase,
    private readonly revokeOtherSessionsUseCase: RevokeOtherSessionsUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: [SessionResponseDto] })
  async getSessions(
    @CurrentUser() user: HumanJwtPayload,
  ): Promise<SessionResponseDto[]> {
    return this.getSessionsUseCase.execute(
      user.sub,
      user.sessionId,
    ) as unknown as Promise<SessionResponseDto[]>;
  }

  @Delete('others')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeOtherSessions(
    @CurrentUser() user: HumanJwtPayload,
  ): Promise<void> {
    await this.revokeOtherSessionsUseCase.execute(user.sub, user.sessionId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSession(
    @Param('id') sessionId: string,
    @CurrentUser() user: HumanJwtPayload,
  ): Promise<void> {
    if (sessionId === user.sessionId) {
      throw new BadRequestException(
        'Cannot revoke current session. Please use the /logout endpoint.',
      );
    }
    await this.revokeSessionUseCase.execute(sessionId, user.sub);
  }
}
