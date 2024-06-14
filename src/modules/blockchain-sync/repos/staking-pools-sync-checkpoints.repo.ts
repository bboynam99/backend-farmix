import { Inject, Injectable } from '@nestjs/common';
import { StakingPoolSyncCheckpoint } from '../../../common/types';
import { MAIN_DB_SERVICE } from '../../../config';
import { DatabaseService, Querying } from '../../../shared/pg';

@Injectable()
export class StakingPoolsSyncCheckpointsRepo {
  constructor(@Inject(MAIN_DB_SERVICE) private db: DatabaseService) {}

  async getLastCheckpoint(poolId: number, conn: Querying = this.db): Promise<StakingPoolSyncCheckpoint | undefined> {
    const query = `
      SELECT
          id,
          pool_id,
          hash,
          lt,
          creation_time
      FROM app.staking_pools_sync_checkpoints
      WHERE pool_id = $1
      ORDER BY creation_time DESC
      LIMIT 1;
    `;

    return conn.queryRow<StakingPoolSyncCheckpoint>(query, [poolId]);
  }

  async saveCheckpoint(checkpoint: StakingPoolSyncCheckpoint, conn: Querying = this.db): Promise<void> {
    const query = `
      INSERT INTO app.staking_pools_sync_checkpoints
      (pool_id, hash, lt, creation_time)
      VALUES
      ($1, $2, $3, $4);
    `;

    await conn.query(query, [
      checkpoint.pool_id,
      checkpoint.hash,
      checkpoint.lt,
      checkpoint.creation_time,
    ]);
  }
}