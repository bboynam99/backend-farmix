
const DEPENDENT_META_KEY = Symbol('DEPENDS_ON_META');

export const DependsOn = (...args: any[]): ClassDecorator => {
  return (target) => {
    for (const cl of args) {
      if (Reflect.hasMetadata(DEPENDENT_META_KEY, cl)) {
        Reflect.getMetadata(DEPENDENT_META_KEY, cl).push(target);
      } else {
        Reflect.defineMetadata(DEPENDENT_META_KEY, [target], cl);
      }
    }
  };
};

export const getDependent = (cl: Function): any[] => {
  const dependent = Reflect.getMetadata(DEPENDENT_META_KEY, cl);

  return dependent || [];
};