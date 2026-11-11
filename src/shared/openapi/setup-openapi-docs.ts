import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const DOCS_PATH = 'docs';
const API_TITLE = 'NuMo API';

// Same depth from src/shared/openapi and dist/shared/openapi, so it works in tests and in the build.
const PACKAGE_JSON_PATH = join(import.meta.dirname, '../../../package.json');

type PackageInfo = {
  version: string;
  description: string;
};

const readPackageInfo = (): PackageInfo => {
  const packageJsonContent = readFileSync(PACKAGE_JSON_PATH, 'utf-8');
  return JSON.parse(packageJsonContent) as PackageInfo;
};

const isOpenApiDocsEnabled = (app: INestApplication): boolean => {
  const configService = app.get(ConfigService);
  return configService.get<string>('SWAGGER_ENABLED') !== 'false';
};

const buildDocumentConfig = (): Omit<OpenAPIObject, 'paths'> => {
  const packageInfo = readPackageInfo();

  return new DocumentBuilder()
    .setTitle(API_TITLE)
    .setDescription(packageInfo.description)
    .setVersion(packageInfo.version)
    .addBearerAuth()
    .build();
};

export const setupOpenApiDocs = (app: INestApplication): void => {
  if (!isOpenApiDocsEnabled(app)) {
    return;
  }

  SwaggerModule.setup(DOCS_PATH, app, () => {
    return SwaggerModule.createDocument(app, buildDocumentConfig());
  });
};
