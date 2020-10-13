# Deno Injector
Simple dependency injection for TypeScript projects.

## Usage
### 1. Create `@Injectable()` classes
```ts
// class_a.ts
import { Injectable } from "https://deno.land/x/deno_injection/mod.ts";

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
import { Injectable } from "https://deno.land/x/deno_injection/mod.ts";
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

### 3. Create a Bootstrappable class
```ts
// main.ts
import { Bootstrapped } from "https://deno.land/x/deno_injection/mod.ts";
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
```

### 4. Bootstrap your Bootstrappable class
```ts
// mod.ts
import { Injector } from "https://deno.land/x/deno_injection/mod.ts";
import { Main } from "./main.ts";

const injector = new Injector();
const main = injector.bootstrap(Main);
console.log(main.hello()); // "Hello from ClassB and Hello from ClassA!!"
```

### 5. Create a tsconfig.json file
For the dependency injector to be able to extract type information from class constructors, it makes use of experimental and possibly unstable TypeScript features.

To be able to use this library, create a file called `tsconfig.json` in your project's root directory with the following content:
```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### 6. Run your App!
Remember to always call `deno run` with the additional `--config=./tsconfig.json` or Deno will complain about missing experimental support for decorators:

```sh
deno run --config=tsconfig.json mod.ts
```

## API
### `@Injectable(options?: { isSingleton: boolean })`
Decorator used to mark a class as injectable.
You can only inject classes that are declared with the `@Injectable()` decorator.

You can pass an optional options parameter to the `@Injectable()` decorator:
- **`isSingleton`** (default: `true`): wether the class should be injected as a singleton or if a new instance should be created for every class that injects this type.

    > Checkout `examples/instanced_counter.ts` and `examples/singleton_counter.ts` for example usages of the `isSingleton` property.
