import { GenSwaggerOptions } from './types';

export const defaultOptions: GenSwaggerOptions = {
  routePrefix: 'swagger',
  enabled: false,
  fileName: 'OpenAPI',
  saveFile: true,
  rewriteFile: true,
};