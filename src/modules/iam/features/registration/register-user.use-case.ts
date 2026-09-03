import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { DB_CONNECTION } from '#database/database.constants';
import { IdentitiesRepository } from '#modules/iam/shared';
import { HashingService } from '#common/security';
import { UsersRepository } from '#modules/users/shared/users.repository';
import { SendVerificationEmailUseCase } from '#modules/iam/features/email-verification/send-verification-email.use-case';
import type { DrizzleDb, DrizzleTx } from '#database/database.types';
import type { RegisteredUserResponse } from './registered-user-response.type';
import { RegisterUserDto } from './register-user.dto';

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly usersRepository: UsersRepository,
    private readonly identitiesRepository: IdentitiesRepository,
    private readonly hashingService: HashingService,
    private readonly sendVerificationEmailUseCase: SendVerificationEmailUseCase,
  ) {}

  async execute(dto: RegisterUserDto): Promise<RegisteredUserResponse> {
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
      const identity = await this.identitiesRepository.createIdentity(
        tx,
        'HUMAN',
      );

      const newUser = await this.usersRepository.createUser(tx, {
        identityId: identity.id,
        email: dto.email,
        username: dto.username,
        displayName: dto.displayName,
        passwordHash,
        emailVerified: false,
      });

      // Enviar correo de verificación dentro de la misma transacción
      await this.sendVerificationEmailUseCase.execute(
        tx,
        identity.id,
        dto.email,
      );

      return newUser;
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
