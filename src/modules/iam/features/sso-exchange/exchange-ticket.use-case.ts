import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq, and } from 'drizzle-orm';
import { DB_CONNECTION } from '#database/database.constants';
import { ssoExchangeTickets } from '#database/schema';
import { TokenService } from '#common/security';
import {
  MfaRepository,
  SessionsRepository,
  type LoginResult,
} from '#modules/iam/shared';
import { UsersRepository } from '#modules/users/shared/users.repository';
import type { DrizzleDb } from '#database/database.types';
import type { ClientInfoData } from '#common/decorators';
import { Logger } from '@nestjs/common';

@Injectable()
export class ExchangeTicketUseCase {
  private readonly logger = new Logger(ExchangeTicketUseCase.name);
  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly jwtService: JwtService,
    private readonly tokenService: TokenService,
    private readonly usersRepository: UsersRepository,
    private readonly sessionsRepository: SessionsRepository,
    private readonly mfaRepository: MfaRepository,
  ) {}

  async execute(
    rawTicket: string,
    clientInfo: ClientInfoData,
  ): Promise<LoginResult> {
    // 0. Hashear el ticket plano que viene del frontend
    const ticketHash = this.tokenService.hashOpaqueToken(rawTicket);

    // 1. Intentar quemar el ticket atómicamente (Previene Race Conditions de React Strict Mode)
    this.logger.debug(
      `Recibida petición de canje para el ticket (hash: ${ticketHash})...`,
    );

    const [burnedTicket] = await this.db
      .update(ssoExchangeTickets)
      .set({ isUsed: true })
      .where(
        and(
          eq(ssoExchangeTickets.ticketHash, ticketHash),
          eq(ssoExchangeTickets.isUsed, false),
        ),
      )
      .returning();

    if (!burnedTicket) {
      // Si no devolvió nada, significa que no existe o ya estaba usado (isUsed = true)
      // Buscamos para dar el error correcto:
      const [existing] = await this.db
        .select()
        .from(ssoExchangeTickets)
        .where(eq(ssoExchangeTickets.ticketHash, ticketHash))
        .limit(1);

      if (!existing) {
        this.logger.warn(`El ticket no existe en la base de datos.`);
        throw new UnauthorizedException('Ticket inválido o no existe.');
      } else {
        this.logger.warn(
          `¡ATENCIÓN! El ticket de Identity ${existing.identityId} ya fue utilizado. Bloqueado por Update Atómico.`,
        );
        throw new UnauthorizedException('El ticket ya fue utilizado.');
      }
    }

    if (burnedTicket.expiresAt < new Date()) {
      this.logger.warn(`El ticket ha expirado.`);
      throw new UnauthorizedException('El ticket ha expirado.');
    }

    const identityId = burnedTicket.identityId;

    // 3. Comprobar estado de la cuenta
    const user = await this.usersRepository.findById(this.db, identityId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Tu cuenta está inactiva o suspendida.');
    }

    // 4. Comprobar MFA
    const mfaFactor = await this.mfaRepository.findByIdentityId(
      this.db,
      identityId,
    );

    if (mfaFactor?.isVerified) {
      const mfaToken = await this.jwtService.signAsync(
        {
          sub: identityId,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          emailVerified: user.emailVerified,
          mfaPending: true,
        },
        { expiresIn: 300 }, // 5 min
      );
      return { mfaRequired: true, mfaToken };
    }

    const refreshToken = this.tokenService.generateOpaqueToken();
    const newSessionTokenHash = this.tokenService.hashOpaqueToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    const session = await this.sessionsRepository.createSession(this.db, {
      identityId,
      tokenHash: newSessionTokenHash,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      platform: clientInfo.platform,
      city:
        clientInfo.geo?.city?.names?.es ||
        clientInfo.geo?.city?.names?.en ||
        null,
      region:
        clientInfo.geo?.subdivisions?.[0]?.names?.es ||
        clientInfo.geo?.subdivisions?.[0]?.names?.en ||
        null,
      country:
        clientInfo.geo?.country?.names?.es ||
        clientInfo.geo?.country?.names?.en ||
        null,
      countryCode: clientInfo.geo?.country?.iso_code || null,
      continent:
        clientInfo.geo?.continent?.names?.es ||
        clientInfo.geo?.continent?.names?.en ||
        null,
      continentCode: clientInfo.geo?.continent?.code || null,
      latitude: clientInfo.geo?.location?.latitude ?? null,
      longitude: clientInfo.geo?.location?.longitude ?? null,
      timezone: clientInfo.geo?.timezone || null,
      expiresAt,
    });

    const accessToken = await this.jwtService.signAsync({
      sub: identityId,
      email: user.email,
      username: user.username,
      sessionId: session.id,
    });

    this.logger.debug(
      `Sesión creada exitosamente para Identity ID: ${identityId}. Retornando JWTs al cliente.`,
    );

    return {
      mfaRequired: false,
      accessToken,
      refreshToken,
      user: {
        identityId,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
      },
    };
  }
}
