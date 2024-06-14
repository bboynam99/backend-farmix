import { Inject, Injectable } from '@nestjs/common';
import { StakingPoolDescriptor } from '../../../common/types';
import { MAIN_DB_SERVICE } from '../../../config';
import { DatabaseService, Querying } from '../../../shared/pg';

@Injectable()
export class StakingPoolRepo {
  constructor(@Inject(MAIN_DB_SERVICE) protected db: DatabaseService) {}

  async getAllActive(conn: Querying = this.db): Promise<StakingPoolDescriptor[]> {
    const query = `
      SELECT
          id,
          name,
          symbol,
          contract_addr,
          target_jetton_master_addr,
          pool_jetton_master_addr,
          deposit_fee,
          is_ton_pool,
          img_url,
          disabled
      FROM app.staking_pools
      WHERE disabled = FALSE
      ORDER BY id;
    `;

    return conn.query<StakingPoolDescriptor>(query);
  }

  async getById(poolId: number, conn: Querying = this.db): Promise<StakingPoolDescriptor | undefined> {
    const query = `
      SELECT
        id,
        name,
        symbol,
        contract_addr,
        target_jetton_master_addr,
        pool_jetton_master_addr,
        deposit_fee,
        is_ton_pool,
        img_url,
        disabled
      FROM app.staking_pools WHERE id = $1;
    `;

    return conn.queryRow<StakingPoolDescriptor>(query, [poolId]);
  }
}
