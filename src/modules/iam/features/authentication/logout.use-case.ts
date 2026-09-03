import { Inject, Injectable } from '@nestjs/common';
import { DB_CONNECTION } from '#database/database.constants';
import { TokenService } from '#common/security';
import type { DrizzleDb } from '#database/database.types';
import { SessionsRepository } from '#modules/iam/shared';
import { LogoutDto } from './logout.dto';

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly sessionsRepository: SessionsRepository,
    private readonly tokenService: TokenService,
  ) {}

  async execute(dto: LogoutDto, identityId: string): Promise<void> {
    const tokenHash = this.tokenService.hashOpaqueToken(dto.refreshToken);
    const result = await this.sessionsRepository.findByTokenHash(
      this.db,
      tokenHash,
    );

    if (
      result &&
      !result.session.revoked &&
      result.user.identityId === identityId
    ) {
      await this.sessionsRepository.revokeSession(this.db, result.session.id);
    }
  }
}
