import {
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Address } from '@ton/core';
import BigNumber from 'bignumber.js';
import { Api, Transaction } from 'tonapi-sdk-js';
import { StakingPoolsNftCollectionsSyncCheckpointsRepo } from './repos/staking-pools-nft-collections-sync-checkpoints.repo';
import { StakingPoolsNftCollectionsRepo } from './repos/staking-pools-nft-collections.repo';
import { StakingPoolRepo } from './repos/staking-pools.repo';
import { StakingPoolsWithdrawalsRepo } from './repos/staking-pools.withdrawals.repo';
import { STAKING_POOL_OP_NAMES } from '../../common';
import {
  StakingPoolDescriptor,
  StakingPoolNftCollectionDescriptor,
  StakingPoolNftCollectionEvent,
} from '../../common/types';
import { TON_CONSOLE, tonConsoleConfig } from '../../config';

interface GroupedForApplyStakingPoolNftCollectionEvents {
  NFT_COLLECTION_NFT_PAYOUT: StakingPoolNftCollectionEvent<'NFT_COLLECTION_NFT_PAYOUT'>[]
  NFT_COLLECTION_DRAINED?: StakingPoolNftCollectionEvent<'NFT_COLLECTION_DRAINED'>
}

@Injectable()
export class StakingPoolNftCollectionSyncService {
  private logger = new Logger(StakingPoolNftCollectionSyncService.name);

  constructor(
    @Inject(tonConsoleConfig.KEY) private tonConsoleConf: ConfigType<typeof tonConsoleConfig>,
    @Inject(TON_CONSOLE) private tonConsole: Api<unknown>,
    private stakingPoolsNftCollectionsSyncCheckpointsRepo: StakingPoolsNftCollectionsSyncCheckpointsRepo,
    private stakingPoolRepo: StakingPoolRepo,
    private stakingPoolNftCollectionsRepo: StakingPoolsNftCollectionsRepo,
    private stakingPoolWithdrawalsRepo: StakingPoolsWithdrawalsRepo,
  ) {}

  async sync(collection: StakingPoolNftCollectionDescriptor, signal: AbortSignal) {
    this.logger.debug(
      { collection },
      `staking pools collection transactions sync started, addr = ${collection.addr}`,
    );

    const pool = await this.stakingPoolRepo.getById(collection.pool_id);
    if (!pool) {
      throw new Error(`can not find pool by id for pool nft collection, pool_id = ${collection.pool_id}, pool_addr = ${collection.pool_addr}`);
    }

    const lastCheckpoint = await this.stakingPoolsNftCollectionsSyncCheckpointsRepo.getLastCheckpoint(collection.id);
    let pointer: number | undefined = lastCheckpoint ? Number(lastCheckpoint.lt) : undefined;
    const urlSavePoolAddr = Address.parse(collection.addr).toString({ urlSafe: true, bounceable: true });

    do {
      if (signal.aborted) {
        this.logger.log(`signal aborted, iteration wil be canceled and finished, reason = ${signal.reason}`);

        return;
      }

      const res = await this.tonConsole.blockchain.getBlockchainAccountTransactions(
        urlSavePoolAddr,
        {
          limit: this.tonConsoleConf.transactionsBatchSize,
          before_lt: pointer,
        },
        { signal: this.tonConsoleConf.timeout() },
      );

      this.logger.verbose(
        {
          fetched: res.transactions.length,
          limit: this.tonConsoleConf.transactionsBatchSize,
          pointer,
          newestHash: res.transactions[0]?.hash,
          newestLt: res.transactions[0]?.lt,
          oldestHash: res.transactions[res.transactions.length - 1]?.hash,
          oldestLt: res.transactions[res.transactions.length - 1]?.lt,
        },
        `sync staking pool nft collection iteration, address = ${collection.addr}`,
      );

      pointer = res.transactions[res.transactions.length - 1]?.lt;
      if (res.transactions.length < this.tonConsoleConf.transactionsBatchSize) {
        pointer = undefined;
      }

      const events = this.analyzeTrxBatch(pool, collection, res.transactions);
      this.logger.verbose({ events }, 'staking pool nft collection analyze result');
      await this.applyEvents(events);

      if (res.transactions.length) {
        await this.stakingPoolsNftCollectionsSyncCheckpointsRepo.saveCheckpoint({
          id: '0',
          collection_id: collection.id,
          lt: String(res.transactions[res.transactions.length - 1].lt),
          hash: res.transactions[res.transactions.length - 1].hash,
          creation_time: String(Date.now()),
        });
      }
    } while (pointer !== undefined);
  }

  analyzeTrxBatch(pool: StakingPoolDescriptor, collection: StakingPoolNftCollectionDescriptor, trxs: Transaction[]): StakingPoolNftCollectionEvent[] {
    const res = trxs.map((t) => this.analyzeTrx(pool, collection, t));

    return res.reduce((acc, events) => {
      if (events.length) acc.push(...events);

      return acc;
    }, [] as StakingPoolNftCollectionEvent[]);
  }

  analyzeTrx(pool: StakingPoolDescriptor, collection: StakingPoolNftCollectionDescriptor, trx: Transaction): StakingPoolNftCollectionEvent[] {
    if (!pool.is_ton_pool) {
      throw new Error('analyzing not ton (jetton) pools nft collections is not supported yet');
    }

    // the transaction with this op code triggers withdrawal fulfillment (payout)
    // if in out message there is transaction with op_code === POOL_TOUCH ==> the collection is drained
    if (trx.in_msg?.op_code === STAKING_POOL_OP_NAMES.NFT_COLLECTION_BURN_NOTIFICATION) {
      const events: StakingPoolNftCollectionEvent[] = [];

      const payoutTrx = trx.out_msgs.find((m) => m.op_code === STAKING_POOL_OP_NAMES.NFT_PAYOUT);
      if (payoutTrx) {
        const payoutEvent: StakingPoolNftCollectionEvent = {
          id: collection.id,
          addr: collection.addr,
          pool_id: pool.id,
          pool_addr: pool.contract_addr,
          hash: trx.hash,
          lt: trx.lt,
          created_at: trx.in_msg.created_at,
          type: 'NFT_COLLECTION_NFT_PAYOUT',
          user_wallet_addr: payoutTrx.destination?.address,
          requested_amount: new BigNumber(trx.in_msg.decoded_body?.amount ?? 0),
          full_amount: new BigNumber(payoutTrx.value),
        };
        payoutEvent.reward_amount = payoutEvent.full_amount.minus(payoutEvent.requested_amount);
        events.push(payoutEvent);
      } else {
        this.logger.warn(
          { trx, pool, collection },
          'detected NFT_COLLECTION_BURN_NOTIFICATION trx in in_msg but out trx with NFT_PAYOUT op_code not found, this is unexpected behavior',
        );
      }

      const poolTouchTrx = trx.out_msgs.find((m) => m.op_code === STAKING_POOL_OP_NAMES.POOL_TOUCH);
      if (poolTouchTrx) {
        events.push({
          id: collection.id,
          addr: collection.addr,
          pool_id: pool.id,
          pool_addr: pool.contract_addr,
          hash: trx.hash,
          lt: trx.lt,
          created_at: trx.in_msg.created_at,
          type: 'NFT_COLLECTION_DRAINED',
        });
      }

      return events;
    }

    return [];
  }

  async applyEvents(events: StakingPoolNftCollectionEvent[]): Promise<void> {
    const grouped = this.groupEventsForApply(events);

    await this.stakingPoolWithdrawalsRepo.addOrIgnoreWithdrawalsPayoutByEvents(grouped.NFT_COLLECTION_NFT_PAYOUT);
    if (grouped.NFT_COLLECTION_DRAINED) {
      await this.stakingPoolNftCollectionsRepo.markDrainedByEvent(grouped.NFT_COLLECTION_DRAINED);
    }
  }

  private groupEventsForApply(events: StakingPoolNftCollectionEvent[]) {
    const grouped: GroupedForApplyStakingPoolNftCollectionEvents = {
      NFT_COLLECTION_NFT_PAYOUT: [],
    };
    grouped.NFT_COLLECTION_NFT_PAYOUT = events.filter((e) => e.type === 'NFT_COLLECTION_NFT_PAYOUT');

    const drainedEvents = events.filter((e) => e.type === 'NFT_COLLECTION_DRAINED');
    if (drainedEvents.length > 1) {
      this.logger.warn(
        { events: drainedEvents },
        'detected multiple drained events for one staking pool nft collection, this is unexpected behavior',
      );
    }
    if (drainedEvents.length !== 0) {
      grouped.NFT_COLLECTION_DRAINED = drainedEvents[0];
    }

    return grouped;
  }
}