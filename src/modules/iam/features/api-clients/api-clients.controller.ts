import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '#modules/iam/shared/guards/jwt-auth.guard';
import { RequirePermissions } from '#common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '#modules/iam/shared/guards/permissions.guard';
import { CreateApiClientUseCase } from './create-api-client.use-case';
import { CreateApiClientDto } from './create-api-client.dto';

@ApiTags('API Clients')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('iam/api-clients')
export class ApiClientsController {
  constructor(
    private readonly createApiClientUseCase: CreateApiClientUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('create:api_clients')
  @ApiOperation({
    summary: 'Crear un nuevo API Client',
    description:
      'Genera un clientId y un secret. El secret se muestra UNA SOLA VEZ — guárdalo de forma segura.',
  })
  async create(@Body() dto: CreateApiClientDto) {
    return this.createApiClientUseCase.execute(dto.name);
  }
}
