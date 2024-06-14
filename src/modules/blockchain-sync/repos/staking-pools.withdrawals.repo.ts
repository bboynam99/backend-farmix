import { Inject } from '@nestjs/common';
import format from 'pg-format';
import { STAKING_POOL_EVENTS_TYPES, STAKING_POOL_NFT_COLLECTION_EVENT_TYPES } from '../../../common';
import { StakingPoolEvent, StakingPoolNftCollectionEvent } from '../../../common/types';
import { MAIN_DB_SERVICE } from '../../../config';
import { DatabaseService, Querying } from '../../../shared/pg';

export class StakingPoolsWithdrawalsRepo {
  constructor(@Inject(MAIN_DB_SERVICE) private db: DatabaseService) {}

  async addOrIgnoreImmediateWithdrawalsByEvents(events: StakingPoolEvent<'IMMEDIATE_WITHDRAWAL'>[], conn: Querying = this.db) {
    if (events.length === 0) {
      return;
    }

    const queryTempl = `
        INSERT INTO app.staking_pools_withdrawals
        (hash, lt, creation_time, pool_id, trx_type_id, wallet_addr, requested_amount, reward_amount)
        VALUES 
        %L
        ON CONFLICT (hash) DO NOTHING; 
    `;

    const query = format(
      queryTempl,
      events.map((e) => [
        e.hash,
        e.lt,
        e.created_at,
        e.pool_id,
        STAKING_POOL_EVENTS_TYPES.IMMEDIATE_WITHDRAWAL,
        e.user_wallet_addr,
        e.requested_amount.toString(),
        e.reward_amount.toString(),
      ]),
    );

    await conn.query(query);
  }

  async addOrIgnoreWithdrawalsRequestsByEvents(events: StakingPoolEvent<'WITHDRAWAL_REQUEST'>[], conn: Querying = this.db) {
    if (events.length === 0) {
      return;
    }

    const queryTempl = `
        INSERT INTO app.staking_pools_withdrawals
        (hash, lt, creation_time, pool_id, trx_type_id, wallet_addr, requested_amount, reward_amount)
        VALUES
        %L
        ON CONFLICT (hash) DO NOTHING;
    `;

    const query = format(
      queryTempl,
      events.map((e) => [
        e.hash,
        e.lt,
        e.created_at,
        e.pool_id,
        STAKING_POOL_EVENTS_TYPES.WITHDRAWAL_REQUEST,
        e.user_wallet_addr,
        e.requested_amount.toString(),
        '0',
      ]),
    );

    await conn.query(query);
  }

  async addOrIgnoreWithdrawalsPayoutByEvents(events: StakingPoolNftCollectionEvent<'NFT_COLLECTION_NFT_PAYOUT'>[], conn: Querying = this.db) {
    if (events.length === 0) {
      return;
    }

    const queryTempl = `
        INSERT INTO app.staking_pools_withdrawals
        (hash, lt, creation_time, pool_id, trx_type_id, wallet_addr, requested_amount, reward_amount)
        VALUES
        %L
        ON CONFLICT (hash) DO NOTHING;
    `;

    const query = format(
      queryTempl,
      events.map((e) => [
        e.hash,
        e.lt,
        e.created_at,
        e.pool_id,
        STAKING_POOL_NFT_COLLECTION_EVENT_TYPES.NFT_COLLECTION_NFT_PAYOUT,
        e.user_wallet_addr,
        e.requested_amount.toString(),
        e.reward_amount.toString(),
      ]),
    );

    await conn.query(query);
  }
}