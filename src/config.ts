import { registerAs } from '@nestjs/config';
import { DocumentBuilder } from '@nestjs/swagger';
import ev from 'env-var';
import { HardenedFetch } from 'hardened-fetch';
import { ApiConfig } from 'tonapi-sdk-js';
import { MainLoggerModuleConfig } from './shared/logger';
import { MainMetricsModuleOptions } from './shared/metrics';
import { SwaggerDocumentBuilderTransformer } from './shared/swagger';

const defaults = {
  appName: 'FARMIX-CORE-API',
};

export const loggerConfig = registerAs('logger', (): MainLoggerModuleConfig => {
  const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

  return {
    name: ev.get('APP_NAME').default(defaults.appName).asString(),
    level: ev.get('LOG_LEVEL').default('info').asEnum(levels),
    pretty: ev.get('LOG_PRETTY').default('0').asBool(),
    prettyOptions: {
      singleLine: ev.get('LOG_PRETTY_SINGLE_LINE').default('0').asBool(),
    },
    throttleLimit: ev.get('LOG_THROTTLE_LIMIT').default('0').asIntPositive(),
    throttleLimitTttMs: ev.get('LOG_THROTTLE_LIMIT_TTL_MS').default('60000').asIntPositive(),
  };
});

export const metricsConfig = registerAs('metrics', (): MainMetricsModuleOptions => ({
  httpPort: ev.get('METRICS_HTTP_PORT').default('9987').asIntPositive(),
  isMetricsEnabled: ev.get('METRICS_ENABLED').default('0').asBool(),
  collectDefMetrics: ev.get('METRICS_COLLECT_DEFAULT').default('1').asBool(),
  defaultLabels: {
    service: ev.get('APP_NAME').default(defaults.appName).asString(),
  },
}));

export const httpConfig = registerAs('http', () => ({
  disableHttp: ev.get('APP_DISABLE_HTTP').default('0').asBool(),
  port: ev.get('APP_HTTP_PORT').default('8080').asIntPositive(),
  listenAddr: ev.get('APP_LISTEN_ADDR').default('0.0.0.0').asString(),
}));

export const openApiConfig = registerAs('openApi', () => {
  const serveMode = ev.get('OPENAPI_SERVE_MOD_ENABLED').default('0').asBool();
  const routePrefix = ev.get('OPENAPI_ROUTE_PREFIX').default('api/openapi').asString();
  const genMode = ev.get('OPENAPI_GEN_MOD_ENABLED').default('0').asBool();
  const fileName = ev.get('OPENAPI_FILENAME').default('openapi').asString();

  if (serveMode && genMode) {
    throw new Error('serve and gen mode can not work together');
  }

  const documentBuilderTransformer: SwaggerDocumentBuilderTransformer = (builder: DocumentBuilder): DocumentBuilder => {
    return builder
      .setTitle('farmix core api')
      .addServer('https://api.stage.farmix.io/', 'stage server');
  };

  return {
    routePrefix,
    enabled: serveMode || genMode,
    saveFile: genMode,
    rewriteFile: genMode,
    genOnly: genMode,
    fileName,
    documentBuilderTransformer,
  };
});

export const pgConfig = registerAs('pg', () => ({
  connectionString: ev.get('PG_URL').required().asString(),
  statement_timeout: ev.get('PG_STATEMENT_TIMEOUT_MS').default('10000').asInt(),
  query_timeout: ev.get('PG_QUERY_TIMEOUT_MS').default('10000').asInt(),
  connectionTimeoutMillis: ev.get('PG_CONNECTION_TIMEOUT_MS').default('5000').asInt(),
  application_name: ev.get('APP_NAME').default(defaults.appName).asString(),
  idle_in_transaction_session_timeout: ev.get('PG_IDLE_IN_TRANSACTION_SESSION_TIMEOUT_MS').default('10000').asInt(),
  idleTimeoutMillis: ev.get('PG_IDLE_TIMEOUT_MS').default('10000').asInt(),
  max: ev.get('PG_POOL_MAX').default('10').asInt(),
  allowExitOnIdle: ev.get('PG_ALLOW_EXIT_ON_IDLE').default('0').asBool(),
}));

export const MAIN_PG_POOL = Symbol('MAIN_PG_POOL');
export const MAIN_DB_SERVICE = Symbol('MAIN_DB_SERVICE');

export const mainRedisConfig = registerAs('mainRedis', () => {
  return {
    url: ev.get('REDIS_URL').required().asString(),
    username: ev.get('REDIS_USERNAME').asString(),
    password: ev.get('REDIS_PASSWORD').asString(),
    enableReadyCheck: true,
  };
});

export const MAIN_REDIS = Symbol('MAIN_REDIS');

export const tonConsoleConfig = registerAs(
  'tonConsole',
  (): ApiConfig & { disablePing: boolean, timeout: () => AbortSignal, transactionsBatchSize: number, ratesCacheTtlSec: number } => {
    const baseUrl = ev.get('TON_CONSOLE_BASE_URL').default('https://tonapi.io').asString();
    const apiKey = ev.get('TON_CONSOLE_API_KEY').asString();
    // How many requests can be running at the same time.
    const maxConcurrency = ev.get('TON_CONSOLE_REQUEST_MAX_CONCURRENCY').default('10').asIntPositive();
    // How long to wait after launching a request before launching another one.
    const minRequestTime = ev.get('TON_CONSOLE_MIN_REQUEST_TIME_MS').default('1000').asIntPositive();
    const timeoutMs = ev.get('TON_CONSOLE_REQUEST_TIMEOUT_MS').default('5000').asIntPositive();
    const transactionsBatchSize = ev.get('TON_CONSOLE_TRANSACTIONS_BATCH_SIZE').default('100').asIntPositive();

    const headers: Record<string, string> = {
      'Content-type': 'application/json',
    };

    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const hardenedFetch = new HardenedFetch({
      maxConcurrency,
      minRequestTime,
      maxRetries: 3,
      doNotRetry: [400, 401, 403, 404, 422, 451],
    });

    return {
      baseUrl,
      baseApiParams: { headers },
      customFetch: hardenedFetch.fetch.bind(hardenedFetch) as typeof fetch,
      disablePing: ev.get('TON_CONSOLE_DISABLE_PING').default('false').asBool(),
      transactionsBatchSize,
      timeout: () => AbortSignal.timeout(timeoutMs),
      ratesCacheTtlSec: ev.get('TON_CONSOLE_RATES_TTL_SEC').default('10').asIntPositive(),
    };
  });

export const TON_CONSOLE = Symbol('TON_CONSOLE');

export const blockchainSyncConfig = registerAs('blockchainSync', () => {
  const stakingPoolsSyncIntervSec = ev.get('BC_SYNC_STAKING_POOLS_INTERVAL_SEC').default('6').asIntPositive();
  if (stakingPoolsSyncIntervSec < 5) {
    throw new Error('BC_SYNC_STAKING_POOL_INTERVAL_SEC can not be less than 5');
  }
  const stakingPoolsNftCollectionsSyncIntervSec = ev.get('BC_SYNC_STAKING_POOLS_NFT_COLLECTIONS_INTERVAL_SEC').default('6').asIntPositive();
  if (stakingPoolsNftCollectionsSyncIntervSec < 5) {
    throw new Error('BC_SYNC_STAKING_POOLS_NFT_COLLECTIONS_INTERVAL_SEC can not be less than 5');
  }

  return {
    stakingPoolsSyncIntervSec,
    stakingPoolsNftCollectionsSyncIntervSec,
  };
});