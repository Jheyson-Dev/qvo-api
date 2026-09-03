import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { apiClients, identities } from '#database/schema';
import type { DbOrTx, DrizzleTx } from '#database/database.types';

export type CreateApiClientData = {
  name: string;
  clientId: string;
  secretHash: string;
};

export type ApiClientRecord = {
  identityId: string;
  secretHash: string;
  expiresAt: Date | null;
  name: string;
};

@Injectable()
export class ApiClientsRepository {
  /**
   * Inserta una identity de tipo API_CLIENT y su registro en api_clients.
   * Debe llamarse dentro de una transacción.
   */
  async createClient(
    tx: DrizzleTx,
    data: CreateApiClientData,
  ): Promise<string> {
    const [identity] = await tx
      .insert(identities)
      .values({ type: 'API_CLIENT' })
      .returning({ id: identities.id });

    await tx.insert(apiClients).values({
      identityId: identity.id,
      name: data.name,
      clientId: data.clientId,
      secretHash: data.secretHash,
    });

    return identity.id;
  }

  /**
   * Búsqueda O(1) por clientId (campo UNIQUE indexado).
   * Devuelve las credenciales necesarias para validar la API key.
   */
  async findByClientId(
    db: DbOrTx,
    clientId: string,
  ): Promise<ApiClientRecord | null> {
    const [record] = await db
      .select({
        identityId: apiClients.identityId,
        secretHash: apiClients.secretHash,
        expiresAt: apiClients.expiresAt,
        name: apiClients.name,
      })
      .from(apiClients)
      .where(eq(apiClients.clientId, clientId))
      .limit(1);

    return record ?? null;
  }

  /**
   * Actualiza lastUsedAt. Diseñado para Fire & Forget (void).
   */
  async updateLastUsed(db: DbOrTx, clientId: string): Promise<void> {
    await db
      .update(apiClients)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiClients.clientId, clientId));
  }
}
