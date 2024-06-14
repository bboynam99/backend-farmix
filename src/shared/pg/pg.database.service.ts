import pg, { QueryResultRow } from 'pg';
import { Querying } from './pg.types';

abstract class PgDatabaseServiceCore<K extends pg.Pool | pg.PoolClient> implements Querying {
  protected abstract connection: K;

  async query<T extends object>(sql: string, values?: any): Promise<T[]> {
    const { rows } = await this.connection.query<T>(sql, values);

    return rows;
  }

  async queryRow<T extends object>(sql: string, values?: any): Promise<T | undefined> {
    const { rows } = await this.connection.query<T>(sql, values);

    return rows[0] || undefined;
  }

  async exec<T extends QueryResultRow = any>(sql: string, values?: any): Promise<pg.QueryResult<T>> {
    return this.connection.query<T>(sql, values);
  }
}

export class Transaction extends PgDatabaseServiceCore<pg.PoolClient> implements Querying {
  constructor(protected connection: pg.PoolClient) {
    super();
  }

  async start() {
    await this.connection.query('BEGIN');
  }

  async commit() {
    try {
      await this.connection.query('COMMIT');
    } finally {
      this.connection.release();
    }
  }

  async rollback() {
    try {
      await this.connection.query('ROLLBACK');
    } finally {
      this.connection.release();
    }
  }
}

export class DatabaseService extends PgDatabaseServiceCore<pg.Pool> implements Querying {
  constructor(protected connection: pg.Pool) {
    super();
  }

  async transaction(): Promise<Transaction> {
    const client = await this.connection.connect();

    try {
      const trx = new Transaction(client);
      await trx.start();

      return trx;
    } catch (err) {
      client.release();
      throw err;
    }
  }
}
