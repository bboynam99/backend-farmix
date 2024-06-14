import {
  ApiExtraModels,
  ApiProperty,
  IntersectionType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { SortDirections, StakingPoolSortings } from './constants';

export class OptionalStakerQuery {
  @ApiProperty({
    description: 'staker wallet addr',
    type: 'string',
    example: 'UQAXk8dPDqg-7O3kjxjFG2kHr9XoE6c-vUE1ER-9qJbz8q0l',
  })
  @Type(() => String)
  @IsOptional()
  walletAddr?: string;
}

export class SearchQuery {
  @ApiProperty({
    description: 'search query',
    type: 'string',
    example: 'TON',
    minLength: 3,
  })
  @Type(() => String)
  @IsOptional()
  @MinLength(3)
  q?: string;
}

export class StakingPoolSortQuery {
  @ApiProperty({
    description: 'sort result by predefined parameters',
    enum: StakingPoolSortings,
    example: StakingPoolSortings.TVL,
  })
  @Type(() => String)
  @IsOptional()
  @IsEnum(StakingPoolSortings)
  sortBy?: StakingPoolSortings;

  @ApiProperty({
    description: 'define sort direction of sorted result',
    enum: SortDirections,
    example: SortDirections.ASC,
    default: SortDirections.ASC,
    required: false,
  })
  @Type(() => String)
  @IsOptional()
  @IsEnum(SortDirections)
  sortDirection: SortDirections = SortDirections.ASC;
}

export class PaginationQuery {
  @ApiProperty({
    description: 'define max resulting items in response',
    type: 'number',
    minimum: 0,
    maximum: 100,
    example: 50,
    default: 50,
    required: false,
  })
  @Type(() => Number)
  @IsOptional()
  @Min(0)
  @Max(100)
  limit: number = 50;

  @ApiProperty({
    description: 'define cursor to start pagination, usually it should be set to nextCursor in last response from api',
    type: 'string',
  })
  @Type(() => String)
  @IsOptional()
  cursor?: string;
}

export class GetFullStakingPoolListQuery extends IntersectionType(
  SearchQuery,
  StakingPoolSortQuery,
  OptionalStakerQuery,
  PaginationQuery,
) {}

export class StakingPoolDescriptorSchema {
  id!: number;
  name!: string;
  symbol!: string;
  contractAddr!: string;
  targetJettonMasterAddr!: string;
  poolJettonMasterAddr!: string;
  depositFee!: string;
  isTonPool!: boolean;
  imgUrl?: string;
}

export class StakingPoolDerivsSchema {
  poolId!: number;
  tvl!: string;
  apr24!: string;
  apr168!: string;
  apr720!: string;
  apy!: string;
}

export class FullStakingPoolSchema {
  descriptor!: StakingPoolDescriptorSchema;
  currentDerivs!: StakingPoolDerivsSchema;
  staker?: StakerPoolStatsSchema;
}

export class StakerPoolStatsSchema {
  poolId!: number;
  walletAddr!: string;
  currentDeposits!: string;
  totalEarnings!: string;
}

export class FullStakingPoolListSchema {
  pools!: FullStakingPoolSchema[];
  nextCursor?: string;
}

export class CurrencyRatesQuery {
  @ApiProperty({
    description: 'accept ton and jetton master addresses, separated by commas',
    type: 'string',
    example: 'ton,EQBJOJ2eL_CUFT_0r9meoqjKUwRttC_-NUJyvWQxszVWe1WY',
    required: true,
  })
  @Type(() => String)
  @IsNotEmpty()
  tokens!: string;
}

export class TokenRate {
  @ApiProperty({
    required: false,
    type: 'object',
    patternProperties: {
      '*': { type: 'number' },
    },
    example: '{"TON":1.3710752873163712}',
  })
  prices?: Record<string, number>;

  @ApiProperty({
    required: false,
    example: '{"TON":"-1.28%"}',
    type: 'object',
    patternProperties: {
      '*': { type: 'string' },
    },
  })
  diff_24h?: Record<string, string>;

  @ApiProperty({
    required: false,
    example: '{"TON":"-1.28%"}',
    type: 'object',
    patternProperties: {
      '*': { type: 'string' },
    },
  })
  diff_7d?: Record<string, string>;

  @ApiProperty({
    required: false,
    example: '{"TON":"-1.28%"}',
    type: 'object',
    patternProperties: {
      '*': { type: 'string' },
    },
  })
  diff_30d?: Record<string, string>;
}

@ApiExtraModels(TokenRate)
export class GetRatesSchema {
  @ApiProperty({
    required: true,
    type: 'object',
  })
  rates!: Record<string, TokenRate>;
}