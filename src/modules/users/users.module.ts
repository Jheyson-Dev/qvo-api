import { Module } from '@nestjs/common';
import { UsersRepository } from './shared';

@Module({
  controllers: [],
  providers: [UsersRepository],
  exports: [UsersRepository],
})
export class UsersModule {}
