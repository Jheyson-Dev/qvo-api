import { Injectable } from '@nestjs/common';
import { and, desc, eq, getTableColumns, gt, ne } from 'drizzle-orm';
import type { DbOrTx } from '#database/database.types';
import { identities, sessions, users } from '#database/schema';

type InsertSession = typeof sessions.$inferInsert;
type SelectSession = typeof sessions.$inferSelect;
type SelectUser = typeof users.$inferSelect;

export type SessionWithUser = {
  session: SelectSession;
  user: SelectUser & {
    isActive: boolean | null;
  };
};

@Injectable()
export class SessionsRepository {
  async createSession(db: DbOrTx, data: InsertSession): Promise<SelectSession> {
    const [session] = await db.insert(sessions).values(data).returning();
    return session;
  }

  async findByTokenHash(
    db: DbOrTx,
    tokenHash: string,
  ): Promise<SessionWithUser | null> {
    const result = await db
      .select({
        session: getTableColumns(sessions),
        user: {
          ...getTableColumns(users),
          isActive: identities.isActive,
        },
      })
      .from(sessions)
      .innerJoin(identities, eq(sessions.identityId, identities.id))
      .innerJoin(users, eq(identities.id, users.identityId))
      .where(eq(sessions.tokenHash, tokenHash))
      .limit(1);

    return result[0] || null;
  }

  async findById(db: DbOrTx, sessionId: string): Promise<SelectSession | null> {
    const result = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    return result[0] || null;
  }

  async findActiveByUserId(
    db: DbOrTx,
    identityId: string,
  ): Promise<SelectSession[]> {
    return db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.identityId, identityId),
          eq(sessions.revoked, false),
          gt(sessions.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(sessions.createdAt));
  }

  async revokeSession(db: DbOrTx, sessionId: string): Promise<void> {
    await db
      .update(sessions)
      .set({
        revoked: true,
        revokedAt: new Date(),
      })
      .where(eq(sessions.id, sessionId));
  }

  async revokeAllExcept(
    db: DbOrTx,
    identityId: string,
    currentSessionId: string,
  ): Promise<void> {
    await db
      .update(sessions)
      .set({
        revoked: true,
        revokedAt: new Date(),
      })
      .where(
        and(
          eq(sessions.identityId, identityId),
          eq(sessions.revoked, false),
          ne(sessions.id, currentSessionId),
        ),
      );
  }
}
