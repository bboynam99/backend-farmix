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
    deposit_fee
)
VALUES
    (10, 'TonStakerTon', 'TONSTT', 'iukjlkj;', ';klj;kj', 'jkljlkj', FALSE, TRUE, '1000000000'),
    (11, 'FarmixTon', 'TONSTS', 'iukjkljlklkj;', ';klj;kj', 'jkljlkj', FALSE, TRUE, '1000000000'),
    (12, 'FarmixUsdt', 'USDTFM', 'dfas', 'adsfsadf', 'dfasf', FALSE, TRUE, '1000000000'),
    (13, 'TonStakersUsdt', 'USDTST', 'asdfas', 'dsfasf', 'dfaswrerf', FALSE, TRUE, '1000000000'),
    (14, 'TonStakersFarmix', 'TSFM', 'asd34ffs', 'boaslkrk', 'sldfjaskl', FALSE, TRUE, '1000000000'),
    (15, 'FarmixStaker', 'FARMFM', 'sdfljak', 'rjvmla','adflajsdfkl' , FALSE, TRUE, '1000000000'),
    (16, 'StonfiStake', 'STONFM', 'aserkjf', 'bkljask', 'aekjrkjbv', FALSE, TRUE, '1000000000'),
    (17, 'SepaaaStake', 'SEPFM', 'asdfjaskldfj', 'sdlfkjasrik', 'dlfkjas', FALSE, TRUE, '1000000000'),
    (18, 'CoinPool', 'COINFM', 'sdfkljaskldfj', 'eruiuggj', 'sdfjkslfj', FALSE, TRUE, '1000000000'),
    (19, 'SdddSss', 'SDRRFM', 'sdfjsklfj', 'sdfkljslkfj', 'sdfiugjkb', FALSE, TRUE, '1000000000');