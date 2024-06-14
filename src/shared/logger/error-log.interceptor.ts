import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { catchError, throwError } from 'rxjs';

export class ErrorLogInterceptor implements NestInterceptor {
  public readonly logger = new Logger(ErrorLogInterceptor.name);

  intercept(_: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      catchError((err) => {
        this.logError(err);

        return throwError(() => err);
      }),
    );
  }

  /* PRIVATE SECTION */

  private logError(err: any) {
    if (err instanceof HttpException) {
      this.logHttpException(err);

      return;
    }

    this.logger.error(err);
  }

  private logHttpException(err: HttpException) {
    if (err.getStatus() >= 500) {
      this.logger.error(err);

      return;
    }

    this.logger.debug(err);
  }
}
