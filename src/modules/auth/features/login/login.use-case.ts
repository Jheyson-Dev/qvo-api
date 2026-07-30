import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { DB_CONNECTION } from '../../../../database/database.constants';
import { UsersRepository } from '../../../users/shared/users.repository';
import type { DrizzleDb } from '../../../../database/database.types';
import { LoginDto } from './login.dto';

export type LoginResponse = {
  accessToken: string;
  user: {
    identityId: string;
    email: string;
    username: string;
    displayName: string;
    emailVerified: boolean | null;
  };
};

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(dto: LoginDto): Promise<LoginResponse> {
    const user = await this.usersRepository.findByEmail(this.db, dto.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      dto.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const payload = {
      sub: user.identityId,
      email: user.email,
      username: user.username,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        identityId: user.identityId,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
      },
    };
  }
}
