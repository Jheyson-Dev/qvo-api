import { Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { DbOrTx } from '#database/database.types';
import { oauthAccounts } from '#database/schema';
import type { OAuthProvider } from '../types/oauth-provider.type';

@Injectable()
export class OauthRepository {
  async findByProviderAndAccountId(
    db: DbOrTx,
    provider: OAuthProvider | string,
    providerAccountId: string,
  ): Promise<typeof oauthAccounts.$inferSelect | undefined> {
    const [row] = await db
      .select()
      .from(oauthAccounts)
      .where(
        and(
          eq(oauthAccounts.provider, provider),
          eq(oauthAccounts.providerAccountId, providerAccountId),
        ),
      )
      .limit(1);
    return row;
  }

  async createOauthAccount(
    tx: DbOrTx,
    data: typeof oauthAccounts.$inferInsert,
  ): Promise<typeof oauthAccounts.$inferSelect> {
    const [row] = await tx.insert(oauthAccounts).values(data).returning();
    return row;
  }
}
