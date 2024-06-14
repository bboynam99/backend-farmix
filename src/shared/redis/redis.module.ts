import {
  DynamicModule,
  FactoryProvider,
  Global,
  Inject,
  InjectionToken,
  Logger,
  Module,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  Provider,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import IORedis from 'ioredis';
import {
  defaultRedisModuleConfig,
  REDIS_CLIENTS_LIST,
  REDIS_CONNECTION_METRICS,
  REDIS_MODULE_CONFIG,
} from './constants';
import { createMetricsProvider, RedisMetrics } from './redis.metrics';
import { RedisClientOptions, RedisModuleOptions } from './types';
import { METRICS_REGISTER_SERVICE, MetricsRegistryService } from '../metrics';

interface FullModuleOptions extends RedisModuleOptions {
  configs: RedisClientOptions[]
}

@Module({})
@Global()
export class MainRedisModule implements OnApplicationShutdown, OnApplicationBootstrap {
  static readonly logger = new Logger(MainRedisModule.name);

  static forRoot(connectionsOptions?: RedisClientOptions[], moduleOptions?: RedisModuleOptions): DynamicModule {
    const moduleConfig = this.createModuleConfigProvider(moduleOptions);
    const redisClientsProviders = this.createRedisClientsProviders(connectionsOptions);
    const redisClientsListProvider = this.createRedisClientsListProvider(redisClientsProviders);

    return {
      module: MainRedisModule,
      global: true,
      providers: [
        moduleConfig,
        ...redisClientsProviders,
        redisClientsListProvider,
        createMetricsProvider(),
      ],
      exports: [...redisClientsProviders],
    };
  }

  private static createModuleConfigProvider(moduleOptions: RedisModuleOptions = {}): Provider<RedisModuleOptions> {
    return {
      provide: REDIS_MODULE_CONFIG,
      useValue: {
        ...defaultRedisModuleConfig,
        ...moduleOptions,
      },
    };
  }

  private static createRedisClientsProviders(inputConnOptions: RedisClientOptions[] = []): FactoryProvider<IORedis>[] {
    const connOptions: RedisClientOptions[] = [...inputConnOptions];

    return connOptions.map((conf) => ({
      provide: conf.token,
      inject: [
        REDIS_CONNECTION_METRICS,
        REDIS_MODULE_CONFIG,
        ...(conf.configKey ? [conf.configKey] : []),
      ],
      useFactory: async (metrics: RedisMetrics, moduleConf: RedisModuleOptions, injectedConf?: RedisClientOptions) => {
        const resolvedConfig: RedisClientOptions = {
          ...(moduleConf.commonClientsOptions || {}),
          ...conf,
          ...(injectedConf || {}),
        };

        const {
          url,
          onClientCreated,
          token,
          collectRedisInfo,
          collectRedisInfoEveryMs,
          ...redisOptions
        } = resolvedConfig;
        const client = url ? new IORedis(url, redisOptions) : new IORedis(redisOptions);

        if (onClientCreated) {
          await onClientCreated(client);
        }

        client.on('error', (err: Error) => {
          this.logger.error({ err }, `${conf.token.toString()} redis client encountered with an error`);
        });

        if (moduleConf.readyLog) {
          client.on('ready', () => {
            this.logger.log(`${conf.token.toString()} redis client connected successfully to the server and ready`);
          });
        }

        if (moduleConf.closeLog) {
          client.on('end', () => {
            this.logger.log(`${conf.token.toString()} redis client connection has been closed`);
          });
        }

        if (collectRedisInfo) {
          const id = conf.token.toString();

          client.on('ready', () => {
            metrics.startCollectingFrom(
              id, client, collectRedisInfoEveryMs,
            );
          });
          client.on('end', () => {
            metrics.stopCollectingFrom(id);
          });
        }

        return client;
      },
    }));
  }

  private static createRedisClientsListProvider(clientsProviders: FactoryProvider<IORedis>[]): Provider<InjectionToken[]> {
    return {
      provide: REDIS_CLIENTS_LIST,
      useValue: clientsProviders.map(({ provide }) => provide),
    };
  }

  private readonly logger = new Logger(`${MainRedisModule.name}(instance)`);

  constructor(
    @Inject(REDIS_MODULE_CONFIG) private readonly moduleConf: FullModuleOptions,
    @Inject(REDIS_CLIENTS_LIST) private readonly clientsList: InjectionToken[],
    @Inject(REDIS_CONNECTION_METRICS) private readonly metrics: RedisMetrics,
    private moduleRef: ModuleRef,
  ) {}

  async onModuleInit() {
    this.registerMetrics();
  }

  async onApplicationBootstrap() {
    if (!this.moduleConf.pingOnStart) {
      return;
    }

    const promises = this.clientsList.map(async (token) => {
      const client = this.moduleRef.get<IORedis>(token);
      await client.ping();
    });

    await Promise.all(promises);
  }

  async onApplicationShutdown() {
    if (!this.moduleConf.closeClients) {
      return;
    }

    const promises = this.clientsList.map(async (token) => {
      const client = this.moduleRef.get<IORedis>(token);

      try {
        if (client.status !== 'ready') {
          client.disconnect(false);
          this.logger.warn(`${token.toString()} redis client was disconnected forcibly, because client status was not ready`);
        } else {
          await client.quit();
          this.logger.debug(`${token.toString()} redis client successfully disconnected`);
        }
      } catch (err: any) {
        this.logger.warn(`${token.toString()} redis client failed to disconnect, reason: ${err.message}`);
      }
    });

    await Promise.all(promises);
  }

  private registerMetrics() {
    const reg = this.getMetricsRegistryService();

    if (!reg) return;

    this.metrics.registerIn(reg);
  }

  private getMetricsRegistryService(): MetricsRegistryService | undefined {
    try {
      const reg = this.moduleRef.get<MetricsRegistryService, MetricsRegistryService>(METRICS_REGISTER_SERVICE, { strict: false });

      if (!reg) {
        this.logger.verbose('Failed to register metrics, metrics module is not connected');

        return undefined;
      }

      return reg;
    } catch (error) {
      this.logger.verbose('Failed to register metrics, metrics module is not connected');
    }

    return undefined;
  }
}
