import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import IORedis from 'ioredis';
import { Api, TokenRates } from 'tonapi-sdk-js';
import { AllAvailableCurrencies } from './constants';
import {
  MAIN_REDIS,
  TON_CONSOLE,
  tonConsoleConfig,
} from '../../config';

@Injectable()
export class CurrencyRatesService {
  constructor(
    @Inject(MAIN_REDIS) private redis: IORedis,
    @Inject(TON_CONSOLE) private tonConsole: Api<any>,
    @Inject(tonConsoleConfig.KEY) private tonConsoleConf: ConfigType<typeof tonConsoleConfig>,
  ) {}

  async getRates(tokensStr: string): Promise<Record<string, TokenRates>> {
    const tokens = this.formatTokens(tokensStr);

    const cached = await this.getManyFromCache(tokens);

    if (cached) {
      return cached;
    }

    const res = await this.tonConsole.rates.getRates(
      { tokens: [tokens.join(',')], currencies: [AllAvailableCurrencies.join(',')] },
      { signal: this.tonConsoleConf.timeout() },
    );

    await this.saveManyToCache(res.rates);

    return res.rates;
  }

  private async saveManyToCache(rates: Record<string, TokenRates>): Promise<void> {
    const pipeline = this.redis.pipeline();

    Object.entries(rates).forEach(([token, rate]) => {
      pipeline.set(
        this.cacheKey(token),
        JSON.stringify(rate),
        'EX',
        this.tonConsoleConf.ratesCacheTtlSec,
      );
    });

    await pipeline.exec();
  }

  private async getManyFromCache(tokens: string[]) {
    const res = await this.redis.mget(tokens.map((t) => this.cacheKey(t)));

    const isEveryFound = res.every((str) => Boolean(str));

    if (!isEveryFound) {
      return;
    }

    return res.reduce((acc, r, i) => {
      acc[tokens[i]] = JSON.parse(r as string);

      return acc;
    }, {} as Record<string, TokenRates>);
  }

  private cacheKey(token: string) {
    return `ton_console_rates_cache:${token}`;
  }

  private formatTokens(tokensStr: string): string[] {
    const tokens = tokensStr.split(',');

    return tokens.map((t) => {
      if (t.toLowerCase() === 'ton') {
        return 'TON';
      }

      return t;
    });
  }
}