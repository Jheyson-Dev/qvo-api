import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { DB_CONNECTION } from '#database/database.constants';
import { UsersRepository } from '#modules/users/shared/users.repository';
import type { DrizzleDb } from '#database/database.types';
import type { JwtPayload, UserProfileResponse } from '#modules/iam/shared';
import { MfaRepository } from '#modules/iam/shared';

@Injectable()
export class GetMeUseCase {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly usersRepository: UsersRepository,
    private readonly mfaRepository: MfaRepository,
  ) {}

  async execute(payload: JwtPayload): Promise<UserProfileResponse> {
    const user = await this.usersRepository.findById(this.db, payload.sub);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tu cuenta está inactiva o suspendida.');
    }

    const factor = await this.mfaRepository.findByIdentityId(
      this.db,
      payload.sub,
    );
    const hasMfaEnabled = !!factor?.isVerified;

    return {
      identityId: user.identityId,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
      hasMfaEnabled,
      createdAt: user.createdAt,
    };
  }
}
