import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { setupOpenApiDocs } from './shared/openapi/setup-openapi-docs.js';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {});
  app.enableShutdownHooks();
  // Fills request.cookies, where /auth/refresh and /auth/logout read the refresh token.
  app.use(cookieParser());
  // whitelist + forbidNonWhitelisted: unknown body fields get a 400 instead of being silently ignored.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  setupOpenApiDocs(app);
  await app.listen(process.env.PORT ?? 3000);
}

await bootstrap();
