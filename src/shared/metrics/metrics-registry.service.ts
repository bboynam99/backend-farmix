import { Inject } from '@nestjs/common';
import { Metric, Registry } from 'prom-client';
import { METRICS_REGISTER } from './constants';

// service to register metrics from other modules
export class MetricsRegistryService {
  constructor(@Inject(METRICS_REGISTER) private registry: Registry) {}

  public register(metric: Metric): void {
    this.registry.registerMetric(metric);
  }
}
