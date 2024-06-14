import {
  PoolConfig,
  QueryResult,
  QueryResultRow,
} from 'pg';

export interface Querying {
  query<T extends object>(sql: string, values?: any): Promise<T[]>;
  queryRow<T extends object>(sql: string, values?: any): Promise<T | undefined>;
  exec<T extends QueryResultRow = any>(sql: string, values?: any): Promise<QueryResult<T>>;
}

export type ExtendedPoolConfig = PoolConfig & { treatDateAsStrings?: boolean };

export interface PgConnection {
  token: string | symbol
  poolToken: string | symbol
  traceLogsOn?: boolean
  configKey?: string
  connectionOptions?: ExtendedPoolConfig
}
