import { Type } from '@nestjs/common';
import { PARAMTYPES_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { ParamMetadata } from '@nestjs/core/helpers/interfaces';
import { createParamDecorator } from '@nestjs/swagger/dist/decorators/helpers';
import { ParamsWithType } from '@nestjs/swagger/dist/services/parameter-metadata-accessor';
import { reverseObjectKeys } from '@nestjs/swagger/dist/utils/reverse-object-keys.util';
import { mapValues } from 'remeda';

export const exploreParamMetadata = (
  instance: object,
  prototype: Type<unknown>,
  method: Function,
): ParamsWithType | undefined => {
  const types: Type<unknown>[] = Reflect.getMetadata(
    PARAMTYPES_METADATA,
    instance,
    method.name,
  );

  const routeArgsMetadata: ParamMetadata = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    instance.constructor,
    method.name) || {};

  const parametersWithType: ParamsWithType = mapValues(
    reverseObjectKeys(routeArgsMetadata),
    (param: ParamMetadata) => ({
      type: types[param.index],
      name: param.data,
      required: true as true,
      in: 'body' as 'body',
    }),
  );

  return Object.keys(parametersWithType).length !== 0 ? parametersWithType : undefined;
};

export const RegisterApiParam: MethodDecorator = (target: object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>) => {
  const prototype = Object.getPrototypeOf(target);

  const parametersWithType = exploreParamMetadata(target, prototype, descriptor.value as Function);

  if (!parametersWithType) {
    return;
  }

  for (const param of Object.values(parametersWithType)) {
    createParamDecorator(param, { type: String, required: true })(target, propertyKey, descriptor);
  }
};
