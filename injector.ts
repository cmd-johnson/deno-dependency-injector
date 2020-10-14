import { Reflect } from "https://deno.land/x/reflect_metadata@v0.1.12/mod.ts";
import type { Constructor } from "./helper_types.ts";

export interface InjectionMetadata {
  isSingleton: boolean;
}

export function setInjectionMetadata(
  Type: Constructor,
  metadata: InjectionMetadata,
) {
  Reflect.defineMetadata("di:metadata", metadata, Type);
}

export function bootstrap<T>(
  Type: Constructor<T>,
  overrides = new Map<Constructor, Constructor>(),
): T {
  return new Injector(overrides).bootstrap(Type);
}

export class Injector {
  private resolved = new Map<Constructor, () => unknown>();

  constructor(
    private overrides = new Map<Constructor, Constructor>(),
  ) {}

  public bootstrap<T>(Type: Constructor<T>): T {
    if (this.isInjectable(Type)) {
      this.resolve([Type]);
      return this.resolved.get(Type)!() as T;
    } else {
      const dependencies = this.getDependencies(Type);
      this.resolve(dependencies);

      return new Type(...dependencies.map((Dep) => this.resolved.get(Dep)!()));
    }
  }

  private resolve(Types: Constructor[]): void {
    const unresolved = new Map(
      [...this.discoverDependencies(Types).entries()].filter(([T]) =>
        !this.resolved.has(T)
      ),
    );

    while (unresolved.size > 0) {
      const nextResolvable = [...unresolved.entries()].find(([, meta]) =>
        meta.dependencies.every((dep) => this.resolved.has(dep))
      );
      if (!nextResolvable) {
        const unresolvable = [...unresolved]
          .map(([Type, { dependencies }]) =>
            `${Type.name} (-> ${dependencies.map((D) => D.name).join(",")})`
          )
          .join(", ");
        throw new Error(
          `Dependency cycle detected: Failed to resolve ${unresolvable}`,
        );
      }
      const [Next, meta] = nextResolvable;

      const createInstance = () =>
        new Next(
          ...meta.dependencies.map((Dep) => this.resolved.get(Dep)!()),
        ) as typeof Next;
      if (meta.isSingleton) {
        const instance = createInstance();
        this.resolved.set(Next, () => instance);
      } else {
        this.resolved.set(Next, createInstance);
      }
      unresolved.delete(Next);
    }
  }

  private getInjectionMetadata(Type: Constructor): InjectionMetadata {
    const metadata: InjectionMetadata | undefined = Reflect.getOwnMetadata(
      "di:metadata",
      Type,
    );
    if (!metadata) {
      throw new TypeError(`Type ${Type.name} is not injectable`);
    }
    return metadata;
  }

  private isInjectable(Type: Constructor): boolean {
    return typeof Reflect.getOwnMetadata("di:metadata", Type) === "object";
  }

  private getDependencies(Type: Constructor): Constructor[] {
    const dependencies: Constructor[] =
      Reflect.getOwnMetadata("design:paramtypes", Type) || [];

    return dependencies.map((Dep) => {
      if (this.overrides.has(Dep) && this.overrides.get(Dep) !== Type) {
        return this.overrides.get(Dep)!;
      } else {
        return Dep;
      }
    });
  }

  private discoverDependencies(
    Types: Constructor[],
  ): Map<Constructor, InjectionMetadata & { dependencies: Constructor[] }> {
    const discovered = new Map<
      Constructor,
      InjectionMetadata & { dependencies: Constructor[] }
    >();
    const undiscovered = new Set(Types);

    while (undiscovered.size > 0) {
      const Next = [...undiscovered.keys()][0];
      const dependencies = this.getDependencies(Next);
      const metadata = this.getInjectionMetadata(Next);

      dependencies.filter((Dep) => !discovered.has(Dep)).forEach((Dep) => {
        if (!this.isInjectable(Dep)) {
          throw new TypeError(
            `Dependency ${Dep.name} of ${Next.name} is not Injectable`,
          );
        }
        undiscovered.add(Dep);
      });

      undiscovered.delete(Next);
      discovered.set(Next, {
        ...metadata,
        dependencies,
      });
    }

    return discovered;
  }
}
