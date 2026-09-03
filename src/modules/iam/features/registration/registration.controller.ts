import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ZodResponse } from 'nestjs-zod';
import { Public } from '#common/decorators/public.decorator';
import { RegisterUserDto } from './register-user.dto';
import { RegisterUserUseCase } from './register-user.use-case';
import { RegisteredUserResponseDto } from './registration-response.schema';

@ApiTags('IAM / Registration')
@Controller('iam/registration')
export class RegistrationController {
  constructor(private readonly registerUserUseCase: RegisterUserUseCase) {}

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ZodResponse({ status: 201, type: RegisteredUserResponseDto })
  async register(
    @Body() registerUserDto: RegisterUserDto,
  ): Promise<RegisteredUserResponseDto> {
    // Date se serializa automáticamente a ISO string en el response JSON.
    // El schema Zod usa string.datetime() para que OpenAPI lo refleje correctamente.
    return this.registerUserUseCase.execute(
      registerUserDto,
    ) as unknown as Promise<RegisteredUserResponseDto>;
  }
}
