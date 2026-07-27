import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CreateUserDto } from './create-user.dto';
import {
  RegisteredUserResponse,
  RegisterUserUseCase,
} from './register-user.use-case';

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
