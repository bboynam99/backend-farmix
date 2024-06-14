import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { getPayload } from '../helpers';

export const Payload = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => getPayload(ctx),
);
