import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule } from '@nestjs/swagger';
import { defaultOptions } from './contants';
import { genSwaggerDocument } from './gen-swagger';
import { GenSwaggerOptions } from './types';

export const boostrapSwagger = async (app: NestFastifyApplication, options: GenSwaggerOptions = {}): Promise<boolean> => {
  const iocConfig = options.configKey ? app.get(options.configKey, { strict: false }) : {};
  const mergedOptions = {
    ...defaultOptions,
    ...iocConfig,
    ...options,
  };

  if (!mergedOptions.enabled) {
    return false;
  }

  const document = await genSwaggerDocument(app, mergedOptions);

  if (mergedOptions.genOnly) {
    return true;
  }

  SwaggerModule.setup(mergedOptions.routePrefix, app, document);

  return false;
};