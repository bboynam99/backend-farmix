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
import pg, { PoolConfig } from 'pg';
import TypeOverrides  from 'pg/lib/type-overrides';
import { POOL_LIST_PROVIDER } from './pg.constants';
import { DatabaseService } from './pg.database.service';
import { ExtendedPoolConfig, PgConnection } from './pg.types';

@Module({})
@Global()
export class MainPgModule implements OnApplicationBootstrap, OnApplicationShutdown {
  private static logger = new Logger(MainPgModule.name);

  static forRoot(configs: PgConnection[] = []): DynamicModule {
    const poolProviders = this.createPoolProviders(configs);
    const databaseServiceProvers = this.createDatabaseServiceProviders(configs);
    const poolListProvider = this.createPoolListProviders(poolProviders);

    return {
      module: MainPgModule,
      global: true,
      providers: [
        ...poolProviders,
        ...databaseServiceProvers,
        poolListProvider,
      ],
      exports: [
        ...poolProviders,
        ...databaseServiceProvers,
      ],
    };
  }

  private static createPoolProviders(configs: PgConnection[]): FactoryProvider[] {
    return configs.map((conf) => ({
      provide: conf.poolToken,
      useFactory: async (iocConf?: PoolConfig) => {
        const types = new TypeOverrides();

        const mergedConf: ExtendedPoolConfig  = {
          ...(iocConf || {}),
          ...(conf.connectionOptions || {}),
          types,
        };

        if (mergedConf.treatDateAsStrings) {
          types.setTypeParser(pg.types.builtins.DATE, 'text', (val) => String(val));
        }

        const pool = new pg.Pool(mergedConf);

        pool.on('error', (err) => {
          this.logger.error({ err }, 'pool client encountered with an error, it will be removed from the pool');
        });

        if (conf.traceLogsOn) {

          pool.on('connect', () => {
            this.logger.verbose('the pool client connection was established');
          });

          pool.on('acquire', () => {
            this.logger.verbose('one of the pool client was acquired');
          });

          pool.on('remove', () => {
            this.logger.verbose('one of the pool client was removed');
          });

        }

        return pool;
      },
      inject: conf.configKey ? [conf.configKey] : [],
    }));
  }

  private static createDatabaseServiceProviders(configs: PgConnection[]): Provider[] {
    return configs.map((conf) => ({
      provide: conf.token,
      useFactory: async (pool: pg.Pool) => new DatabaseService(pool),
      inject: [conf.poolToken],
    }));
  }

  private static createPoolListProviders(poolProviders: FactoryProvider[]): Provider {
    return {
      provide: POOL_LIST_PROVIDER,
      useValue: poolProviders.map(({ provide }) => provide),
    };
  }

  private logger = new Logger(MainPgModule.name);

  constructor(
    private moduleRef: ModuleRef,
    @Inject(POOL_LIST_PROVIDER) private poolList: InjectionToken[],
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    for (const token of this.poolList) {
      const pool = this.moduleRef.get(token);

      await pool.query('SELECT NOW()');

      this.logger.debug(`${token.toString()} pg pool has been initialized`);
    }
  }

  async onApplicationShutdown(): Promise<void> {
    for (const token of this.poolList) {
      const pool = this.moduleRef.get(token);

      await pool.end();

      this.logger.debug(`${token.toString()} pg pool has been closed`);
    }
  }
}
