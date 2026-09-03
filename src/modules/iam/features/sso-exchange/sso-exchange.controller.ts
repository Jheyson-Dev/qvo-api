import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ZodResponse } from 'nestjs-zod';
import { Public } from '#common/decorators/public.decorator';
import { ClientInfo, type ClientInfoData } from '#common/decorators';
import { LoginResponseDto } from '#modules/iam/shared';
import { ExchangeTicketUseCase } from './exchange-ticket.use-case';
import { ExchangeTicketDto } from './exchange-ticket.dto';

@ApiTags('IAM / SSO')
@Controller('iam/sso/exchange')
export class SsoExchangeController {
  constructor(private readonly exchangeTicketUseCase: ExchangeTicketUseCase) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Canjear Ticket SSO por Tokens de Sesión',
    description:
      'Recibe un `ticket` temporal generado por un flujo OAuth (ej. GitHub), lo quema en la base de datos, ' +
      'y devuelve los tokens finales de sesión (Access y Refresh tokens). Si el usuario requiere MFA, ' +
      'devuelve un mfaToken.',
  })
  @ZodResponse({ type: LoginResponseDto })
  async exchange(
    @Body() body: ExchangeTicketDto,
    @ClientInfo() clientInfo: ClientInfoData,
  ): Promise<LoginResponseDto> {
    return this.exchangeTicketUseCase.execute(
      body.ticket,
      clientInfo,
    ) as Promise<LoginResponseDto>;
  }
}
