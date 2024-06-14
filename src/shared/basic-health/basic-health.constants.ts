export const BASIC_HEALTH_SERVER = Symbol('BASIC_HEALTH_SERVER');
export const BASIC_HEALTH_CONFIG = Symbol('BASIC_HEALTH_CONFIG');

export const defaultHealthParams = {
  port: 9990,
  enabled: () => true,
};
