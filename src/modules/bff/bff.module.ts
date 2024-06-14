import { Module } from '@nestjs/common';
import { BffController } from './bff.controller';
import { CurrencyRatesService } from './currency-rates.service';
import { StakingPoolAggrRepo } from './repos/staking-pool-aggr.repo';
import { StakingService } from './staking.service';

@Module({
  controllers: [BffController],
  providers: [
    StakingService,
    StakingPoolAggrRepo,
    CurrencyRatesService,
  ],
})
export class BffModule {}