import { Module } from '@nestjs/common';
import { BlockchainSyncScheduler } from './blockchain-sync.scheduler';
import { StakingPoolsNftCollectionsSyncCheckpointsRepo } from './repos/staking-pools-nft-collections-sync-checkpoints.repo';
import { StakingPoolsNftCollectionsRepo } from './repos/staking-pools-nft-collections.repo';
import { StakingPoolsSyncCheckpointsRepo } from './repos/staking-pools-sync-checkpoints.repo';
import { StakingPoolRepo } from './repos/staking-pools.repo';
import { StakingPoolsWithdrawalsRepo } from './repos/staking-pools.withdrawals.repo';
import { StakingPoolNftCollectionSyncService } from './staking-pool-nft-collection-sync.service';
import { StakingPoolSyncService } from './staking-pool-sync.service';

@Module({
  providers: [
    StakingPoolRepo,
    StakingPoolsWithdrawalsRepo,
    StakingPoolsNftCollectionsRepo,
    StakingPoolsSyncCheckpointsRepo,
    StakingPoolsNftCollectionsSyncCheckpointsRepo,
    BlockchainSyncScheduler,
    StakingPoolSyncService,
    StakingPoolNftCollectionSyncService,
  ],
})
export class BlockchainSyncModule {}