# Deno Dependency Injector
Simple dependency injection for Deno TypeScript projects.

This module's aims to provide you with an extremely simple API, without any bells and whistles and the 100% test coverage that comes with such a minimal feature set.

As such, this module allows you to
- inject classes into other classes through their constructor
- inject classes as singletons *or* inject a new instance of the class every time it is used
- override/replace certain injected classes (e.g. for replacing them with a mock for testing purposes)

That's it.

Need to inject a plain string? Wrap it in a class!
Need to inject a function? Wrap it in a class!

There's no need to make things more complicated than necessary.

## Usage
### 1. Create `@Injectable()` classes
```ts
// class_a.ts
import { Injectable } from "https://deno.land/x/inject/mod.ts";

@Injectable()
export class ClassA {
  hello() {
    return "Hello from ClassA!";
  }
}
```

### 2. Inject Injectable classes through constructors
```ts
// class_b.ts
import { Injectable } from "https://deno.land/x/inject/mod.ts";
import { ClassA } from "./class_a.ts";

@Injectable()
export class ClassB {
  constructor(
    private readonly classA: ClassA,
  ) {}

  hello() {
    return `Hello from ClassB and ${this.classA.hello()}!`;
  }
}
```

### 3. Create a Bootstrapped class and let the injector take care of creation
```ts
// main.ts
import { Bootstrapped, bootstrap } from "https://deno.land/x/inject/mod.ts";
import { ClassB } from "./class_b.ts";

@Bootstrapped()
export class Main {
  constructor(
    private readonly classB: ClassB,
  ) {}

  hello() {
    return this.classB.hello();
  }
}

const injector = bootstrap(Main);

console.log(main.hello());
```

### 4. Run your App!
```sh
deno run -c tsconfig.json main.ts
# Hello from ClassB and Hello from ClassA!!
```

Remember to have a `tsconfig.json` with the following content in your project's root directory and always call `deno run` with the additional `-c tsconfig.json` parameter or Deno will complain about missing experimental support for decorators.

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Overriding dependencies
During testing, it may be useful to override certain dependencies of the class under test with mocks.
This module allows you to do just that:

```ts
import { Injectable, Bootstrappable, bootstrap } from "https://deno.land/x/inject/mod.ts";
import { assertEquals } from "https://deno.land/std/test/mod.ts";

@Injectable()
class Dependency {
  value = "Original dependency";
}

@Injectable()
class ClassUnderTest {
  constructor(public dependency: Dependency) {}

  getValue() {
    return this.dependency.value;
  }
}

@Injectable()
class OverrideDependency {
  constructor(public original: Dependency) {}

  value = "Override dependency";
}

Deno.test("ClassUnderTest dependency is overridden", () => {
  const instance = bootstrap(ClassUnderTest, new Map([[Dependency, OverrideDependency]]));

  assertEquals(instance.getValue(), "Override dependency");
  assertEquals((instance.dependency as unknown as OverrideDependency).original.value, "Original dependency");
});
```

Note that when overriding class `A` with class `B`, an instance of `A` can still be injected into `B`, but all other classes depending on `A` will get an instance of `B` instead.

## API
### `@Injectable(options?: { isSingleton: boolean })`
Decorator used to mark a class as injectable.
You can only inject classes that are declared with the `@Injectable()` decorator.

You can pass an optional options parameter to the `@Injectable()` decorator:
- **`isSingleton`** (default: `true`): wether the class should be injected as a singleton or if a new instance should be created for every class that injects this type.

    > Checkout `examples/instanced_counter.ts` and `examples/singleton_counter.ts` for example usages of the `isSingleton` property.

### `@Bootstrapped()`
Decorator used to make a class bootstrappable.

Doesn't do anything else but making the class known to the TypeScript's reflection system, which is required for the dependency injector to know the types you want to inject.

You can also bootstrap classes that are otherwise known to the reflection system, e.g. because they are `@Injectable` or bear any other decorator, but it is recommended to stick to using the `@Bootstrapped` decorator for consistency and making it easier to find your application's main entry point(s).

During testing, it is perfectly fine to bootstrap `@Injectable` classes, of course.

### `bootstrap<T>(Type: Constructor<T>, overrides?: Map<Constructor, Constructor>): T`
The one function call to rule them all.

Automatically creates an instance of the class you pass it, as long as all dependencies in the constructor (and their dependency's constructors) are `@Injectable`.

Optionally takes a `Map` that you can use to override certain injected classes with some other `@Injectable` class, for example to mock dependencies during testing.

This function is shorthand for `new Injector(overrides).bootstrap(Type)`.

Use the `Injector` class if you want to bootstrap more than one class using the same resolved dependencies and overrides.

### `Injector`
The actual class responsible for discovering and creating all `@Injectable` classes required by your `@Bootstrapped` class.

#### `new Injector(overrides?: Map<Constructor, Constructor>)`
Creates a new `Injector` class with the optionally specified overrides for dependency resolution (see `bootstrap(Type, overrides?)` for more information).

#### `bootstrap<T>(Type: Constructor<T>): T`
Resolves the dependency tree of the given class and creates instances of all required dependencies, taking into account the overrides passed during creation of the `Injector`.
