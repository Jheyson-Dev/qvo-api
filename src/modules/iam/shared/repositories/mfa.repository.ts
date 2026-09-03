import { Injectable } from '@nestjs/common';
import { eq, and, isNull } from 'drizzle-orm';
import type { DbOrTx } from '#database/database.types';
import { mfaFactors, mfaBackupCodes } from '#database/schema';

type InsertMfaFactor = typeof mfaFactors.$inferInsert;
type InsertMfaBackupCode = typeof mfaBackupCodes.$inferInsert;

@Injectable()
export class MfaRepository {
  async findByIdentityId(
    db: DbOrTx,
    identityId: string,
  ): Promise<typeof mfaFactors.$inferSelect | undefined> {
    const [row] = await db
      .select()
      .from(mfaFactors)
      .where(eq(mfaFactors.identityId, identityId))
      .limit(1);
    return row;
  }

  async createFactor(
    db: DbOrTx,
    data: InsertMfaFactor,
  ): Promise<typeof mfaFactors.$inferSelect> {
    const [row] = await db.insert(mfaFactors).values(data).returning();
    return row;
  }

  async markVerified(db: DbOrTx, id: string): Promise<void> {
    await db
      .update(mfaFactors)
      .set({ isVerified: true, lastUsedAt: new Date() })
      .where(eq(mfaFactors.id, id));
  }

  async updateLastUsed(db: DbOrTx, id: string): Promise<void> {
    await db
      .update(mfaFactors)
      .set({ lastUsedAt: new Date() })
      .where(eq(mfaFactors.id, id));
  }

  async deleteFactor(db: DbOrTx, id: string): Promise<void> {
    await db.delete(mfaFactors).where(eq(mfaFactors.id, id));
  }

  async createBackupCodes(
    db: DbOrTx,
    data: InsertMfaBackupCode[],
  ): Promise<void> {
    if (data.length > 0) {
      await db.insert(mfaBackupCodes).values(data);
    }
  }

  async deleteBackupCodes(db: DbOrTx, identityId: string): Promise<void> {
    await db
      .delete(mfaBackupCodes)
      .where(eq(mfaBackupCodes.identityId, identityId));
  }

  async findBackupCodeByHash(
    db: DbOrTx,
    identityId: string,
    codeHash: string,
  ): Promise<typeof mfaBackupCodes.$inferSelect | undefined> {
    const [row] = await db
      .select()
      .from(mfaBackupCodes)
      .where(
        and(
          eq(mfaBackupCodes.identityId, identityId),
          eq(mfaBackupCodes.codeHash, codeHash),
          isNull(mfaBackupCodes.usedAt),
        ),
      )
      .limit(1);
    return row;
  }

  async markBackupCodeUsed(db: DbOrTx, id: string): Promise<void> {
    await db
      .update(mfaBackupCodes)
      .set({ usedAt: new Date() })
      .where(eq(mfaBackupCodes.id, id));
  }
}
