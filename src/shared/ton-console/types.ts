import { ApiConfig } from 'tonapi-sdk-js';

export interface TonConsoleApiConfig {
  token: string | symbol
  configKey?: string | symbol
  disablePing?: boolean
  config?: ApiConfig
}
