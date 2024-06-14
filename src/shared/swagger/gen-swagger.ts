import { readFile, writeFile } from 'fs/promises';
import { INestApplication, Logger } from '@nestjs/common';
import {
  DocumentBuilder,
  OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';
import { GenSwaggerOptions } from './types';

const logger = new Logger('GenSwagger');

export const genSwaggerDocument = async (app: INestApplication, options: GenSwaggerOptions = {}): Promise<OpenAPIObject> => {
  let builder = new DocumentBuilder();
  if (options.documentBuilderTransformer) {
    builder = await options.documentBuilderTransformer(builder);
  }

  const config = builder.build();

  if (!options.saveFile) {
    logger.verbose('swagger persistence is disabled, generating from scratch...');

    return SwaggerModule.createDocument(app, config, { deepScanRoutes: true });
  }

  const generateAndWriteDoc = async () => {
    const document = SwaggerModule.createDocument(app, config, { deepScanRoutes: true });

    await writeFile(`./${options.fileName}.json`, JSON.stringify(document, null, 2)).catch((error) => logger.error(
      { error },
      'failed to write swagger file',
    ));

    return document;
  };

  if (options.rewriteFile) {
    logger.verbose('generating swagger file');

    return generateAndWriteDoc();
  }

  try {
    return JSON.parse(await readFile(`./${options.fileName}.json`, 'utf-8')) as OpenAPIObject;
  } catch (err: any) {
    logger.verbose('failed to read swagger file, generating from scratch...');

    return generateAndWriteDoc();
  }
};