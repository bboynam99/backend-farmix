import { Inject, Injectable } from '@nestjs/common';
import { StakingPoolNftCollectionSyncCheckpoint } from '../../../common/types';
import { MAIN_DB_SERVICE } from '../../../config';
import { DatabaseService, Querying } from '../../../shared/pg';

@Injectable()
export class StakingPoolsNftCollectionsSyncCheckpointsRepo {
  constructor(@Inject(MAIN_DB_SERVICE) private db: DatabaseService) {}

  async getLastCheckpoint(collectionId: number, conn: Querying = this.db): Promise<StakingPoolNftCollectionSyncCheckpoint | undefined> {
    const query = `
      SELECT
          id,
          collection_id,
          hash,
          lt,
          creation_time
      FROM app.staking_pools_nft_collections_sync_checkpoints
      WHERE collection_id = $1
      ORDER BY creation_time DESC
      LIMIT 1;
    `;

    return conn.queryRow<StakingPoolNftCollectionSyncCheckpoint>(query, [collectionId]);
  }

  async saveCheckpoint(checkpoint: StakingPoolNftCollectionSyncCheckpoint, conn: Querying = this.db): Promise<void> {
    const query = `
      INSERT INTO app.staking_pools_nft_collections_sync_checkpoints
      (collection_id, hash, lt, creation_time)
      VALUES
      ($1, $2, $3, $4); 
    `;

    await conn.query(query, [
      checkpoint.collection_id,
      checkpoint.hash,
      checkpoint.lt,
      checkpoint.creation_time,
    ]);
  }
}