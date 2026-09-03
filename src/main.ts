import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import fastifyCookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  const configService = app.get(ConfigService);

  // ── HELMET ────────────────────────────────────────────────────────────────
  await app.register(helmet, {
    // CSP desactivado porque esta es una API puramente de datos (JSON) 
    // consumida por clientes móviles, bots y web, sin renderizar HTML.
    contentSecurityPolicy: false,
  });

  // ── CORS ──────────────────────────────────────────────────────────────────
  app.enableCors({
    // Permite el frontend oficial, si no está definido asume un origen seguro local
    origin:
      configService.get<string>('app.frontendUrl') || 'http://localhost:5173',
    credentials: true, // Necesario si usas cookies o headers de autorización
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  // ── Global prefix: todas las rutas quedan bajo /api/v1 ────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Swagger / OpenAPI ─────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('QVO API')
    .setDescription(
      'Documentación de la API REST del proyecto QVO. ' +
        'Los schemas de request/response se derivan directamente de los schemas Zod.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        in: 'header',
        description: 'Introduce tu Access Token JWT: Bearer <token>',
      },
      'access-token', // nombre del esquema de seguridad, referenciado con @ApiBearerAuth('access-token')
    )
    .build();

  const openApiDoc = SwaggerModule.createDocument(app, swaggerConfig);
  // cleanupOpenApiDoc es OBLIGATORIO con nestjs-zod para obtener el output correcto
  SwaggerModule.setup('docs', app, cleanupOpenApiDoc(openApiDoc), {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
  // ─────────────────────────────────────────────────────────────────────────

  await app.register(fastifyCookie, {
    secret: configService.get<string>('app.jwt.secret'),
  });

  const port = configService.get<number>('app.port') || 3000;

  await app.listen(port, '0.0.0.0');

  const url = await app.getUrl();
  console.log(`Application is running on: ${url}`);
  console.log(`Swagger UI available at:   ${url}/docs`);
}
bootstrap().catch((err) => {
  console.error('Error crítico al iniciar la aplicación:', err);
  process.exit(1);
});
