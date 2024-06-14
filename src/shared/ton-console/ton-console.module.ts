import {
  DynamicModule,
  Global,
  Inject,
  Logger,
  Module,
  OnApplicationBootstrap,
  Provider,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  Api,
  ApiConfig,
  HttpClient,
} from 'tonapi-sdk-js';
import { TON_CONSOLE_APIS_LIST } from './constants';
import { TonConsoleApiConfig } from './types';

@Module({})
@Global()
export class TonConsoleModule implements OnApplicationBootstrap {
  static forRoot(apiConfigs: TonConsoleApiConfig[] = []): DynamicModule {
    const module: DynamicModule = {
      module: TonConsoleModule,
      global: true,
    };

    const { providers, list } = this.createApiProviders(apiConfigs);

    module.providers = [
      ...providers,
      list,
    ];

    module.exports = [
      ...providers,
      list,
    ];

    return module;
  }

  private static createApiProviders(configs: TonConsoleApiConfig[]): { providers: Provider[], list: Provider } {
    const providers = configs.map((conf) => {
      return {
        provide: conf.token,
        useFactory: (injectedConf?: ApiConfig) => {
          const finalConfiguration: ApiConfig = {
            ...conf.config,
            ...injectedConf,
          };

          if (!finalConfiguration.baseUrl) {
            throw new Error('can not create ton console api provider, because of invalid config: config.baseUrl is missing');
          }

          const httpClient = new HttpClient(finalConfiguration);

          const api = new Api(httpClient);

          return api;
        },
        inject: [{ optional: true, token: conf.configKey ?? '' }],
      };
    });

    const list: Provider = {
      provide: TON_CONSOLE_APIS_LIST,
      useValue: configs.map((c) => ({ token: c.token, disablePing: c.disablePing ?? false })),
    };

    return {
      providers,
      list,
    };
  }

  private logger = new Logger(TonConsoleModule.name);

  constructor(
    @Inject(TON_CONSOLE_APIS_LIST) private apisList: Array<{ token: string | symbol, disablePing: boolean }>,
    private moduleRef: ModuleRef,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const promises = this.apisList.map(async ({ token, disablePing }) => {
      if (disablePing) return;

      const api: Api<any> = this.moduleRef.get(token, { strict: false });
      const res = await api.http.request({
        path: '/v2/status',
      });

      this.logger.debug({ res }, `ton api (${token.toString()}) ping succeed`);
    });

    await Promise.all(promises);
  }
}