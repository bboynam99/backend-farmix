import {
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Address } from '@ton/core';
import BigNumber from 'bignumber.js';
import { uniqueBy } from 'remeda';
import { Api, Transaction } from 'tonapi-sdk-js';
import { StakingPoolsNftCollectionsRepo } from './repos/staking-pools-nft-collections.repo';
import { StakingPoolsSyncCheckpointsRepo } from './repos/staking-pools-sync-checkpoints.repo';
import { StakingPoolsWithdrawalsRepo } from './repos/staking-pools.withdrawals.repo';
import { STAKING_POOL_OP_NAMES } from '../../common';
import { StakingPoolDescriptor, StakingPoolEvent } from '../../common/types';
import { TON_CONSOLE, tonConsoleConfig } from '../../config';

// TODO(deposits processing)
// TODO(aggregates and aggregates deltas calculating)
// TODO(add duration to logs in sync methods)
// TODO (add metrics to sync process)

interface GroupedForApplyStakingPoolEvents {
  NFT_COLLECTION_DISCOVERED: StakingPoolEvent<'NFT_COLLECTION_DISCOVERED'>[]
  IMMEDIATE_WITHDRAWALS: StakingPoolEvent<'IMMEDIATE_WITHDRAWAL'>[]
  WITHDRAWAL_REQUEST: StakingPoolEvent<'WITHDRAWAL_REQUEST'>[]
}

@Injectable()
export class StakingPoolSyncService {
  private logger = new Logger(StakingPoolSyncService.name);

  constructor(
    @Inject(tonConsoleConfig.KEY) private tonConsoleConf: ConfigType<typeof tonConsoleConfig>,
    @Inject(TON_CONSOLE) private tonConsole: Api<unknown>,
    private stakingPoolsNftCollectionsRepo: StakingPoolsNftCollectionsRepo,
    private stakingPoolWithdrawalsRepo: StakingPoolsWithdrawalsRepo,
    private stakingPoolSyncCheckpointsRepo: StakingPoolsSyncCheckpointsRepo,
  ) {}

  async sync(pool: StakingPoolDescriptor, signal: AbortSignal) {
    this.logger.debug(
      { pool },
      `staking pool transactions sync started, symbol = ${pool.symbol}`,
    );

    const lastCheckpoint = await this.stakingPoolSyncCheckpointsRepo.getLastCheckpoint(pool.id);
    let pointer: number | undefined = lastCheckpoint ? Number(lastCheckpoint.lt) : undefined;
    const urlSavePoolAddr = Address.parse(pool.contract_addr).toString({ urlSafe: true, bounceable: true });

    do {
      if (signal.aborted) {
        this.logger.log(`signal aborted, iteration will be canceled and finished, reason = ${signal.reason}`);

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
        `sync staking pool transaction iteration, address = ${pool.contract_addr}`,
      );

      pointer = res.transactions[res.transactions.length - 1]?.lt;
      if (res.transactions.length < this.tonConsoleConf.transactionsBatchSize) {
        pointer = undefined;
      }

      const events = this.analyzeTrxBatch(pool, res.transactions);
      this.logger.verbose({ events }, 'staking pool analyze result');
      await this.applyEvents(events);

      if (res.transactions.length) {
        await this.stakingPoolSyncCheckpointsRepo.saveCheckpoint({
          id: '0',
          pool_id: pool.id,
          lt: String(res.transactions[res.transactions.length - 1].lt),
          hash: res.transactions[res.transactions.length - 1].hash,
          creation_time: String(Date.now()),
        });
      }
    } while (pointer !== undefined);

    this.logger.debug(
      { pool },
      `staking pool transactions sync finished, symbol = ${pool.symbol}`,
    );
  }

  analyzeTrxBatch(pool: StakingPoolDescriptor, trxs: Transaction[]): StakingPoolEvent[] {
    const res = trxs.map((t) => this.analyzeTrx(pool, t));

    return res.reduce((acc, events) => {
      if (events.length) acc.push(...events);

      return acc;
    }, [] as StakingPoolEvent[]);
  }

  analyzeTrx(pool: StakingPoolDescriptor, trx: Transaction): StakingPoolEvent[] {
    if (!pool.is_ton_pool) {
      throw new Error('analyzing not ton (jetton) pools is not supported yet');
    }

    // immediate, delayed, rollback withdrawals has the same op_code when in_msg came to the pool
    // there is 3 cases:
    // 1. success immediate withdrawals with body + reward instant transferring to user wallet
    // 2. failed immediate withdrawals with jetton re-minted (rollback)
    // 3. delayed withdrawal (nft mint)
    if (trx.in_msg?.op_code === STAKING_POOL_OP_NAMES.POOL_WITHDRAW) {
      if (!trx.success) {
        this.logger.warn({ trx }, 'receive not successful POOL_WITHDRAW trx, will be skipped');

        return [];
      }

      const immediateWithdrawalTransferTrx = trx.out_msgs.find(((msg) => msg.op_code === STAKING_POOL_OP_NAMES.POOL_IMMEDIATE_WITHDRAWAL));
      if (immediateWithdrawalTransferTrx) {
        const event: StakingPoolEvent = {
          pool_id: pool.id,
          pool_addr: pool.contract_addr,
          hash: trx.hash,
          lt: trx.lt,
          created_at: trx.in_msg.created_at,
          type: 'IMMEDIATE_WITHDRAWAL',
          user_wallet_addr: trx.in_msg.decoded_body?.from_address,
          requested_amount: new BigNumber(trx.in_msg.decoded_body?.jetton_amount ?? 0),
          full_amount: new BigNumber(immediateWithdrawalTransferTrx.value),
        };
        event.reward_amount = new BigNumber(event.full_amount).minus(event.requested_amount);

        return [event];
      }

      const withdrawalPayoutTrx = trx.out_msgs.find((msg) => msg.op_code === STAKING_POOL_OP_NAMES.POOL_PAYOUT_MINT);
      if (!withdrawalPayoutTrx) {
        this.logger.warn({ trx }, 'receive unknown withdrawal trx, will be skipped');

        return [];
      }

      // if pool sent transaction to jetton_master, then it is trx rollback and jettons will be re-minted and sent back to user
      // the jetton_master will always be the source of in trx.
      // if this comparison is not true then it always mean that pool sent transaction to nft_collection
      const isRollbackJettonMint = withdrawalPayoutTrx.destination?.address === trx.in_msg.source?.address;
      if (isRollbackJettonMint) {
        return [{
          pool_id: pool.id,
          pool_addr: pool.contract_addr,
          hash: trx.hash,
          lt: trx.lt,
          created_at: trx.in_msg.created_at,
          type: 'ABORTED_WITHDRAWAL',
          user_wallet_addr: trx.in_msg.decoded_body?.from_address,
          requested_amount: new BigNumber(trx.in_msg.decoded_body?.jetton_amount ?? 0),
        }];
      }

      return [
        {
          pool_id: pool.id,
          pool_addr: pool.contract_addr,
          hash: trx.hash,
          lt: trx.lt,
          created_at: trx.in_msg.created_at,
          type: 'WITHDRAWAL_REQUEST',
          user_wallet_addr: trx.in_msg.decoded_body?.from_address,
          requested_amount: new BigNumber(trx.in_msg.decoded_body?.jetton_amount ?? 0),
        },
        {
          pool_id: pool.id,
          pool_addr: pool.contract_addr,
          hash: trx.hash,
          lt: trx.lt,
          created_at: trx.in_msg.created_at,
          type: 'NFT_COLLECTION_DISCOVERED',
          collection_addr: withdrawalPayoutTrx.destination?.address,
        },
      ];
    }

    return [];
  }

  async applyEvents(events: StakingPoolEvent[]) {
    // Needed Derivatives list:
    //  * Pool TVL (total value locked) - Should be on per pool basis. Can be scraped separately from pool get method.
    //    If not from pool method = total deposit + total net return (from boroowers) - total withdrawals (real, not delayed)
    //  
    //  * Pool stakers earns - Should be for per pool basis and per user wallet basis.
    //    For per user wallet basis - net earns (total withdrawals (with reward) - total deposit)
    //    For per pool basis - sum of all stakers (user wallets) earns
    //
    //  * User wallet stakes - Should be per user wallet basis.
    //    Sum of all user not withdrawn (actual, not delayed) deposits
    //  
    //  * User wallet pending and actual withdrawals - sum of all withdrawals each type
    //
    //  * Pool APR(24H, 7D, 30D) -
    //  Basically APR for Staking IS - total reward / total deposits * 100
    //  For 24H we need to take 24 hour history back, calc total reward calc total deposits and then apply formully.
    //  We can not take deposists events here. This should be based on withdrawals only.
    //
    //  So the final solution is. Find All real withrawals back in history 24H.
    //  Calc sum of requested withdrawal amount (will be total deposits), calc sum of withrawals reward (will be total rewards)
    //  and then apply formula
    //
    //
    //  * Pool APY-
    //  Basically APY = [1 + (APR / Number of Periods)]^(Number of Periods) - 1
    //  So we should take for example 30D APR. Number of periods is 365 days / avg_pool_raund legnth (for example 72h)
    //
    // Deriv caclulation should be a separate step??
    // write immediate withdrawals and withdrawal requests (row)
    // apply changes to user pool withdrawal aggregate
    // apply changes to pool withdrawal aggregate
    // calculate and update derivates??
    // write newly discovered nft_collections (remove duplicates first)
    // write aborted withdrawals to separate table ??
    // should not be transactional, but idempotent and duplicate tolerated

    const grouped = this.groupEventsForApply(events);
    await Promise.all([
      this.stakingPoolsNftCollectionsRepo.addOrIgnoreByEvents(grouped.NFT_COLLECTION_DISCOVERED),
      // TODO(this 2 calls bellow can be done in a single insert operation, can be optimized)
      this.stakingPoolWithdrawalsRepo.addOrIgnoreImmediateWithdrawalsByEvents(grouped.IMMEDIATE_WITHDRAWALS),
      this.stakingPoolWithdrawalsRepo.addOrIgnoreWithdrawalsRequestsByEvents(grouped.WITHDRAWAL_REQUEST),
    ]);
  }

  private groupEventsForApply(events: StakingPoolEvent[]) {
    const grouped: GroupedForApplyStakingPoolEvents = {
      NFT_COLLECTION_DISCOVERED: [],
      IMMEDIATE_WITHDRAWALS: [],
      WITHDRAWAL_REQUEST: [],
    };

    grouped.NFT_COLLECTION_DISCOVERED = uniqueBy(
      events.filter((e) => e.type === 'NFT_COLLECTION_DISCOVERED'),
      (e) => e.collection_addr,
    );
    grouped.IMMEDIATE_WITHDRAWALS = events.filter((e) => e.type === 'IMMEDIATE_WITHDRAWAL');
    grouped.WITHDRAWAL_REQUEST = events.filter((e) => e.type === 'WITHDRAWAL_REQUEST');

    return grouped;
  }
}