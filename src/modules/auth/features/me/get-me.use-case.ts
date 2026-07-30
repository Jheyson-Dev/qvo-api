import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { DB_CONNECTION } from '../../../../database/database.constants';
import { UsersRepository } from '../../../users/shared/users.repository';
import type { DrizzleDb } from '../../../../database/database.types';
import type { JwtPayload, UserProfileResponse } from '../../shared';

@Injectable()
export class GetMeUseCase {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly usersRepository: UsersRepository,
  ) {}

  async execute(payload: JwtPayload): Promise<UserProfileResponse> {
    const user = await this.usersRepository.findById(this.db, payload.sub);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tu cuenta está inactiva o suspendida.');
    }

    return {
      identityId: user.identityId,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };
  }
}
