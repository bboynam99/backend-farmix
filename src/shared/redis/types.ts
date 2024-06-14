import { Redis, RedisOptions } from 'ioredis';

export interface RedisModuleOptions {
  pingOnStart?: boolean
  closeClients?: boolean
  readyLog?: boolean
  closeLog?: boolean
  commonClientsOptions?: Omit<RedisClientOptions, 'token' | 'configKey'>
}

export interface RedisClientOptions extends RedisOptions {
  token: string | symbol
  configKey?: string
  url?: string
  onClientCreated?: (client: Redis) => void | Promise<void>
  collectRedisInfo?: boolean
  collectRedisInfoEveryMs?: number
}
