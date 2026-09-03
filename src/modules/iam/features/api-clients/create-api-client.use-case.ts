import { Inject, Injectable } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { DB_CONNECTION } from '#database/database.constants';
import type { DrizzleDb } from '#database/database.types';
import { TokenService } from '#common/security';
import { ApiClientsRepository } from '#modules/iam/shared/repositories/api-clients.repository';

export type CreateApiClientResult = {
  /** Identificador público que el cliente enviará en el header x-api-key */
  clientId: string;
  /** Secret en claro — se muestra UNA SOLA VEZ. No se persiste. */
  secret: string;
  /** Aviso para el consumidor */
  message: string;
};

@Injectable()
export class CreateApiClientUseCase {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly apiClientsRepository: ApiClientsRepository,
    private readonly tokenService: TokenService,
  ) {}

  async execute(name: string): Promise<CreateApiClientResult> {
    // 1. Generar clientId público con prefijo de marca (legible y trazable)
    const clientId = `qvo_client_${crypto.randomBytes(16).toString('hex')}`;

    // 2. Generar secret fuerte (40 bytes = 80 chars hex)
    const secret = this.tokenService.generateOpaqueToken();

    // 3. Hashear el secret — es lo único que persiste en la BD
    const secretHash = this.tokenService.hashOpaqueToken(secret);

    // 4. Persistir en una transacción (identity + api_client)
    await this.db.transaction(async (tx) => {
      await this.apiClientsRepository.createClient(tx, {
        name,
        clientId,
        secretHash,
      });
    });

    // 5. Retornar las credenciales — el secret nunca más estará disponible
    return {
      clientId,
      secret,
      message:
        'Guarda el secret de forma segura. No se volverá a mostrar. ' +
        'Envía las credenciales como: x-api-key: clientId.secret',
    };
  }
}
