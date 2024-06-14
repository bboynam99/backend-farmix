import { Logger } from '@nestjs/common';
import { FastifyInstance } from 'fastify';
import { pick } from 'remeda';

export interface FastifyHttpReqResLogPluginOptions {
  logger?: Logger
}

const fastifyReqResLogPlugin = async function (fastify: FastifyInstance, options: FastifyHttpReqResLogPluginOptions) {
  const logger = options?.logger || new Logger('FastifyHttpReqResLogPlugin');

  fastify.addHook('preValidation', async (req) => {
    const request = pick(req, ['body', 'query', 'ip', 'protocol', 'id', 'method', 'url', 'headers', 'params']);

    logger.verbose({ request, transport: 'http' }, 'Http incoming request');
  });

  fastify.addHook('onSend', async (req, res, payload): Promise<void> => {
    const response = {
      code: res.statusCode,
      payload,
      headers: res.getHeaders(),
    };

    logger.verbose({ response, transport: 'http' }, 'Http outgoing response');
  });
};

/*
  https://www.fastify.io/docs/latest/Reference/Plugins/#handle-the-scope
  By default fastify creates isolated context for each plugin, this plugin should work in global context,
  this Symbol cancel isolated context creation.
 */
// @ts-ignore
fastifyReqResLogPlugin[Symbol.for('skip-override')] = true;

export { fastifyReqResLogPlugin };
