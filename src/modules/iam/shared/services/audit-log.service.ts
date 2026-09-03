import { Inject, Injectable, Logger } from '@nestjs/common';
import { DB_CONNECTION } from '#database/database.constants';
import type { DrizzleDb } from '#database/database.types';
import {
  AuditLogsRepository,
  type AuditLogData,
} from '#modules/iam/shared/repositories/audit-logs.repository';

/**
 * Servicio centralizado para registrar eventos de seguridad sensibles.
 *
 * Patrón "Fire and Forget":
 * Al llamar a log(), el método NO es async desde la perspectiva del llamador.
 * El caso de uso llama `void this.auditLogService.log(...)` y continúa inmediatamente.
 * Si el insert falla (error puntual de BD), solo se loguea el error en consola
 * sin afectar el flujo principal ni la respuesta al usuario.
 *
 * Nomenclatura de acciones estándar (recurso.accion):
 *   user.password_reset
 *   mfa.disabled
 *   mfa.disabled_with_backup
 *   session.revoked
 *   session.bulk_revoked
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDb,
    private readonly auditLogsRepository: AuditLogsRepository,
  ) {}

  /**
   * Registra un evento de auditoría de forma asíncrona sin bloquear el flujo principal.
   * SIEMPRE llamar con `void`:
   * @example
   * void this.auditLogService.log({ action: 'mfa.disabled', actorId: user.sub });
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      await this.auditLogsRepository.insert(this.db, data);
    } catch (error) {
      // Un fallo de logging NUNCA debe interrumpir el flujo principal.
      // Solo registramos el error en consola para diagnóstico.
      this.logger.error(
        `[AuditLog] Error al registrar evento "${data.action}" para actor "${data.actorId ?? 'SYSTEM'}": ${(error as Error).message}`,
      );
    }
  }
}
