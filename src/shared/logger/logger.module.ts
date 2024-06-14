import {
  DynamicModule,
  Global,
  Logger,
  Module,
  Provider,
} from '@nestjs/common';
import pino, {
  DestinationStream,
  LoggerOptions,
  TransportTargetOptions,
} from 'pino';
import {
  CONTEXT_FIELD_NAME,
  defaultContextFieldName,
  defaultLoggerConfig,
  PINO_ROOT_LOGGER,
  PINO_TRANSPORT,
  THROTTLE_CACHE_MAP,
} from './constants';
import { PinoNestLogger } from './nest-logger';
import { PinoLogger } from './pino-logger';
import { MainLoggerModuleConfig } from './types';

@Module({})
@Global()
export class MainLoggerModule {
  private static logger = new Logger(MainLoggerModule.name);

  static forRoot(inputConf?: MainLoggerModuleConfig): DynamicModule {
    const config = {
      ...defaultLoggerConfig,
      ...(inputConf || {}),
    };

    const contextFieldNameProvider = this.createContextFieldNameProvider(config);
    const logTransportProvider = this.createTransportProvider(config);
    const throttleLimitCacheProvider = this.createThrottleCacheMapProvider(config);
    const rootPinoLoggerProvider = this.createPinoRootLoggerProvider(config);

    return {
      module: MainLoggerModule,

      providers: [
        logTransportProvider,
        contextFieldNameProvider,
        throttleLimitCacheProvider,
        rootPinoLoggerProvider,
        PinoLogger,
        PinoNestLogger,
      ],
      exports: [
        logTransportProvider,
        contextFieldNameProvider,
        throttleLimitCacheProvider,
        rootPinoLoggerProvider,
        PinoLogger,
        PinoNestLogger,
      ],
    };
  }

  private static createContextFieldNameProvider(config: MainLoggerModuleConfig): Provider {
    return {
      provide: CONTEXT_FIELD_NAME,
      useFactory: (iocConf: MainLoggerModuleConfig) => {
        const mergedConfig = {
          ...(iocConf || {}),
          ...config,
        };

        return mergedConfig.contextFieldName || defaultContextFieldName;
      },
      inject: config.configKey ? [config.configKey] : [],
    };
  }

  private static createPinoRootLoggerProvider(config: MainLoggerModuleConfig): Provider {
    return {
      provide: PINO_ROOT_LOGGER,
      useFactory: (transport: pino.DestinationStream, throttleCache: Map<string, number>, iocConf?: MainLoggerModuleConfig) => {
        const mergedConfig = {
          ...(iocConf || {}),
          ...config,
        };

        const hooks: LoggerOptions['hooks'] = {};

        if (mergedConfig.throttleLimit) {
          hooks.logMethod = function (args, method) {
            const argsKey = args.toString();
            const amountOfLogs = throttleCache.get(argsKey) ?? 0;

            if (amountOfLogs < mergedConfig.throttleLimit!) {
              throttleCache.set(argsKey, amountOfLogs + 1);

              method.apply(this, args as Parameters<typeof method>);
            }
          };
        }

        return pino({ ...mergedConfig, hooks }, transport);
      },
      inject: config.configKey
        ? [PINO_TRANSPORT, THROTTLE_CACHE_MAP, config.configKey]
        : [PINO_TRANSPORT, THROTTLE_CACHE_MAP]
      ,
    };
  }

  private static createTransportProvider(config: MainLoggerModuleConfig): Provider<DestinationStream> {
    return {
      provide: PINO_TRANSPORT,
      useFactory: (iocConf?: MainLoggerModuleConfig) => {
        const mergedConfig = {
          ...(iocConf || {}),
          ...config,
        };

        const targets: TransportTargetOptions[] = [];

        if (mergedConfig.pretty) {
          this.logger.log('stdout log transport enabled with pretty option');

          targets.push({
            target: 'pino-pretty',
            options: {
              colorize: true,
              destination: 1,
              ...mergedConfig.prettyOptions,
            },
            level: 'trace',
          });
        } else {
          this.logger.log('stdout log transport enabled');

          targets.push({
            target: 'pino/file',
            options: { destination: 1 },
            level: 'trace',
          });
        }

        return pino.transport({ targets });
      },
      inject: config.configKey ? [config.configKey] : [],
    };
  }

  private static createThrottleCacheMapProvider(config: MainLoggerModuleConfig): Provider {
    return {
      provide: THROTTLE_CACHE_MAP,
      useFactory: (iocConf?: MainLoggerModuleConfig) => {
        const mergedConfig = {
          ...(iocConf || {}),
          ...config,
        };

        const map = new Map();

        if (!mergedConfig.throttleLimitTttMs) {
          this.logger.warn('throttle limit ttl for logs is disabled, throttle cache map will never be cleared');

          return map;
        }

        setInterval(() => map.clear(), mergedConfig.throttleLimitTttMs).unref();

        return map;
      },
      inject: config.configKey ? [config.configKey] : [],
    };
  }
}

