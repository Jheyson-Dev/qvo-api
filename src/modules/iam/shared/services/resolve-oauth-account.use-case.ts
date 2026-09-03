import { Inject, Injectable, Logger } from '@nestjs/common';
import { DB_CONNECTION } from '#database/database.constants';
import { IdentitiesRepository, OauthRepository } from '#modules/iam/shared';
import { UsersRepository } from '#modules/users/shared/users.repository';
import type { DbOrTx, DrizzleDb, DrizzleTx } from '#database/database.types';
import type { OAuthProvider } from '../types/oauth-provider.type';

export type ResolveOAuthAccountParams = {
  provider: OAuthProvider | string;
  providerAccountId: string;
  email: string;
  name?: string;
  picture?: string;
  emailVerified: boolean;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class ResolveOAuthAccountUseCase {
  private readonly logger = new Logger(ResolveOAuthAccountUseCase.name);

  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly identitiesRepository: IdentitiesRepository,
    private readonly usersRepository: UsersRepository,
    private readonly oauthRepository: OauthRepository,
  ) {}

  async execute(params: ResolveOAuthAccountParams): Promise<string> {
    const {
      provider,
      providerAccountId,
      email,
      name,
      picture,
      emailVerified,
      metadata = {},
    } = params;

    const oauthMetadata = {
      name,
      picture,
      email_verified: emailVerified,
      ...metadata,
    };

    // 1. Verificar si ya existe una cuenta OAuth vinculada
    const existingOauth = await this.oauthRepository.findByProviderAndAccountId(
      this.db,
      provider,
      providerAccountId,
    );

    if (existingOauth) {
      this.logger.debug(
        `[Flujo ${provider}] Usuario existente detectado (Identity ID: ${existingOauth.identityId})`,
      );
      return existingOauth.identityId;
    }

    // 2. Nuevo usuario en este provider: verificar si el email ya existe como usuario local
    const existingUser = await this.usersRepository.findByEmail(this.db, email);

    if (existingUser) {
      this.logger.debug(
        `[Flujo ${provider}] Usuario local encontrado con el mismo email. Vinculando cuenta a (Identity ID: ${existingUser.identityId})`,
      );
      await this.oauthRepository.createOauthAccount(this.db, {
        identityId: existingUser.identityId,
        provider,
        providerAccountId,
        metadata: oauthMetadata,
      });
      return existingUser.identityId;
    }

    // 3. Usuario completamente nuevo: crear identidad + usuario + oauth account
    this.logger.debug(
      `[Flujo ${provider}] Nuevo usuario. Creando identidad, usuario local y cuenta OAuth para ${email}...`,
    );
    return await this.db.transaction(async (tx: DrizzleTx) => {
      const identity = await this.identitiesRepository.createIdentity(
        tx,
        'HUMAN',
      );

      const username = await this.generateUsername(tx, email);

      await this.usersRepository.createUser(tx, {
        identityId: identity.id,
        email,
        username,
        displayName: name || email.split('@')[0],
        passwordHash: null, // SSO: sin contraseña local
        emailVerified: emailVerified,
        avatarUrl: picture || null,
      });

      await this.oauthRepository.createOauthAccount(tx, {
        identityId: identity.id,
        provider,
        providerAccountId,
        metadata: oauthMetadata,
      });

      return identity.id;
    });
  }

  private async generateUsername(db: DbOrTx, email: string): Promise<string> {
    const base = email
      .split('@')[0]
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
    const candidate = `${base}${Date.now().toString(36)}`;
    const existing = await this.usersRepository.findByUsername(db, candidate);
    if (existing) {
      // Fallback con 4 chars aleatorios extra (colisión extremadamente improbable)
      return `${candidate}${Math.random().toString(36).slice(2, 6)}`;
    }
    return candidate;
  }
}
