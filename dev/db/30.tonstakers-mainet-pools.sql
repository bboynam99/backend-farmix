--TRUNCATE TABLE app.staking_pools;
INSERT INTO app.staking_pools
(
 id,
 name,
 symbol,
 contract_addr,
 target_jetton_master_addr,
 pool_jetton_master_addr,
 disabled,
 is_ton_pool,
 deposit_fee,
 img_url
)
VALUES
(
 1,
 'TonStakers',
 'TONST',
 '0:a45b17f28409229b78360e3290420f13e4fe20f90d7e2bf8c4ac6703259e22fa',
 '',
 '0:bdf3fa8098d129b54b4f73b5bac5d1e1fd91eb054169c3916dfc8ccd536d1000',
 FALSE,
 TRUE,
 '1000000000',
 ''
);