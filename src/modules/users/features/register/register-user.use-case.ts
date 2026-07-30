import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { DB_CONNECTION } from '../../../../database/database.constants';
import { HashingService } from '../../../../common/security';
import { UsersRepository } from '../../shared/users.repository';
import type { DrizzleDb, DrizzleTx } from '../../../../database/database.types';
import type { RegisteredUserResponse } from '../../shared';
import { CreateUserDto } from './create-user.dto';

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly usersRepository: UsersRepository,
    private readonly hashingService: HashingService,
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

    const passwordHash = await this.hashingService.hash(dto.password);

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
