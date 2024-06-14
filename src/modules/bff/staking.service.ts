import { Injectable, NotFoundException } from '@nestjs/common';
import { Address } from '@ton/core';
import BigNumber from 'bignumber.js';
import { SortDirections, StakingPoolSortings } from './constants';
import { PoolAggrRecord, StakingPoolAggrRepo } from './repos/staking-pool-aggr.repo';
import {
  FullStakingPoolListSchema,
  FullStakingPoolSchema,
  StakingPoolDerivsSchema,
  StakingPoolDescriptorSchema,
} from './schema';

@Injectable()
export class StakingService {
  constructor(
    private stakingPoolAggrRepo: StakingPoolAggrRepo,
  ) {}

  async getFullPullList(
    query?: string,
    stakerWalletAddr?: string,
    cursor?: string,
    limit?: number,
    sortBy?: StakingPoolSortings,
    sortDirection?: SortDirections,
  ): Promise<FullStakingPoolListSchema> {
    const rowAddr = stakerWalletAddr
      ? Address.parse(stakerWalletAddr).toRawString()
      : undefined;

    const { records, nextCursor } = await this.stakingPoolAggrRepo.getList(
      query,
      rowAddr,
      cursor,
      limit,
      sortBy,
      sortDirection,
    );

    return {
      pools: records.map((r) => this.formatToSchema(r, rowAddr)),
      nextCursor,
    };
  }

  async getFullPullBySymbol(symbol: string, stakerWalletAddr?: string): Promise<FullStakingPoolSchema> {
    const rowAddr = stakerWalletAddr
      ? Address.parse(stakerWalletAddr).toRawString()
      : undefined;

    const record = await this.stakingPoolAggrRepo.getBySymbol(symbol, rowAddr);

    if (!record) {
      throw new NotFoundException(`staking pool with ${symbol} not found`);
    }

    return this.formatToSchema(record, rowAddr);
  }

  private formatToSchema(record: PoolAggrRecord, stakerWalletAddr?: string): FullStakingPoolSchema {
    const descriptor: StakingPoolDescriptorSchema = {
      id: record.pool_id,
      name: record.pool_name,
      symbol: record.pool_symbol,
      contractAddr: record.pool_contract_addr,
      targetJettonMasterAddr: record.pool_target_jetton_master_addr,
      poolJettonMasterAddr: record.pool_jetton_master_addr,
      depositFee: record.pool_deposit_fee,
      isTonPool: record.pool_is_ton_pool,
      imgUrl: record.pool_img_url,
    };
    const derivs: StakingPoolDerivsSchema = {
      poolId: record.pool_id,
      tvl: record.pool_tvl ?? '0',
      apr24: record.pool_apr24 ?? '0',
      apr168: record.pool_apr168 ?? '0',
      apr720: record.pool_apr720 ?? '0',
      apy: record.pool_apy ?? '0',
    };

    const fullStake: FullStakingPoolSchema = {
      descriptor,
      currentDerivs: derivs,
    };

    if (stakerWalletAddr) {
      const currentDepositsBN = new BigNumber(record.user_requested_deposits ?? '0')
        .minus(record.user_requested_withdrawals ?? 0);

      const currentDeposits = currentDepositsBN.isNegative() ? '0' : currentDepositsBN.toString();

      fullStake.staker = {
        poolId: record.pool_id,
        walletAddr: stakerWalletAddr,
        currentDeposits,
        totalEarnings: record.user_total_earnings ?? '0',
      };
    }

    return fullStake;
  }

}