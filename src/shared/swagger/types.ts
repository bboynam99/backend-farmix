import { DocumentBuilder } from '@nestjs/swagger';

export type SwaggerDocumentBuilderTransformer = (builder: DocumentBuilder) => DocumentBuilder | Promise<DocumentBuilder>;

export interface GenSwaggerOptions {
  configKey?: string | symbol
  routePrefix?: string
  enabled?: boolean
  fileName?: string
  saveFile?: boolean
  rewriteFile?: boolean
  genOnly?: boolean
  documentBuilderTransformer?: SwaggerDocumentBuilderTransformer
}
