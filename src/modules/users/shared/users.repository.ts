import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../../database/schema';
import { identities, users } from '../../../database/schema';

export type DrizzleDb = PostgresJsDatabase<typeof schema>;
export type DrizzleTx = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0];
export type DbOrTx = DrizzleDb | DrizzleTx;

type InsertIdentity = typeof identities.$inferInsert;
type InsertUser = typeof users.$inferInsert;
type SelectUser = typeof users.$inferSelect;

@Injectable()
export class UsersRepository {
  async findByEmail(db: DbOrTx, email: string): Promise<SelectUser | null> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return result[0] || null;
  }

  async findByUsername(
    db: DbOrTx,
    username: string,
  ): Promise<SelectUser | null> {
    const result = await db
      .select()
      .from(users)
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
