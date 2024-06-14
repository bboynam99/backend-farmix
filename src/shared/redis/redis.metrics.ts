import { FactoryProvider, Logger } from '@nestjs/common';
import IORedis from 'ioredis';
import { Gauge } from 'prom-client';
import { REDIS_CONNECTION_METRICS } from './constants';
import { parseInfo } from './parse-info';
import { MetricsRegistryService } from '../metrics';

interface TrackedClient {
  client: IORedis,
  collectInterval: NodeJS.Timer,
}

export class RedisMetrics {
  private static readonly METRIC_PREFIX = 'redis_info';
  private static readonly COMMON_LABELS = ['redis'] as const;

  private readonly logger = new Logger(RedisMetrics.name);

  public readonly version = new Gauge({
    name: `${RedisMetrics.METRIC_PREFIX}_version`,
    help: 'Redis\' version (redis_version in INFO command)',
    labelNames: [
      ...RedisMetrics.COMMON_LABELS,
      'version', 'major', 'minor', 'patch',
    ] as const,
    registers: [],
  });

  public readonly memAvailBytes = new Gauge({
    name: `${RedisMetrics.METRIC_PREFIX}_memory_available_bytes`,
    help: 'Amount of memory available for Redis (total_system_memory in INFO command)',
    labelNames: RedisMetrics.COMMON_LABELS,
    registers: [],
  });

  public readonly memUsedBytes = new Gauge({
    name: `${RedisMetrics.METRIC_PREFIX}_memory_used_bytes`,
    help: 'Amount of memory used for Redis (used_memory in INFO command)',
    labelNames: RedisMetrics.COMMON_LABELS,
    registers: [],
  });

  public readonly sysCpuLoad = new Gauge({
    name: `${RedisMetrics.METRIC_PREFIX}_used_cpu_sys`,
    help: 'System CPU load of Redis instance (used_cpu_sys in INFO command)',
    labelNames: RedisMetrics.COMMON_LABELS,
    registers: [],
  });

  public readonly userCpuLoad = new Gauge({
    name: `${RedisMetrics.METRIC_PREFIX}_used_cpu_user`,
    help: 'User CPU load of Redis instance (used_cpu_user in INFO command)',
    labelNames: RedisMetrics.COMMON_LABELS,
    registers: [],
  });

  public readonly uptimeInSeconds = new Gauge({
    name: `${RedisMetrics.METRIC_PREFIX}_uptime_in_seconds`,
    help: 'Number of seconds since Redis server start (uptime_in_seconds from INFO command)',
    labelNames: RedisMetrics.COMMON_LABELS,
    registers: [],
  });

  public readonly connectedClients = new Gauge({
    name: `${RedisMetrics.METRIC_PREFIX}_connected_clients`,
    help: 'Number of client connections (connected_clients from INFO command)',
    labelNames: RedisMetrics.COMMON_LABELS,
    registers: [],
  });

  public readonly usedMemoryRss = new Gauge({
    name: `${RedisMetrics.METRIC_PREFIX}_used_memory_rss`,
    help: 'Number of bytes that Redis allocated as seen by the operating system (a.k.a resident set size) (used_memory_rss from INFO command)',
    labelNames: RedisMetrics.COMMON_LABELS,
    registers: [],
  });

  public readonly aofEnabled = new Gauge({
    name: `${RedisMetrics.METRIC_PREFIX}_aof_enabled`,
    help: 'Flag indicating AOF logging is activated (aof_enabled from INFO command)',
    labelNames: RedisMetrics.COMMON_LABELS,
    registers: [],
  });

  public readonly rdbSaves = new Gauge({
    name: `${RedisMetrics.METRIC_PREFIX}_rdb_saves`,
    help: 'Number of RDB snapshots performed since startup (rdb_saves from INFO command)',
    labelNames: RedisMetrics.COMMON_LABELS,
    registers: [],
  });

  public readonly instantaneousOpsPerSec = new Gauge({
    name: `${RedisMetrics.METRIC_PREFIX}_instantaneous_ops_per_sec`,
    help: 'Number of commands processed per second (instantaneous_ops_per_sec from INFO command)',
    labelNames: RedisMetrics.COMMON_LABELS,
    registers: [],
  });

  public readonly instantaneousInputKbps = new Gauge({
    name: `${RedisMetrics.METRIC_PREFIX}_instantaneous_input_kbps`,
    help: 'The network\'s read rate per second in KB/sec (instantaneous_input_kbps from INFO command)',
    labelNames: RedisMetrics.COMMON_LABELS,
    registers: [],
  });

  public readonly instantaneousOutputKbps = new Gauge({
    name: `${RedisMetrics.METRIC_PREFIX}_instantaneous_output_kbps`,
    help: 'The network\'s write rate per second in KB/sec (instantaneous_output_kbps from INFO command)',
    labelNames: RedisMetrics.COMMON_LABELS,
    registers: [],
  });

  private readonly trackedClients = new Map<string, TrackedClient>();

  startCollectingFrom(id: string, client: IORedis, intervalMs: number = 1000) {
    this.logger.verbose({ id }, 'Collecting INFO');

    setTimeout(() => {
      const collectInterval = setInterval(() => {
        this.collect(id, client)
          .catch(err => this.logger.error({ err, id }, 'Failed to collect metrics'));
      }, intervalMs).unref();

      this.trackedClients.set(id, {
        client,
        collectInterval,
      });
    }, Math.random() * intervalMs);
  }

  stopCollectingFrom(id: string) {
    const tracked = this.trackedClients.get(id);
    if (!tracked) {
      this.logger.error(`${id} is not tracked`);

      return;
    }

    this.logger.verbose({ id }, 'Stopping collecting INFO');
    clearInterval(tracked.collectInterval as NodeJS.Timeout);

    return this.trackedClients.delete(id);
  }

  registerIn(reg: MetricsRegistryService) {
    this.logger.verbose('Metrics registered');

    reg.register(this.version);
    reg.register(this.memAvailBytes);
    reg.register(this.memUsedBytes);
    reg.register(this.sysCpuLoad);
    reg.register(this.userCpuLoad);
    reg.register(this.uptimeInSeconds);
    reg.register(this.connectedClients);
    reg.register(this.usedMemoryRss);
    reg.register(this.aofEnabled);
    reg.register(this.rdbSaves);
    reg.register(this.instantaneousOpsPerSec);
    reg.register(this.instantaneousInputKbps);
    reg.register(this.instantaneousOutputKbps);
  }

  private async collect(id: string, client: IORedis) {
    const rawInfo = await client.info();
    const info = parseInfo(rawInfo);

    {
      const [major, minor, patch] = info.redis_version.split('.');

      this.version.labels(
        id,
        info.redis_version,
        major,
        minor,
        patch,
      ).set(1);
    }

    this.memAvailBytes.labels(id).set(+info.total_system_memory);
    this.memUsedBytes.labels(id).set(+info.used_memory);
    this.sysCpuLoad.labels(id).set(+info.used_cpu_sys);
    this.userCpuLoad.labels(id).set(+info.used_cpu_user);
    this.uptimeInSeconds.labels(id).set(+info.uptime_in_seconds);
    this.connectedClients.labels(id).set(+info.connected_clients);
    this.usedMemoryRss.labels(id).set(+info.used_memory_rss);
    this.aofEnabled.labels(id).set(+info.aof_enabled);
    this.rdbSaves.labels(id).set(+info.rdb_saves);
    this.instantaneousOpsPerSec.labels(id).set(+info.instantaneous_ops_per_sec);
    this.instantaneousInputKbps.labels(id).set(+info.instantaneous_input_kbps);
    this.instantaneousOutputKbps.labels(id).set(+info.instantaneous_output_kbps);
  }
}

export const createMetricsProvider = (): FactoryProvider => {
  return {
    provide: REDIS_CONNECTION_METRICS,
    useFactory: () => new RedisMetrics(),
  };
};
