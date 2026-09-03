import { Injectable } from '@nestjs/common';
import { eq, getTableColumns, sql } from 'drizzle-orm';
import type { DbOrTx, DrizzleTx } from '#database/database.types';
import { identities, users } from '#database/schema';

type InsertUser = typeof users.$inferInsert;
type SelectUser = typeof users.$inferSelect;

export type UserWithStatus = SelectUser & {
  isActive: boolean | null;
};

@Injectable()
export class UsersRepository {
  async findById(
    db: DbOrTx,
    identityId: string,
  ): Promise<UserWithStatus | null> {
    const result = await db
      .select({
        ...getTableColumns(users),
        isActive: identities.isActive,
      })
      .from(users)
      .innerJoin(identities, eq(users.identityId, identities.id))
      .where(eq(users.identityId, identityId))
      .limit(1);
    return result[0] || null;
  }

  async findByEmail(db: DbOrTx, email: string): Promise<UserWithStatus | null> {
    const result = await db
      .select({
        ...getTableColumns(users),
        isActive: identities.isActive,
      })
      .from(users)
      .innerJoin(identities, eq(users.identityId, identities.id))
      .where(eq(users.email, email))
      .limit(1);
    return result[0] || null;
  }

  async findByUsername(
    db: DbOrTx,
    username: string,
  ): Promise<UserWithStatus | null> {
    const result = await db
      .select({
        ...getTableColumns(users),
        isActive: identities.isActive,
      })
      .from(users)
      .innerJoin(identities, eq(users.identityId, identities.id))
      .where(eq(users.username, username))
      .limit(1);
    return result[0] || null;
  }

  async createUser(tx: DrizzleTx, data: InsertUser): Promise<SelectUser> {
    const [user] = await tx.insert(users).values(data).returning();
    return user;
  }

  async setEmailVerified(tx: DbOrTx, identityId: string): Promise<void> {
    await tx
      .update(users)
      .set({ emailVerified: true })
      .where(eq(users.identityId, identityId));
  }

  async updatePasswordHash(
    tx: DbOrTx,
    identityId: string,
    passwordHash: string,
  ): Promise<void> {
    await tx
      .update(users)
      .set({ passwordHash })
      .where(eq(users.identityId, identityId));
  }

  // ── Brute-force lockout ──────────────────────────────────────────────────────

  /**
   * Incrementa el contador de intentos fallidos.
   * Si se pasa lockoutUntil, también aplica el bloqueo temporal de la cuenta.
   */
  async incrementFailedAttempts(
    db: DbOrTx,
    identityId: string,
    lockoutUntil?: Date,
  ): Promise<void> {
    await db
      .update(users)
      .set({
        failedLoginAttempts: sql`${users.failedLoginAttempts} + 1`,
        ...(lockoutUntil ? { lockoutUntil } : {}),
      })
      .where(eq(users.identityId, identityId));
  }

  /**
   * Resetea el contador de fallos y limpia el lockout al loguearse exitosamente.
   */
  async resetFailedAttempts(db: DbOrTx, identityId: string): Promise<void> {
    await db
      .update(users)
      .set({
        failedLoginAttempts: 0,
        lockoutUntil: null,
        lastLoginAt: new Date(),
      })
      .where(eq(users.identityId, identityId));
  }
}
