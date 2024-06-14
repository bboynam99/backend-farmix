import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UseGuards,
} from '@nestjs/common';

@Injectable()
export class ProtectByAppKeyGuard implements CanActivate {
  constructor(private readonly appInternalKey: string) {}

  canActivate(ctx: ExecutionContext): boolean | Promise<boolean> {
    const transport = ctx.getType();

    if (transport !== 'http') {
      throw new InternalServerErrorException('only http transport is supported by ProtectByAppKeyGuard guard');
    }

    const appKeyHeader = ctx.switchToHttp().getRequest()?.headers?.secretkey as string;

    if (!appKeyHeader) {
      throw new ForbiddenException('Secretkey header is missing');
    }

    if (appKeyHeader !== this.appInternalKey) {
      throw new ForbiddenException('SecretKey header validation failed');
    }

    return true;
  }
}

export const ProtectByAppKey = (appInternalKey: string) => UseGuards(new ProtectByAppKeyGuard(appInternalKey));
