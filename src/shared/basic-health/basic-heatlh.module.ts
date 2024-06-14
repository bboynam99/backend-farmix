import {
  DynamicModule,
  Global,
  Inject,
  Logger,
  Module,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  Provider,
} from '@nestjs/common';
import {
  BASIC_HEALTH_CONFIG,
  BASIC_HEALTH_SERVER,
  defaultHealthParams,
} from './basic-health.constants';
import { BasicHealthParams } from './basic-health.types';
import { PromisifiedHttpServer } from '../utils/promisified-http-server';

@Module({})
@Global()
export class BasicHealthModule implements OnApplicationBootstrap, OnApplicationShutdown {
  private static logger = new Logger(BasicHealthModule.name);

  static forRoot(params: BasicHealthParams = {}): DynamicModule {
    const configProvider = this.createConfigProvider(params);
    const serverProvider = this.createServerProvider();

    return {
      module: BasicHealthModule,
      global: true,
      providers: [
        configProvider,
        serverProvider,
      ],
      exports: [
        configProvider,
        serverProvider,
      ],
    };
  }

  private static createConfigProvider(params: BasicHealthParams): Provider {
    return {
      provide: BASIC_HEALTH_CONFIG,
      useFactory: async (iocConf?: BasicHealthParams) => ({
        ...defaultHealthParams,
        ...(iocConf || {}),
        ...params,
      }),
      inject: params.configKey ? [params.configKey] : [],
    };
  }

  private static createServerProvider(): Provider {
    return {
      provide: BASIC_HEALTH_SERVER,
      useFactory: async () => new PromisifiedHttpServer((req, res) => {
        try {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end();

        } catch (err) {
          this.logger.error({ err }, 'error happened while parsing request in basic health server');

          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end();
        }

        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end();
      }),
    };
  }

  private logger = new Logger(BasicHealthModule.name);

  constructor(
    @Inject(BASIC_HEALTH_CONFIG) private conf: BasicHealthParams,
    @Inject(BASIC_HEALTH_SERVER) private server: PromisifiedHttpServer,
  ) {}

  async onApplicationBootstrap() {
    if (this.conf.enabled && !this.conf.enabled()) return;

    await this.server.listen(this.conf.port!);

    this.logger.log(`health server has started on port ${this.conf.port!}`);
  }

  async onApplicationShutdown() {
    if (this.conf.enabled && !this.conf.enabled()) return;

    await this.server.close();

    this.logger.debug('health server has stopped');
  }
}
