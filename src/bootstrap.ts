import { Logger as BaseLogger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  callAppShutdownHook,
  callBeforeAppShutdownHook,
  callModuleDestroyHook,
} from '@nestjs/core/hooks';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import pino from 'pino';
import { PinoNestLogger } from './shared/logger';
import { boostrapSwagger, GenSwaggerOptions } from './shared/swagger';
import { fastifyReqResLogPlugin } from './shared/transport';
import { getDependent } from './shared/utils/depends-on.decorator';

export interface BootstrapOptions {
  http?: {
    disable?: boolean
    port?: number
    listenAddr?: string
  },
  openapi?: GenSwaggerOptions
}

/**
 * This function fixes modules lifecycle order. Nestjs don't expose mechanism to mark global module as dependency.
 * To fix this we have to dig into nest internals and alter module(s) distance(s).
 * The general nestjs rule for module is the greater is distance the earlier lifecycle hook will be called,
 * and we want dependencies (modules which is dependent from other module(s)) to run lf hooks later than dependent (other module(s)),
 * at least on init hooks (OnModuleInit, OnApplicationBootstrap) this is true.
 */
const adjustModulesDistance = (app: NestFastifyApplication) => {
  // @ts-ignore
  let modules = Array.from(app.container.modules.values());

  const calcDepsDistance = (module: any): number => {
    const dependsOnTypes = getDependent(module._metatype);
    const dependsOnM: any[] = dependsOnTypes
      .map((type) => modules.find((m: any) => m._metatype === type))
      .filter((m) => !!m && m !== modules);

    if (dependsOnM.length === 0) {
      return 0;
    }
    const depsDistances = dependsOnM.map((m) => calcDepsDistance(m));

    return depsDistances.reduce((acc, d) => acc + d, dependsOnM.length);
  };

  const modulesWithDepsDistance = modules.map((module) => {
    return { distance: calcDepsDistance(module), module: module as any };
  });
  modulesWithDepsDistance.sort((a, b) => a.distance - b.distance);

  modules = modulesWithDepsDistance.map(({ module }) => module);
  modules.forEach((module: any) => {
    const dependsOnTypes = getDependent(module._metatype);
    dependsOnTypes.forEach((dependentType: any) => {
      const dependentM: any | undefined = modules.find((m: any) => m._metatype === dependentType);
      if (!dependentM || dependentM === module) {
        return;
      }
      if (dependentM.distance >= module.distance) {
        module.distance = dependentM.distance + 1;
      }
    });
  });
};

/**
 * Nest js call shutdown hooks in same order as init hooks. This function is reverse shutdown hooks.
 * Imagine you have a module which is depends on connection clients module, e.g. it is using clients from this module.
 * When application is closing you want to do clean up for your module, and you need client which is still alive to do that
 * (for example imagine you want to clean tmp rabbit queues).
 * If shutdown kooks will be called in same order as init hooks, you will get already closed client in your module.
 * There is no plan to fix this issue, so we have to monkey patch nestjs internals to make it work properly.
 * See issues
 * https://github.com/nestjs/nest/issues/4599
 * https://github.com/nestjs/nest/pull/8348
 */
const fixShutdownHooksCallOrder = (app: NestFastifyApplication): void => {
  Object.defineProperty(app, 'callDestroyHook', {
    configurable: true,
    writable: true,
    enumerable: true,
    value: async function (): Promise<void> {
      const modulesSortedByDistance = [...this.getModulesToTriggerHooksOn()].reverse();
      for (const module of modulesSortedByDistance) {
        await callModuleDestroyHook(module);
      }
    },
  });
  Object.defineProperty(app, 'callBeforeShutdownHook', {
    configurable: true,
    writable: true,
    enumerable: true,
    value: async function (signal?: string): Promise<void> {
      const modulesSortedByDistance = [...this.getModulesToTriggerHooksOn()].reverse();
      for (const module of modulesSortedByDistance) {
        await callBeforeAppShutdownHook(module, signal);
      }
    },
  });
  Object.defineProperty(app, 'callShutdownHook', {
    configurable: true,
    writable: true,
    enumerable: true,
    value: async function (signal?: string): Promise<void> {
      const modulesSortedByDistance = [...this.getModulesToTriggerHooksOn()].reverse();
      for (const module of modulesSortedByDistance) {
        await callAppShutdownHook(module, signal);
      }
    },
  });
};

const assemble = async (rootModule: any): Promise<NestFastifyApplication> => {
  const app: NestFastifyApplication = await NestFactory.create(
    rootModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );

  app.useLogger(app.get(PinoNestLogger));
  BaseLogger.flush();
  app.enableShutdownHooks();

  adjustModulesDistance(app);
  fixShutdownHooksCallOrder(app);

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    validateCustomDecorators: true,
  }));

  await app.init();

  return app;
};

const bootstrapHttp = async (app: NestFastifyApplication, port: number, listenAddr: string) => {
  await app
    .getHttpAdapter()
    .getInstance()
    // @ts-ignore
    .register(fastifyReqResLogPlugin);

  await app.listen(port, listenAddr);
  BaseLogger.log(`app is listening on ${port} port, accept requests from ${listenAddr}`);
};

const boostrap = async (rootModule: any, options: BootstrapOptions = {}): Promise<NestFastifyApplication> => {
  const app = await assemble(rootModule);

  const shouldClose = await boostrapSwagger(app, options.openapi);
  if (shouldClose) {
    await app.close();

    return app;
  }

  if (!options.http?.disable) {
    await bootstrapHttp(app, options.http?.port ?? 8080, options.http?.listenAddr ?? '127.0.0.1');
  }

  BaseLogger.log('app has been successfully bootstrapped');

  return app;
};

export const startApp = async (rootModule: any, options: BootstrapOptions = {}) : Promise<NestFastifyApplication> => {
  const finalDest = pino.destination({ sync: true, dest: 1 });
  const finalLogger = pino(finalDest) as unknown as PinoNestLogger;

  return boostrap(rootModule, options).catch<never>((err) => {
    finalLogger.error({ err }, 'global error occur, closing process');
    finalDest.flushSync();
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  });
};

