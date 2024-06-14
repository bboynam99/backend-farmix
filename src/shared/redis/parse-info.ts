// for more info see https://redis.io/commands/info/

export interface RedisInfo {
  redis_version: string;

  used_memory: string | number;
  total_system_memory: string | number;

  used_cpu_sys: string | number;
  used_cpu_user: string | number;

  uptime_in_seconds: string;
  connected_clients: string;
  used_memory_rss: string;
  aof_enabled: string;
  rdb_saves: string;
  instantaneous_ops_per_sec: string;
  instantaneous_input_kbps: string;
  instantaneous_output_kbps: string;
}

export const parseInfo = (raw: string): RedisInfo => {
  const entries = raw.split('\r\n').flatMap(line => {
    if (!line || line.startsWith('#')) return [];

    return [line.split(':')];
  });

  return Object.fromEntries(entries);
};
