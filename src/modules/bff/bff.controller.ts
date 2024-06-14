import {
  Controller,
  Get,
  HttpCode,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CurrencyRatesService } from './currency-rates.service';
import {
  CurrencyRatesQuery,
  FullStakingPoolListSchema,
  FullStakingPoolSchema,
  GetFullStakingPoolListQuery,
  GetRatesSchema,
  OptionalStakerQuery,
} from './schema';
import { StakingService } from './staking.service';

@Controller()
export class BffController {
  constructor(
    private stakingService: StakingService,
    private currencyRatesService: CurrencyRatesService,
  ) {}

  @ApiOperation({
    description: 'Get full (descriptor, apr\'s, TVL, user stake and reward) staking pool list with pagination',
    summary: 'Get full staking pool list',
  })
  @ApiOkResponse({
    status: 200,
    description: 'Full staking pool list',
    type: FullStakingPoolListSchema,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request exception',
  })
  @HttpCode(200)
  @Get('/api/staking/pool/list')
  async getFullStakingPoolList(@Query() searchOptions: GetFullStakingPoolListQuery) {
    return this.stakingService.getFullPullList(
      searchOptions.q,
      searchOptions.walletAddr,
      searchOptions.cursor,
      searchOptions.limit,
      searchOptions.sortBy,
      searchOptions.sortDirection,
    );
  }

  async getFullFarmersPoolList() {

  }

  @ApiOperation({
    description: 'Get full (descriptor, apr\'s, TVL, user stake and reward) staking pool by pool name',
    summary: 'Get full staking pool',
  })
  @ApiOkResponse({
    status: 200,
    description: 'Full staking pool',
    type: FullStakingPoolSchema,
  })
  @ApiResponse({
    status: 404,
    description: 'Pool with specified name not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request exception',
  })
  @HttpCode(200)
  @Get('/api/staking/pool/:symbol')
  async getFullStakingPool(
    @Param('symbol') poolSymbol: string,
    @Query() searchOptions: OptionalStakerQuery,
  ) {
    return this.stakingService.getFullPullBySymbol(poolSymbol, searchOptions.walletAddr);
  }

  @ApiOperation({
    description: 'Get rates by symbol for ton or jetton master addr, currently support ton and usd rates, ' +
      'the response format is similar to this https://docs.tonconsole.com/tonapi/api-v2 (v2/rates)',
    summary: 'get rates by jetton master addr',
  })
  @ApiOkResponse({
    status: 200,
    description: 'record of requested rates',
    type: GetRatesSchema,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request exception',
  })
  @Get('/api/rates')
  async getRates(
    @Query() query: CurrencyRatesQuery,
  ) {
    const rates = await this.currencyRatesService.getRates(query.tokens);

    return { rates };
  }
}