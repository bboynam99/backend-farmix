import { MainMetricsModuleConfiguration } from './types';

export const MAIN_METRICS_MODULE_CONFIG = 'MAIN_METRICS_MODULE_CONFIG';
export const METRICS_REGISTER = 'METRICS_REGISTER';
export const METRICS_HTTP_SERVER = 'METRICS_HTTP_SERVER';
export const METRICS_TOKENS_LIST = 'METRICS_TOKENS_LIST';

export const METRICS_REGISTER_SERVICE = 'METRICS_REGISTER_SERVICE' as const;

export const defaultConfiguration: MainMetricsModuleConfiguration = {
  httpPort: 9987,
  collectDefMetrics: true,
  defaultLabels: {},
  isMetricsEnabled: false,
};