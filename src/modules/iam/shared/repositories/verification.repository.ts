import { Injectable } from '@nestjs/common';
import { eq, and, isNull } from 'drizzle-orm';
import type { DbOrTx } from '#database/database.types';
import { emailVerifications, passwordResets } from '#database/schema';

@Injectable()
export class VerificationRepository {
  // ─────────────────────────────────────────────────────────
  // EMAIL VERIFICATION
  // ─────────────────────────────────────────────────────────

  async createEmailVerification(
    tx: DbOrTx,
    identityId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await tx
      .insert(emailVerifications)
      .values({ identityId, tokenHash, expiresAt });
  }

  async findPendingEmailVerification(
    tx: DbOrTx,
    tokenHash: string,
  ): Promise<{ id: string; identityId: string; expiresAt: Date } | undefined> {
    const [row] = await tx
      .select({
        id: emailVerifications.id,
        identityId: emailVerifications.identityId,
        expiresAt: emailVerifications.expiresAt,
      })
      .from(emailVerifications)
      .where(
        and(
          eq(emailVerifications.tokenHash, tokenHash),
          isNull(emailVerifications.verifiedAt),
        ),
      )
      .limit(1);

    return row;
  }

  async markEmailVerified(tx: DbOrTx, id: string): Promise<void> {
    await tx
      .update(emailVerifications)
      .set({ verifiedAt: new Date() })
      .where(eq(emailVerifications.id, id));
  }

  // ─────────────────────────────────────────────────────────
  // PASSWORD RESET
  // ─────────────────────────────────────────────────────────

  async createPasswordReset(
    tx: DbOrTx,
    identityId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await tx
      .insert(passwordResets)
      .values({ identityId, tokenHash, expiresAt });
  }

  async findPendingPasswordReset(
    tx: DbOrTx,
    tokenHash: string,
  ): Promise<{ id: string; identityId: string; expiresAt: Date } | undefined> {
    const [row] = await tx
      .select({
        id: passwordResets.id,
        identityId: passwordResets.identityId,
        expiresAt: passwordResets.expiresAt,
      })
      .from(passwordResets)
      .where(
        and(
          eq(passwordResets.tokenHash, tokenHash),
          isNull(passwordResets.usedAt),
        ),
      )
      .limit(1);

    return row;
  }

  async markPasswordResetUsed(tx: DbOrTx, id: string): Promise<void> {
    await tx
      .update(passwordResets)
      .set({ usedAt: new Date() })
      .where(eq(passwordResets.id, id));
  }
}
