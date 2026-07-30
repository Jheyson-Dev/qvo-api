import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { type RegisteredUserResponse } from '../../shared';
import { CreateUserDto } from './create-user.dto';
import { RegisterUserUseCase } from './register-user.use-case';

@Controller('users')
export class UsersController {
  constructor(private readonly registerUserUseCase: RegisterUserUseCase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() createUserDto: CreateUserDto,
  ): Promise<RegisteredUserResponse> {
    return this.registerUserUseCase.execute(createUserDto);
  }
}
