import { setInjectionMetadata } from "./injector.ts";
import type { Constructor } from "./helper_types.ts";

export interface InjectionOptions {
  isSingleton?: boolean;
}

export function Injectable<T>(options: InjectionOptions = {}) {
  return (Type: Constructor<T>): void => {
    setInjectionMetadata(Type, {
      isSingleton: options.isSingleton !== false,
    });
  };
}

export function Bootstrapped<T>() {
  return (_: Constructor<T>): void => {};
}
