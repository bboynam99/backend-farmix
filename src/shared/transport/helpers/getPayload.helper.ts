import { ExecutionContext } from '@nestjs/common';

export const getPayload = <Payload extends Record<string, any> = Record<string, any>>(ctx: ExecutionContext) => {
  const transport = ctx.getType();
  if (transport === 'rpc') {
    return ctx.switchToRpc().getData();
  }

  const body = ctx.switchToHttp().getRequest().body;
  const params = ctx.switchToHttp().getRequest().params;

  return {
    ...(body || {}),
    ...(params || {}),
  } as Payload;
};
