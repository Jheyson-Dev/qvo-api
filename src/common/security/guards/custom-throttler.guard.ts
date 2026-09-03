import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { getClientIp } from 'get-client-ip';
import type { FastifyRequest } from 'fastify';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    const fastifyReq = req as FastifyRequest;

    // ¡Usamos tu misma lógica del decorador para máxima consistencia!
    const rawIp =
      fastifyReq.headers['cf-connecting-ip'] ||
      fastifyReq.headers['x-forwarded-for'] ||
      getClientIp(fastifyReq.raw) ||
      fastifyReq.ip ||
      '127.0.0.1';

    const ipAddress = Array.isArray(rawIp)
      ? String(rawIp[0]).trim()
      : String(rawIp).split(',')[0].trim();

    return Promise.resolve(ipAddress);
  }
}
