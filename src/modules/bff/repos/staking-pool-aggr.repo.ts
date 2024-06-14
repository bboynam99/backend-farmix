import { Inject } from '@nestjs/common';
import format from 'pg-format';
import { MAIN_DB_SERVICE } from '../../../config';
import { DatabaseService, Querying } from '../../../shared/pg';
import { SortDirections } from '../constants';

export interface PoolAggrRecord {
  pool_id: number
  pool_name: string
  pool_symbol: string
  pool_contract_addr: string
  pool_target_jetton_master_addr: string
  pool_jetton_master_addr: string
  pool_is_ton_pool: boolean
  pool_deposit_fee: string
  pool_img_url?: string
  pool_tvl?: string | null
  pool_apr24?: string | null
  pool_apr168?: string | null
  pool_apr720?: string | null
  pool_apy?: string | null
  user_requested_deposits?: string | null
  user_staked_deposits?: string | null
  user_requested_withdrawals?: string | null
  user_withdrawals_payouts?: string | null
  user_total_earnings?: string | null
}

export class StakingPoolAggrRepo {
  constructor(@Inject(MAIN_DB_SERVICE) protected db: DatabaseService) {}

  async getBySymbol(symbol: string, userWalletAddr?: string, conn: Querying = this.db) {
    const fields = this. defineFields(Boolean(userWalletAddr));

    // eslint-disable-next-line sequel/no-unsafe-query
    const query = `
      SELECT ${fields}
      FROM app.staking_pools sp
      LEFT JOIN app.current_staking_pools_derivs spd ON sp.id = spd.pool_id
      ${userWalletAddr ? format('LEFT JOIN app.current_stakers_stats css ON css.wallet_addr = %L AND sp.id = css.pool_id', userWalletAddr) : ''}
      WHERE sp.disabled = FALSE AND LOWER(sp.symbol) = LOWER($1)
    `;

    return conn.queryRow<PoolAggrRecord>(query, [symbol]);
  }

  async getList(
    searchQuery?: string,
    userWalletAddr?: string,
    cursor?: string,
    limit: number = 50,
    sortBy: 'tvl' | 'apr24' = 'tvl',
    sortDirection: SortDirections = SortDirections.DESC,
    conn: Querying = this.db,
  ) {
    const fields = this.defineFields(Boolean(userWalletAddr));
    const definedCursor = this.decodeCursor(limit, cursor);
    const definedQueryWhereClause = this.defineQueryWhereClause(searchQuery);

    // eslint-disable-next-line sequel/no-unsafe-query
    const query = `
      SELECT ${fields}
      FROM app.staking_pools sp
      LEFT JOIN app.current_staking_pools_derivs spd ON sp.id = spd.pool_id
      ${userWalletAddr ? format('LEFT JOIN app.current_stakers_stats css ON css.wallet_addr = %L AND sp.id = css.pool_id', userWalletAddr) : ''}
      WHERE sp.disabled = FALSE ${definedQueryWhereClause ? `AND ${definedQueryWhereClause}` : ''}
      ${format('ORDER BY %I %s, sp.id ASC', sortBy, sortDirection)}
      ${format('LIMIT %s OFFSET %s', definedCursor.limit, definedCursor.offset)}
    `;

    const res = await conn.query<PoolAggrRecord>(query);
    const nextCursor = this.encodeNextCursor(res, limit, definedCursor.offset);

    return { records: res, nextCursor };
  }

  private defineFields(includeUserStats?: boolean) {
    const fields = [
      'sp.id AS pool_id',
      'sp.name AS pool_name',
      'sp.symbol as pool_symbol',
      'sp.contract_addr AS pool_contract_addr',
      'sp.target_jetton_master_addr AS pool_target_jetton_master_addr',
      'sp.pool_jetton_master_addr',
      'sp.is_ton_pool AS pool_is_ton_pool',
      'sp.deposit_fee AS pool_deposit_fee',
      'sp.img_url AS pool_img_url',
      'spd.tvl AS pool_tvl',
      'spd.apr24 AS pool_apr24',
      'spd.apr168 AS pool_apr168',
      'spd.apr720 AS pool_apr720',
      'spd.apy AS pool_apy',
    ];

    if (includeUserStats) {
      fields.push(
        'css.requested_deposits AS user_requested_deposits',
        'css.staked_deposits AS user_staked_deposits',
        'css.requested_withdrawals AS user_requested_withdrawals',
        'css.withdrawals_payouts AS user_withdrawals_payouts',
        'css.total_earnings AS user_total_earnings',
      );
    }

    return fields.join(',');
  }

  private decodeCursor(limit: number, cursor?: string) {
    if (!cursor) {
      return { offset: 0, limit };
    }

    const strCursor = Buffer.from(cursor, 'base64').toString('utf-8');
    // cursor parts is the following
    // [0] - handle type of cursor for not is is offset only, but in future we may want to change method
    // for offset
    const parts = strCursor.split(',');
    if (parts[0] === 'offset') {
      const offset = parseInt(parts[1]);

      return { offset, limit };
    }

    throw new Error('can not decode cursor: bad encoding');
  }

  private encodeNextCursor(res: PoolAggrRecord[], limit: number, prefOffset: number): string | undefined {
    if (res.length < limit) {
      return undefined;
    }

    const nextOffset = prefOffset + limit;

    return Buffer.from(`offset,${nextOffset}`, 'utf-8').toString('base64');
  }

  private defineQueryWhereClause(query?: string): string {
    if (!query) {
      return '';
    }

    return format(
      '(LOWER(sp.name) like %L OR LOWER(sp.symbol) like %L)',
      `${query.toLowerCase()}%`,
      `${query.toLowerCase()}%`,
    );
  }
}