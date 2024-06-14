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
import { ModuleRef } from '@nestjs/core';
import { collectDefaultMetrics, Registry } from 'prom-client';
import {
  defaultConfiguration,
  MAIN_METRICS_MODULE_CONFIG,
  METRICS_HTTP_SERVER,
  METRICS_REGISTER,
  METRICS_REGISTER_SERVICE,
  METRICS_TOKENS_LIST,
} from './constants';
import { MetricsRegistryService } from './metrics-registry.service';
import {
  MainMetricsModuleConfiguration,
  MainMetricsModuleOptions,
  MetricsProvider,
} from './types';
import { PromisifiedHttpServer } from '../utils/promisified-http-server';

@Module({})
@Global()
export class MainMetricsModule implements OnApplicationBootstrap, OnApplicationShutdown {
  static forRoot(options: MainMetricsModuleOptions = {}): DynamicModule {
    const module: DynamicModule = {
      module: MainMetricsModule,
    };

    const moduleConf = this.createModuleConfigProvider(options);
    const register = this.createPrometheusRegisterProvider();
    const server = this.createMetricsHttpServerProvider();
    const metricsList = this.createMetricsListProviders(options.metrics ?? []);
    const metricsRegisterServiceProvider = this.createMetricsRegisterServiceProvider();

    module.providers = [
      moduleConf,
      register,
      server,
      metricsList,
      ...(options.metrics ?? []),
      metricsRegisterServiceProvider,
    ];

    module.exports = [
      moduleConf,
      register,
      server,
      metricsList,
      ...(options.metrics ?? []),
      metricsRegisterServiceProvider,
    ];

    return module;
  }

  private static createMetricsRegisterServiceProvider(): Provider {
    return {
      provide: METRICS_REGISTER_SERVICE,
      useClass: MetricsRegistryService,
    };
  }

  private static createMetricsListProviders(metrics: MetricsProvider[]) {
    return {
      provide: METRICS_TOKENS_LIST,
      useValue: metrics.map(({ provide }) => provide),
    };
  }

  /**
   * creates module configuration provider to register in ioc container, which then will be used in onApplicationBoostrap
   */
  private static createModuleConfigProvider(options: MainMetricsModuleOptions): Provider<MainMetricsModuleConfiguration> {
    return {
      provide: MAIN_METRICS_MODULE_CONFIG,
      useFactory: async () => {
        const defaultLabels: Record<string, string> = {
          ...defaultConfiguration.defaultLabels,
          ...(options.defaultLabels || {}),
        };

        return {
          httpPort: options.httpPort ?? defaultConfiguration.httpPort,
          collectDefMetrics: options.collectDefMetrics ?? defaultConfiguration.collectDefMetrics,
          defaultLabels,
          isMetricsEnabled: options.isMetricsEnabled ?? defaultConfiguration.isMetricsEnabled,
        };
      },
    };
  }

  private static createPrometheusRegisterProvider(): Provider {
    return {
      provide: METRICS_REGISTER,
      useClass: Registry,
    };
  }

  private static createMetricsHttpServerProvider(): Provider {
    return {
      provide: METRICS_HTTP_SERVER,
      useFactory: async (register: Registry) => {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        return new PromisifiedHttpServer(async (req, res) => {
          res.setHeader('Content-Type', register.contentType);
          res.writeHead(200);
          res.end(await register.metrics());
        });
      },
      inject: [METRICS_REGISTER],
    };
  }

  private logger = new Logger(MainMetricsModule.name);

  constructor(
    @Inject(MAIN_METRICS_MODULE_CONFIG) private moduleConf: MainMetricsModuleConfiguration,
    @Inject(METRICS_REGISTER) private register: Registry,
    @Inject(METRICS_HTTP_SERVER) private server: PromisifiedHttpServer,
    @Inject(METRICS_TOKENS_LIST) private metricsTokens: string[],
    private moduleRef: ModuleRef,
  ) {}

  async onApplicationBootstrap() {
    if (!this.moduleConf.isMetricsEnabled) return;

    this.register.setDefaultLabels(this.moduleConf!.defaultLabels);

    if (this.moduleConf.collectDefMetrics) {
      collectDefaultMetrics({ register: this.register });
    }

    for (const metricsToken of this.metricsTokens) {
      const metric = this.moduleRef.get(metricsToken);

      this.register.registerMetric(metric);
    }

    await this.server.listen(this.moduleConf!.httpPort);

    this.logger.log('metrics server has started');
  }

  async onApplicationShutdown() {
    if (!this.moduleConf.isMetricsEnabled) return;

    await this.server.close();

    this.logger.debug('metrics server has stopped');

    this.register.clear();

    this.logger.debug('prometheus register is cleared');
  }
}
