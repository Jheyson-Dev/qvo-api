import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { devices } from '#database/schema';
import type { DbOrTx } from '#database/database.types';

export type UpsertDeviceData = {
  identityId: string;
  fingerprint?: string;
  browser?: string | null;
  operatingSystem?: string | null;
  ipAddress: string;
};

@Injectable()
export class DevicesRepository {
  /**
   * Busca un dispositivo por (identityId, fingerprint) y lo actualiza,
   * o inserta uno nuevo si no existe. Si no hay fingerprint, siempre inserta.
   * Devuelve el device.id resultante.
   */
  async upsertDevice(db: DbOrTx, data: UpsertDeviceData): Promise<string> {
    // Sin fingerprint → siempre insertamos (no podemos agrupar sin identificador)
    if (!data.fingerprint) {
      const [device] = await db
        .insert(devices)
        .values({
          identityId: data.identityId,
          fingerprint: null,
          browser: data.browser ?? null,
          operatingSystem: data.operatingSystem ?? null,
          ipAddress: data.ipAddress,
          lastSeenAt: new Date(),
        })
        .returning({ id: devices.id });

      return device.id;
    }

    // Con fingerprint → buscar dispositivo existente
    const [existing] = await db
      .select({ id: devices.id })
      .from(devices)
      .where(
        and(
          eq(devices.identityId, data.identityId),
          eq(devices.fingerprint, data.fingerprint),
        ),
      )
      .limit(1);

    if (existing) {
      // Dispositivo conocido → actualizar actividad
      await db
        .update(devices)
        .set({
          lastSeenAt: new Date(),
          ipAddress: data.ipAddress,
          browser: data.browser ?? null,
          operatingSystem: data.operatingSystem ?? null,
        })
        .where(eq(devices.id, existing.id));

      return existing.id;
    }

    // Nuevo dispositivo con fingerprint → insertar
    const [device] = await db
      .insert(devices)
      .values({
        identityId: data.identityId,
        fingerprint: data.fingerprint,
        browser: data.browser ?? null,
        operatingSystem: data.operatingSystem ?? null,
        ipAddress: data.ipAddress,
        lastSeenAt: new Date(),
      })
      .returning({ id: devices.id });

    return device.id;
  }
}
