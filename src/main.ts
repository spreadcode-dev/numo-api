import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { setupOpenApiDocs } from './shared/openapi/setup-openapi-docs.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {});
  app.enableShutdownHooks();
  setupOpenApiDocs(app);
  await app.listen(process.env.PORT ?? 3000);
}

await bootstrap();
