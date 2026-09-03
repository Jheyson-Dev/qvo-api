import { Injectable } from '@nestjs/common';
import { loginAttempts } from '#database/schema';
import type { DbOrTx } from '#database/database.types';

type InsertLoginAttempt = typeof loginAttempts.$inferInsert;

export type RecordAttemptData = {
  identityId?: string;
  email: string;
  ipAddress: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
};

@Injectable()
export class LoginAttemptsRepository {
  async recordAttempt(db: DbOrTx, data: RecordAttemptData): Promise<void> {
    const row: InsertLoginAttempt = {
      identityId: data.identityId ?? null,
      email: data.email,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent ?? null,
      success: data.success,
      failureReason: data.failureReason ?? null,
    };
    await db.insert(loginAttempts).values(row);
  }
}
