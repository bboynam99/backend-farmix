import {
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import format from 'pg-format';
import {
  StakingPoolEvent,
  StakingPoolNftCollectionDescriptor,
  StakingPoolNftCollectionEvent,
} from '../../../common/types';
import { MAIN_DB_SERVICE } from '../../../config';
import { DatabaseService, Querying } from '../../../shared/pg';

@Injectable()
export class StakingPoolsNftCollectionsRepo {
  private logger = new Logger(StakingPoolsNftCollectionsRepo.name);

  constructor(@Inject(MAIN_DB_SERVICE) private db: DatabaseService) {}

  async getAllActive(conn: Querying = this.db): Promise<StakingPoolNftCollectionDescriptor[]> {
    const query = `
        SELECT
        id,
        addr,
        pool_id,
        pool_addr,
        drained
      FROM app.staking_pools_nft_collections
      WHERE drained = FALSE
      ORDER BY id;
    `;

    return conn.query<StakingPoolNftCollectionDescriptor>(query);
  }

  async addOrIgnoreByEvents(events: StakingPoolEvent<'NFT_COLLECTION_DISCOVERED'>[], conn: Querying = this.db) {
    if (events.length === 0) {
      return;
    }

    const queryTempl = `
        INSERT INTO app.staking_pools_nft_collections
        (addr, pool_id, pool_addr, drained)
        VALUES
        %L
        ON CONFLICT (addr) DO NOTHING
    `;

    const query = format(
      queryTempl,
      events.map((e) => [e.collection_addr, e.pool_id, e.pool_addr, false]),
    );

    await conn.query(query);
  }

  async markDrainedByEvent(event: StakingPoolNftCollectionEvent<'NFT_COLLECTION_DRAINED'>, conn: Querying = this.db): Promise<void> {
    const query = `
      UPDATE app.staking_pools_nft_collections
      SET drained = TRUE
      WHERE id = $1
      RETURNING id
    `;

    const res = await conn.query(query, [event.id]);
    if (res.length !== 1) {
      this.logger.warn(
        { event, query, rows: res },
        'got affected rows !== 1 while marking nft collection as drained by event, this is not expected behavior',
      );
    }
  }
}