import type { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DATABASE_HEALTH_INDICATOR,
  type DatabaseHealthIndicator,
} from '../../modules/health/application/database-health-indicator.js';
import { HealthController } from '../../modules/health/presentation/health.controller.js';
import { setupOpenApiDocs } from './setup-openapi-docs.js';

const PACKAGE_JSON_PATH = join(import.meta.dirname, '../../../package.json');
const NOT_FOUND = 404;

class FakeDatabaseHealthIndicator implements DatabaseHealthIndicator {
  async isUp(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

describe('setupOpenApiDocs', () => {
  let app: INestApplication;

  async function startApp(): Promise<string> {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ ignoreEnvFile: true })],
      controllers: [HealthController],
      providers: [
        {
          provide: DATABASE_HEALTH_INDICATOR,
          useClass: FakeDatabaseHealthIndicator,
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    setupOpenApiDocs(app);
    await app.listen(0, '127.0.0.1');
    return app.getUrl();
  }

  async function fetchOpenApiDocument(): Promise<Record<string, any>> {
    const baseUrl = await startApp();
    const response = await fetch(`${baseUrl}/docs-json`);
    return (await response.json()) as Record<string, any>;
  }

  afterEach(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  it('should serve an OpenAPI 3 document', async () => {
    // Arrange
    vi.stubEnv('SWAGGER_ENABLED', 'true');

    // Act
    const document = await fetchOpenApiDocument();

    // Assert
    expect(document.openapi).toMatch(/^3\./);
  });

  it('should list GET /health in the document', async () => {
    // Arrange
    vi.stubEnv('SWAGGER_ENABLED', 'true');

    // Act
    const document = await fetchOpenApiDocument();

    // Assert
    expect(document.paths['/health']).toHaveProperty('get');
  });

  it('should show the version from package.json', async () => {
    // Arrange
    vi.stubEnv('SWAGGER_ENABLED', 'true');
    const { version } = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf8'));

    // Act
    const document = await fetchOpenApiDocument();

    // Assert
    expect(document.info.version).toBe(version);
  });

  it('should offer Bearer token authorization', async () => {
    // Arrange
    vi.stubEnv('SWAGGER_ENABLED', 'true');

    // Act
    const document = await fetchOpenApiDocument();

    // Assert
    expect(document.components.securitySchemes.bearer).toEqual({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });
  });

  it('should serve the docs when SWAGGER_ENABLED is not set', async () => {
    // Arrange
    vi.stubEnv('SWAGGER_ENABLED', undefined);

    // Act
    const document = await fetchOpenApiDocument();

    // Assert
    expect(document.paths).toHaveProperty('/health');
  });

  it('should not register the docs when SWAGGER_ENABLED is false', async () => {
    // Arrange
    vi.stubEnv('SWAGGER_ENABLED', 'false');
    const baseUrl = await startApp();

    // Act
    const docsPage = await fetch(`${baseUrl}/docs`);
    const docsJson = await fetch(`${baseUrl}/docs-json`);

    // Assert
    expect(docsPage.status).toBe(NOT_FOUND);
    expect(docsJson.status).toBe(NOT_FOUND);
  });

  it('should keep the other routes working when the docs are disabled', async () => {
    // Arrange
    vi.stubEnv('SWAGGER_ENABLED', 'false');
    const baseUrl = await startApp();

    // Act
    const response = await fetch(`${baseUrl}/health`);

    // Assert
    expect(response.status).toBe(200);
  });

  it('should declare the refresh_token cookie as an auth scheme', async () => {
    // Arrange
    vi.stubEnv('SWAGGER_ENABLED', 'true');

    // Act
    const document = await fetchOpenApiDocument();

    // Assert
    expect(document.components.securitySchemes.cookie).toMatchObject({
      type: 'apiKey',
      in: 'cookie',
      name: 'refresh_token',
    });
  });
});
