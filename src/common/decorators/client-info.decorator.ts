import { createParamDecorator, ExecutionContext, Logger } from '@nestjs/common';
import { getClientIp } from 'get-client-ip';
import { find as findTimezone } from 'geo-tz/all';
import maxmind, { CityResponse, Reader } from 'maxmind';
import DeviceDetector from 'node-device-detector';
import ClientHints from 'node-device-detector/client-hints';
import path from 'node:path';

const logger = new Logger('ClientInfo');

const detector = new DeviceDetector({
  clientIndexes: true,
  deviceIndexes: true,
  deviceAliasCode: false,
});

const clientHints = new ClientHints();

const LOCALHOST_IPS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

// ─────────────────────────────────────────────────────────────────────────────
// DB-IP CITY LITE
// ─────────────────────────────────────────────────────────────────────────────

let geoipReader: Reader<CityResponse> | null = null;
let geoipInitPromise: Promise<void> | null = null;

async function getGeoipReader() {
  if (geoipReader) {
    return geoipReader;
  }

  if (!geoipInitPromise) {
    geoipInitPromise = (async () => {
      try {
        const dbPath = path.resolve(
          process.cwd(),
          'data',
          'dbip-city-lite.mmdb',
        );

        geoipReader = await maxmind.open<CityResponse>(dbPath);

        logger.log(
          `Lector DB-IP City Lite inicializado exitosamente → ${dbPath}`,
        );
      } catch (error) {
        logger.error('Error al inicializar DB-IP City Lite:', error);

        geoipReader = null;
      }
    })();
  }

  await geoipInitPromise;

  return geoipReader;
}

// Inicialización en segundo plano
getGeoipReader().catch((error) => {
  logger.error('Error inesperado inicializando DB-IP:', error);
});

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type ClientInfoData = {
  ipAddress: string;
  userAgent: string;
  platform: string;
  browser: string | null;
  operatingSystem: string | null;
  geo: (CityResponse & { timezone: string | null }) | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// DECORATOR
// ─────────────────────────────────────────────────────────────────────────────

export const ClientInfo = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ClientInfoData => {
    const request = ctx
      .switchToHttp()
      .getRequest<import('fastify').FastifyRequest>();

    // ───────────────────────────────────────────────────────────────────────
    // PASO 1: OBTENER IP
    // ───────────────────────────────────────────────────────────────────────

    const rawIp =
      request.headers['cf-connecting-ip'] ||
      request.headers['x-forwarded-for'] ||
      getClientIp(request.raw) ||
      request.ip ||
      '127.0.0.1';

    const ipAddress = Array.isArray(rawIp)
      ? String(rawIp[0]).trim()
      : String(rawIp).split(',')[0].trim();

    logger.debug(
      `[1] get-client-ip → rawIp="${String(rawIp)}" | ipAddress="${ipAddress}"`,
    );

    // ───────────────────────────────────────────────────────────────────────
    // PASO 2: DEVICE DETECTION
    // ───────────────────────────────────────────────────────────────────────

    const userAgent = request.headers['user-agent'] || '[NO_UA]';

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const hints = clientHints.parse(request.headers as any, {});

    logger.debug(
      `[2] ClientHints → Sec-CH-UA="${
        request.headers['sec-ch-ua']
          ? String(request.headers['sec-ch-ua'])
          : '[NOT_PRESENT]'
      }" | UA="${userAgent}"`,
    );

    const deviceResult = detector.detect(userAgent, hints);

    const os = deviceResult.os?.name || null;
    const client = deviceResult.client?.name || null;

    const platform = `${client ?? '[NO_CLIENT]'} on ${os ?? '[NO_OS]'}`;

    logger.debug(
      `[2] node-device-detector → os="${os ?? '[NO_OS]'}" | client="${client ?? '[NO_CLIENT]'}" | platform="${platform}"`,
    );

    // ───────────────────────────────────────────────────────────────────────
    // PASO 3: DB-IP CITY LITE
    // ───────────────────────────────────────────────────────────────────────

    let geo: ClientInfoData['geo'] = null;

    if (LOCALHOST_IPS.has(ipAddress)) {
      logger.debug(
        `[3] db-ip → IP "${ipAddress}" es localhost, lookup omitido → geo=null`,
      );
    } else if (!geoipReader) {
      logger.debug(
        `[3] db-ip → Base de datos aún no cargada o no disponible → geo=null`,
      );
    } else {
      try {
        const response = geoipReader.get(ipAddress);

        // DEBUG TEMPORAL PARA LA FASE DE PRUEBAS
        logger.debug(
          `[3] db-ip → respuesta completa: ${JSON.stringify(response)}`,
        );

        if (response) {
          const latitude = response.location?.latitude ?? null;
          const longitude = response.location?.longitude ?? null;

          let timezone: string | null = null;
          if (latitude !== null && longitude !== null) {
            const tz = findTimezone(latitude, longitude);
            timezone = tz && tz.length > 0 ? tz[0] : null;
          }

          geo = {
            ...response,
            timezone,
          };

          logger.debug(
            `[3] db-ip → city="${geo.city?.names?.es || geo.city?.names?.en}" | lat="${geo.location?.latitude}" | lon="${geo.location?.longitude}"`,
          );
        } else {
          logger.debug(
            `[3] db-ip → No se encontró información para IP "${ipAddress}"`,
          );
        }
      } catch (error) {
        logger.debug(
          `[3] db-ip → Error buscando IP "${ipAddress}" → ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    // ───────────────────────────────────────────────────────────────────────
    // RESULTADO FINAL
    // ───────────────────────────────────────────────────────────────────────

    const clientInfo: ClientInfoData = {
      ipAddress,
      userAgent,
      platform,
      browser: client,
      operatingSystem: os,
      geo,
    };

    logger.log(
      `ClientInfo resuelto → ip="${clientInfo.ipAddress}" | platform="${clientInfo.platform}" | geo="${geo ? 'success' : 'null'}"`,
    );

    return clientInfo;
  },
);
