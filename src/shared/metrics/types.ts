import {
  ClassProvider,
  ExistingProvider,
  FactoryProvider,
  ValueProvider,
} from '@nestjs/common';
import { Metric } from 'prom-client';

export type MetricsProvider = ClassProvider<Metric> | ValueProvider<Metric> | FactoryProvider<Metric> | ExistingProvider<Metric>;

export interface MainMetricsModuleOptions {
  httpPort?: number
  isMetricsEnabled?: boolean
  collectDefMetrics?: boolean
  defaultLabels?: Record<string, string>
  metrics?: MetricsProvider[]
}

export interface MainMetricsModuleConfiguration {
  httpPort: number
  collectDefMetrics: boolean
  defaultLabels: Record<string, string>
  isMetricsEnabled: boolean
}
