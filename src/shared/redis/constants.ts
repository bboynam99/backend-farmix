import { RedisModuleOptions } from './types';

export const REDIS_MODULE_CONFIG = Symbol('REDIS_MODULE_CONFIG');
export const REDIS_CLIENTS_LIST = Symbol('REDIS_CLIENTS_LIST');
export const REDIS_CONNECTION_METRICS = Symbol('REDIS_CONNECTION_METRICS');

export const defaultRedisModuleConfig: RedisModuleOptions = {
  pingOnStart: true,
  closeClients: true,
  readyLog: true,
  closeLog: false,
};
