import { Inject, Injectable } from '@nestjs/common';
import { DB_CONNECTION } from '#database/database.constants';
import type { DrizzleDb } from '#database/database.types';
import { SessionsRepository } from '#modules/iam/shared';

export type SessionResponse = {
  id: string;
  ipAddress: string;
  userAgent: string;
  platform: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: Date | null;
  lastUsedAt: Date | null;
  isCurrent: boolean;
};

@Injectable()
export class GetSessionsUseCase {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly sessionsRepository: SessionsRepository,
  ) {}

  async execute(
    identityId: string,
    currentSessionId: string,
  ): Promise<SessionResponse[]> {
    const activeSessions = await this.sessionsRepository.findActiveByUserId(
      this.db,
      identityId,
    );

    return activeSessions.map((session) => ({
      id: session.id,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      platform: session.platform,
      city: session.city,
      country: session.country,
      latitude: session.latitude,
      longitude: session.longitude,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      isCurrent: session.id === currentSessionId,
    }));
  }
}
