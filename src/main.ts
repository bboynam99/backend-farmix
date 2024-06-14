import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { ScheduleModule } from '@nestjs/schedule';
import { startApp } from './bootstrap';
import {
  blockchainSyncConfig,
  httpConfig,
  loggerConfig,
  MAIN_DB_SERVICE,
  MAIN_PG_POOL,
  MAIN_REDIS,
  mainRedisConfig,
  metricsConfig,
  openApiConfig,
  pgConfig,
  TON_CONSOLE,
  tonConsoleConfig,
} from './config';
import { BffModule } from './modules/bff';
import { BlockchainSyncModule } from './modules/blockchain-sync';
import { MainLoggerModule } from './shared/logger';
import { MainMetricsModule } from './shared/metrics';
import { MainPgModule } from './shared/pg';
import { MainRedisModule } from './shared/redis';
import { TonConsoleModule } from './shared/ton-console';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        httpConfig,
        loggerConfig,
        metricsConfig,
        pgConfig,
        tonConsoleConfig,
        mainRedisConfig,
        blockchainSyncConfig,
      ],
    }),
    MainLoggerModule.forRoot(loggerConfig()),
    MainMetricsModule.forRoot(metricsConfig()),
    MainPgModule.forRoot([{
      poolToken: MAIN_PG_POOL,
      token: MAIN_DB_SERVICE,
      configKey: pgConfig.KEY,
    }]),
    ScheduleModule.forRoot(),
    MainRedisModule.forRoot(
      [
        {
          token: MAIN_REDIS,
          configKey: mainRedisConfig.KEY,
        },
      ],
      { pingOnStart: true, closeClients: true, readyLog: true, closeLog: true },
    ),
    TonConsoleModule.forRoot([{
      token: TON_CONSOLE,
      configKey: tonConsoleConfig.KEY,
      disablePing: tonConsoleConfig().disablePing,
    }]),
    BffModule,
    BlockchainSyncModule,
  ],
})
class RootModule {}

const appPromise: Promise<NestFastifyApplication> = startApp(
  RootModule,
  { http: httpConfig(), openapi: openApiConfig() },
);

export default appPromise;