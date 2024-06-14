DROP SCHEMA IF EXISTS app CASCADE;
CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;




DROP TABLE IF EXISTS app.trx_types;
CREATE TABLE app.trx_types (
    id SMALLINT PRIMARY KEY,
    name VARCHAR(256)
);

INSERT INTO app.trx_types
    (id, name)
VALUES
    (1, 'IMMEDIATE_WITHDRAWAL'),
    (2, 'ABORTED_WITHDRAWAL'),
    (3, 'WITHDRAWAL_REQUEST'),
    (4, 'NFT_COLLECTION_DISCOVERED'),
    (5, 'NFT_COLLECTION_DRAINED'),
    (6, 'NFT_COLLECTION_NFT_PAYOUT');




DROP TABLE IF EXISTS app.staking_pools;
CREATE TABLE app.staking_pools
(
    id INT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    symbol VARCHAR(50) UNIQUE NOT NULL,
    contract_addr VARCHAR(256) UNIQUE NOT NULL,
    target_jetton_master_addr VARCHAR(256) NOT NULL,
    pool_jetton_master_addr VARCHAR(256) NOT NULL,
    disabled BOOL NOT NULL,
    is_ton_pool BOOL NOT NULL,
    deposit_fee BIGINT NOT NULL,
    img_url VARCHAR(256),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TRIGGER staking_pools_set_updated_at
BEFORE UPDATE ON app.staking_pools
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE INDEX app_staking_pools_lowered_symbols
ON app.staking_pools (LOWER(symbol));




DROP TABLE IF EXISTS app.staking_pools_sync_checkpoints;
CREATE TABLE app.staking_pools_sync_checkpoints
(
    id BIGSERIAL PRIMARY KEY,
    pool_id INT NOT NULL,
    hash VARCHAR(256) NOT NULL,
    lt BIGINT NOT NULL,
    creation_time BIGINT NOT NULL
);

CREATE INDEX app_staking_pools_sync_checkpoints_last_sync
ON app.staking_pools_sync_checkpoints (pool_id, creation_time DESC);




DROP TABLE IF EXISTS app.staking_pools_nft_collections;
CREATE TABLE app.staking_pools_nft_collections
(
    id SERIAL PRIMARY KEY,
    addr VARCHAR(256) UNIQUE NOT NULL,
    pool_id INT NOT NULL,
    pool_addr VARCHAR(256) NOT NULL,
    drained BOOlEAN NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TRIGGER staking_pools_nft_collections_set_updated_at
BEFORE UPDATE ON app.staking_pools_nft_collections
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE INDEX app_staking_pools_nft_collections_not_drained
ON app.staking_pools_nft_collections (drained) WHERE drained = FALSE;




DROP TABLE IF EXISTS app.staking_pools_nft_collections_sync_checkpoints;
CREATE TABLE app.staking_pools_nft_collections_sync_checkpoints
(
    id BIGSERIAL PRIMARY KEY,
    collection_id INT NOT NULL,
    hash VARCHAR(256) NOT NULL,
    lt BIGINT NOT NULL,
    creation_time BIGINT NOT NULL
);

CREATE INDEX app_staking_pools_nft_collections_sync_checkpoints_last_sync
ON app.staking_pools_nft_collections_sync_checkpoints (collection_id, creation_time DESC);


DROP TABLE IF EXISTS app.staking_pools_withdrawals;
CREATE TABLE app.staking_pools_withdrawals (
    id BIGSERIAL PRIMARY KEY,
    hash VARCHAR(256) UNIQUE NOT NULL,
    lt BIGINT NOT NULL,
    creation_time INT NOT NULL,
    pool_id INT NOT NULL,
    trx_type_id SMALLINT NOT NULL,
    wallet_addr VARCHAR(256) NOT NULL,
    requested_amount BIGINT NOT NULL,
    reward_amount BIGINT NOT NULL,
    created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX app_staking_pool_withdrawals_creation_time
ON app.staking_pools_withdrawals (creation_time);

CREATE INDEX app_staking_pool_withdrawals_pool_id_trx_type_id
ON app.staking_pools_withdrawals (pool_id, trx_type_id);

CREATE INDEX app_staking_pools_withdrawals_wallet_addr_trx_type_id
ON app.staking_pools_withdrawals (wallet_addr, trx_type_id);

DROP TABLE IF EXISTS app.current_staking_pools_stats;
CREATE TABLE app.current_staking_pools_stats
(
    pool_id INT PRIMARY KEY,
    requested_deposits BIGINT NOT NULL DEFAULT 0,
    staked_deposits BIGINT NOT NULL DEFAULT 0,
    requested_withdrawals BIGINT NOT NULL DEFAULT 0,
    withdrawals_payouts BIGINT NOT NULL DEFAULT 0,
    total_earnings BIGINT NOT NULL DEFAULT 0
);

DROP TABLE IF EXISTS app.current_staking_pools_derivs;
CREATE TABLE app.current_staking_pools_derivs
(
    pool_id INT PRIMARY KEY,
    tvl BIGINT NOT NULL DEFAULT 0,
    apr24 BIGINT NOT NULL DEFAULT 0,
    apr168 BIGINT NOT NULL DEFAULT 0,
    apr720 BIGINT NOT NULL DEFAULT 0,
    apy BIGINT NOT NULL DEFAULT 0
);

DROP TABLE IF EXISTS app.current_stakers_stats;
CREATE TABLE app.current_stakers_stats
(
    id BIGSERIAL PRIMARY KEY,
    wallet_addr VARCHAR(256) NOT NULL,
    pool_id INT NOT NULL,
    UNIQUE (wallet_addr, pool_id),
    requested_deposits BIGINT NOT NULL DEFAULT 0,
    staked_deposits BIGINT NOT NULL DEFAULT 0,
    requested_withdrawals BIGINT NOT NULL DEFAULT 0,
    withdrawals_payouts BIGINT NOT NULL DEFAULT 0,
    total_earnings BIGINT NOT NULL DEFAULT 0
);



-- DROP TABLE IF EXISTS app.staking_pools_deposits;
-- CREATE TABLE app.staking_pools_deposits
-- (
--     id BIGSERIAL PRIMARY KEY,
--     hash VARCHAR(256) UNIQUE NOT NULL,
--     creation_time INT NOT NULL,
--     pool_id INT NOT NULL
-- );


--
-- DROP TABLE IF EXISTS public.staking_pools_tvl;
-- CREATE TABLE public.staking_pools_tvl
-- (
--     pool_id INT PRIMARY KEY,
--     current_jetton_tvl,
-- );
--
-- DROP TABLE IF EXISTS pubic.staking_pools_apr;
-- CREATE TABLE public.staking_pools_apr
-- (
--     pool_id INT PRIMARY KEY,
--     24h,
--     72h,
--     720h,
-- );
--
--
-- DROP TABLE IF EXISTS public.stakers;
-- CREATE TABLE IF EXISTS public.stakers_current_stake
-- (
--     id BIGSERIAL PRIMARY KEY,
--     wallet_addr VARCHAR(256) UNIQUE NOT NULL,
--     current_stake
-- )
--
-- DROP TABLE IF EXISTS public.stakers_history;
-- CREATE TABLE IF EXISTS public.stakers_history
-- (
--     id BIGSERIAL PRIMARY KEY,
--
-- )
--
--
--


DROP TABLE IF EXISTS app.farmers_pools;
CREATE TABLE app.farmers_pools (
    id INT PRIMARY KEY,
    name VARCHAR(70) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    dex VARCHAR(50) NOT NULL,
    UNIQUE (symbol, dex),
    contract_addr VARCHAR(256) UNIQUE NOT NULL,
    target_liquidity_pool_addr VARCHAR(256) UNIQUE NOT NULL,
    base_jetton_pool_id INT NOT NULL,
    quote_jetton_pool_id INT NOT NULL,
    disabled BOOL NOT NULL,
    img_url VARCHAR(256),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TRIGGER staking_pools_set_updated_at
    BEFORE UPDATE ON app.staking_pools
    FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();


DROP TABLE IF EXISTS app.current_farmers_pools_derivs;
CREATE TABLE app.current_farmers_pools_derivs (
    pool_id INT PRIMARY KEY,
    volume24 BIGINT NOT NULL DEFAULT 0,
    apr24 BIGINT NOT NULL DEFAULT 0,
    apr168 BIGINT NOT NULL DEFAULT 0,
    apr720 BIGINT NOT NULL DEFAULT 0,
    apy BIGINT NOT NULL DEFAULT 0,
    pnl BIGINT NOT NULL DEFAULT 0
);



DROP TABLE IF EXISTS app.farmers_positions_statuses;
CREATE TABLE app.farmers_positions_statuses (
    id SMALLINT PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

INSERT INTO app.farmers_positions_statuses
(id, name)
VALUES
(1, 'opened'),
(2, 'closed'),
(3, 'liquidated');

CREATE TABLE app.farmers_positions (
    id BIGSERIAL PRIMARY KEY,
    wallet_addr VARCHAR(256) NOT NULL,
    pool_id INT NOT NULL,
    status_id SMALLINT NOT NULL,
    base_jetton_total_amount BIGINT NOT NULL,
    quote_jetton_total_amount BIGINT NOT NULL,
    base_jetton_leverage BIGINT NOT NULL,
    quote_jetton_leverage BIGINT NOT NULL,
    entry_price BIGINT NOT NULL,
    liquidation_price BIGINT NOT NULL,
    profit BIGINT NOT NULL,
    pnl BIGINT NOT NULL,
    creation_time INT NOT NULL
);

CREATE TABLE app.farmers_positions_history (
   id BIGSERIAL PRIMARY KEY,
   wallet_addr VARCHAR(256) NOT NULL,
   pool_id INT NOT NULL,
   status_id SMALLINT NOT NULL,
   base_jetton_total_amount BIGINT NOT NULL,
   quote_jetton_total_amount BIGINT NOT NULL,
   base_jetton_leverage BIGINT NOT NULL,
   quote_jetton_leverage BIGINT NOT NULL,
   entry_price BIGINT NOT NULL,
   liquidation_price BIGINT NOT NULL,
   profit BIGINT NOT NULL,
   pnl BIGINT NOT NULL,
   fee BIGINT NOT NULL,
   creation_time INT NOT NULL
)



-- DROP TABLE IF EXISTS app.current_staking_pools_stats;
-- CREATE TABLE app.current_staking_pools_stats
-- (
--     pool_id INT PRIMARY KEY,
--     requested_deposits BIGINT NOT NULL DEFAULT 0,
--     staked_deposits BIGINT NOT NULL DEFAULT 0,
--     requested_withdrawals BIGINT NOT NULL DEFAULT 0,
--     withdrawals_payouts BIGINT NOT NULL DEFAULT 0,
--     total_earnings BIGINT NOT NULL DEFAULT 0
-- );


-- DROP TABLE IF EXISTS app.current_stakers_stats;
-- CREATE TABLE app.current_stakers_stats
-- (
--     id BIGSERIAL PRIMARY KEY,
--     wallet_addr VARCHAR(256) NOT NULL,
--     pool_id INT NOT NULL,
--     UNIQUE (wallet_addr, pool_id),
--     requested_deposits BIGINT NOT NULL DEFAULT 0,
--     staked_deposits BIGINT NOT NULL DEFAULT 0,
--     requested_withdrawals BIGINT NOT NULL DEFAULT 0,
--     withdrawals_payouts BIGINT NOT NULL DEFAULT 0,
--     total_earnings BIGINT NOT NULL DEFAULT 0
-- );