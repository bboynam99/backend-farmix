INSERT INTO app.staking_pools_nft_collections
(addr, pool_id, pool_addr, drained)
VALUES
($1, $2, $3, $4)
ON CONFLICT (addr) DO NOTHING;

INSERT INTO app.staking_pools_withdrawals
(hash, lt, creation_time, pool_id, trx_type_id, wallet_addr, requested_amount, reward_amount)
VALUES
()
ON CONFLICT (hash) DO NOTHING;


SELECT
    id,
    name,
    symbol,
    contract_addr,
    target_jetton_master_addr,
    pool_jetton_master_addr,
    deposit_fee,
    is_ton_pool,
    img_url,
    disabled
FROM app.staking_pools
WHERE disabled = FALSE
ORDER BY id;


SELECT
    id,
    addr,
    pool_id,
    pool_addr,
    drained
FROM app.staking_pools_nft_collections
WHERE drained = FALSE
ORDER BY id;

INSERT INTO app.staking_pools_sync_checkpoints
(pool_id, hash, lt, creation_time)
VALUES
($1, $2, $3, $4);

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


INSERT INTO app.staking_pools_nft_collections_sync_checkpoints
(collection_id, hash, lt, creation_time)
VALUES
($1, $2, $3, $4);

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


SELECT
    id,
    name,
    symbol,
    contract_addr,
    target_jetton_master_addr,
    pool_jetton_master_addr,
    deposit_fee,
    is_ton_pool,
    img_url,
    disabled
FROM app.staking_pools WHERE id = $1;


SELECT
    sp.id as pool_id,
    sp.name as pool_name,
    sp.symbol as pool_symbol,
    sp.contract_addr as pool_contract_addr,
    sp.target_jetton_master_addr as pool_target_jetton_master_addr,
    sp.pool_jetton_master_addr,
    sp.is_ton_pool as pool_is_ton_pool,
    sp.deposit_fee as pool_deposit_fee,
    sp.img_url as pool_img_url,
    spd.tvl as pool_tvl,
    spd.apr24 as pool_apr24,
    spd.apr168 as pool_apr168,
    spd.apr720 as pool_apr720,
    spd.apy as pool_apy,
    css.requested_deposits as user_requested_deposits,
    css.staked_deposits as user_staked_deposits,
    css.requested_withdrawals as user_requested_withdrawals,
    css.withdrawals_payouts as user_withdrawals_payouts,
    css.total_earnings as user_total_earnings
FROM app.staking_pools sp
LEFT JOIN app.current_staking_pools_derivs spd ON sp.id = spd.pool_id
LEFT JOIN app.current_stakers_stats css ON sp.id = css.pool_id
WHERE sp.disabled = FALSE



