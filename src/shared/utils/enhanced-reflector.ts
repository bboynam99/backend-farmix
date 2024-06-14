import { ExecutionContext } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';

/**
 * Created to simplify process of retrieving route path
 */
export class EnhancedReflector extends Reflector {
  private fullRoutesCache = new Map<Function, string>();

  getFullRoute(ctx: ExecutionContext): string {
    const handler = ctx.getHandler();
    const controller = ctx.getClass();

    const cachedRoute = this.fullRoutesCache.get(handler);

    if (cachedRoute) {
      return cachedRoute;
    }

    const prefix = this.get<string | string[]>(PATH_METADATA, controller);
    const route = this.get<string | string[]>(PATH_METADATA, handler);

    const normalizedPrefix = this.serializeAndNormalizeRoute(prefix);
    const normalizedRoute = this.serializeAndNormalizeRoute(route);

    const path = `${normalizedPrefix}${normalizedRoute}`.replaceAll('//', '/');

    this.fullRoutesCache.set(handler, path);

    return path;
  }

  private serializeAndNormalizeRoute(route: string | string[]): string {
    const serialized = typeof route === 'string' ? route : JSON.stringify(route);

    return serialized.startsWith('/') ? serialized : `/${serialized}`;
  }
}
