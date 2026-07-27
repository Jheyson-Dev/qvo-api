import { ConflictException, Inject, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { DB_CONNECTION } from '../../../../database/database.constants';
import { UsersRepository } from '../../shared/users.repository';
import type { DrizzleDb, DrizzleTx } from '../../shared/users.repository';
import { CreateUserDto } from './create-user.dto';

export type RegisteredUserResponse = {
  identityId: string;
  email: string;
  username: string;
  displayName: string;
  emailVerified: boolean | null;
  createdAt: Date;
};

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly usersRepository: UsersRepository,
  ) {}

  async execute(dto: CreateUserDto): Promise<RegisteredUserResponse> {
    const existingEmail = await this.usersRepository.findByEmail(
      this.db,
      dto.email,
    );
    if (existingEmail) {
      throw new ConflictException(
        'El correo electrónico ya se encuentra registrado.',
      );
    }

    const existingUsername = await this.usersRepository.findByUsername(
      this.db,
      dto.username,
    );
    if (existingUsername) {
      throw new ConflictException('El nombre de usuario ya está en uso.');
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.db.transaction(async (tx: DrizzleTx) => {
      const identity = await this.usersRepository.createIdentity(tx, 'HUMAN');

      return this.usersRepository.createUser(tx, {
        identityId: identity.id,
        email: dto.email,
        username: dto.username,
        displayName: dto.displayName,
        passwordHash,
        emailVerified: false,
      });
    });

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
