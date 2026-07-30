import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  JwtAuthGuard,
  type JwtPayload,
  type LoginResponse,
  type UserProfileResponse,
} from '../../shared';
import { GetMeUseCase } from '../me/get-me.use-case';
import { LoginDto } from './login.dto';
import { LoginUseCase } from './login.use-case';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly getMeUseCase: GetMeUseCase,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<LoginResponse> {
    return this.loginUseCase.execute(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: JwtPayload): Promise<UserProfileResponse> {
    return this.getMeUseCase.execute(user);
  }
}
