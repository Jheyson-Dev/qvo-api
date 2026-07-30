import { Injectable } from '@nestjs/common';
import { eq, getTableColumns } from 'drizzle-orm';
import type { DbOrTx, DrizzleTx } from '../../../database/database.types';
import { identities, users } from '../../../database/schema';

type InsertIdentity = typeof identities.$inferInsert;
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

  async createUser(tx: DrizzleTx, data: InsertUser): Promise<SelectUser> {
    const [user] = await tx.insert(users).values(data).returning();
    return user;
  }
}
