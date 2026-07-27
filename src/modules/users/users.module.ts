import { Module } from '@nestjs/common';
import { RegisterUserUseCase, UsersController } from './features';
import { UsersRepository } from './shared';

@Module({
  controllers: [UsersController],
  providers: [RegisterUserUseCase, UsersRepository],
  exports: [UsersRepository],
})
export class UsersModule {}
