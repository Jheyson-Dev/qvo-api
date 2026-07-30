import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DB_CONNECTION } from '../../../../database/database.constants';
import { HashingService } from '../../../../common/security';
import { UsersRepository } from '../../../users/shared/users.repository';
import type { DrizzleDb } from '../../../../database/database.types';
import type { LoginResponse } from '../../shared';
import { LoginDto } from './login.dto';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly hashingService: HashingService,
  ) {}

  async execute(dto: LoginDto): Promise<LoginResponse> {
    const user = await this.usersRepository.findByEmail(this.db, dto.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tu cuenta está inactiva o suspendida.');
    }

    const isPasswordValid = await this.hashingService.verify(
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
