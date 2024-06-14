import {
  applyDecorators,
  HttpCode,
  HttpStatus,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ErrorLogInterceptor } from '../../logger/error-log.interceptor';
import { RegisterApiParam } from '../../swagger/register-api-param.decorator';

export const Handle = (route: string) => {
  const decorators: MethodDecorator[] = [
    Post(route),
    HttpCode(HttpStatus.OK),
    UseInterceptors(ErrorLogInterceptor), // this interceptor should always be after PrepareResponseInterceptor
    RegisterApiParam,
  ];

  return applyDecorators(...decorators);
};
