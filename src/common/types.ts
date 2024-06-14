import { STAKING_POOL_EVENTS_TYPES, STAKING_POOL_NFT_COLLECTION_EVENT_TYPES } from './contants';

export interface StakingPoolDescriptor {
  id: number
  name: string
  symbol: string
  contract_addr: string
  target_jetton_master_addr: string
  pool_jetton_master_addr: string
  deposit_fee: string
  is_ton_pool: boolean
  disabled: boolean
  img_url?: string
}

export interface StakingPoolSyncCheckpoint {
  id: string
  pool_id: number
  hash: string
  lt: string
  creation_time: string
}

export interface StakingPoolNftCollectionDescriptor {
  id: number
  addr: string
  pool_id: number
  pool_addr: string
  drained: boolean
}

export interface StakingPoolNftCollectionSyncCheckpoint {
  id: string
  collection_id: number
  hash: string
  lt: string
  creation_time: string
}

/**
 * The staking pool event is actually a result of parsing, analyzing pool transactions.
 * Parsing and analyzing pool transaction may led to 0, 1 or many staking pool events
 */
export interface StakingPoolEvent<T extends keyof typeof STAKING_POOL_EVENTS_TYPES = any> {
  pool_id: number
  pool_addr: string
  type: T,
  hash: string
  lt: number,
  created_at: number,
  [index: string]: any
}

export interface StakingPoolNftCollectionEvent<T extends keyof typeof STAKING_POOL_NFT_COLLECTION_EVENT_TYPES = any> {
  id: number
  addr: string
  pool_id: number
  pool_addr: string
  hash: string
  lt: number
  created_at: number
  type: T,
  [index: string]: any
}
