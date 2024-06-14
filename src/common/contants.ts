
export const SIX_MONTHS_IN_SEC = 15_780_000;

export const STAKING_POOL_OP_NAMES = {
  GOVERNER_HALT: '0x7247e7a5',
  GOVERNER_SET_SUDOER: '0x79e7c016',
  GOVERNER_SET_ROLES: '0x5e517f36',
  GOVERNER_SET_GOVERNANCE_FEE: '0x2aaa96a0',
  GOVERNER_SET_DEPOSIT_SETTINGS: '0x9bf5561c',
  CONTROLLER_CREDIT: '0x1690c604',
  POOL_LOAN_REPAYMENT: '0xdfdca27b',
  POOL_REQUEST_LOAN: '0xdfdca27b',
  POOL_DEPLOY_CONTROLLER: '0xb27edcad',
  POOL_TOUCH: '0x4bc7c2df',
  POOL_DEPOSIT: '0x47d54391',
  POOL_WITHDRAW: '0x319b0cdc',
  POOL_IMMEDIATE_WITHDRAWAL: '0x0a77535c',
  POOL_PAYOUT_MINT: '0x1674b0a0',
  POOL_DONATE: '0x73affe21',
  POOL_START_DISTRIBUTION: '0x1140a64f',
  NFT_COLLECTION_BURN_NOTIFICATION: '0xed58b0b2',
  NFT_PAYOUT: '0xdb3b8abd',
  SUDO_POOL_UPGRADE: '0x96e7f528',
  INTEREST_MANAGER_SET_INTEREST: '0xc9f04485',
};

export const STAKING_POOL_EVENTS_TYPES = {
  // happened when optimistic_deposits_withdrawals is enabled 
  // and pool can immediately satisfy request
  IMMEDIATE_WITHDRAWAL: 1,
  // happened when optimistic_deposits_withdrawals is enabled
  // and request has special flag to indicate that in case of failure jettons transfer should be rollback
  ABORTED_WITHDRAWAL: 2,
  // happened when optimistic_deposits_withdrawals is disabled
  // or when pool can not satisfy immediate request instantly
  // this event is like withdrawal promise which will be fulfilled when pool round ends
  // the WITHDRAWAL_PAYOUT event will be scraped from nft_collections when fulfill will happened
  WITHDRAWAL_REQUEST: 3,
  // happened when nft collection is detected in pool transactions,
  // this is event is needed to handle dynamic nft collections of the pool,
  // each pool round new nft collection is deployed, so we should keep track of them.
  // This event is likely to have many duplicates.
  // Duplicates should be handled in post processing correctly.
  NFT_COLLECTION_DISCOVERED: 4,
};

export const STAKING_POOL_NFT_COLLECTION_EVENT_TYPES = {
  NFT_COLLECTION_DRAINED: 5,
  NFT_COLLECTION_NFT_PAYOUT: 6,
};