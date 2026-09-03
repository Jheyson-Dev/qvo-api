import { Injectable } from '@nestjs/common';
import { eq, type InferInsertModel } from 'drizzle-orm';
import { identities } from '#database/schema';
import type { DrizzleTx, DbOrTx } from '#database/database.types';

type InsertIdentity = InferInsertModel<typeof identities>;

@Injectable()
export class IdentitiesRepository {
  async createIdentity(
    tx: DrizzleTx,
    type: InsertIdentity['type'],
  ): Promise<{ id: string }> {
    const [identity] = await tx
      .insert(identities)
      .values({ type })
      .returning({ id: identities.id });
    return identity;
  }

  async findById(db: DbOrTx, id: string) {
    const [identity] = await db
      .select()
      .from(identities)
      .where(eq(identities.id, id))
      .limit(1);
    return identity ?? null;
  }
}
