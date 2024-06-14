import pino from 'pino';

export type PinoMethods = Pick<pino.Logger, 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'>;

/**
 * This is copy of pino.LogFn but with possibilty to make method override.
 * Current usage works:
 *
 *  trace(msg: string, ...args: any[]): void;
 *  trace(obj: object, msg?: string, ...args: any[]): void;
 *  trace(...args: Parameters<LoggerFn>) {
 *    this.call('trace', ...args);
 *  }
 *
 * But if change local LoggerFn to pino.LogFn – this will say that overrides
 * are incompatible
 */
export type LoggerFn = ((msg: string, ...args: any[]) => void) | ((obj: object, msg?: string, ...args: any[]) => void);

export interface MainLoggerModuleConfig extends pino.LoggerOptions {
  contextFieldName?: string
  pretty?: boolean
  prettyOptions?: {
    colorize?: boolean
    singleLine?: boolean
  },
  configKey?: string | symbol
  throttleLimit?: number
  throttleLimitTttMs?: number
}
