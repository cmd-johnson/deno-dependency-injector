import {
  assert,
  assertEquals,
  assertNotStrictEquals,
  assertStrictEquals,
  assertThrows,
} from "https://deno.land/std@0.71.0/testing/asserts.ts";
import { bootstrap, Bootstrapped, Injectable, Injector } from "./mod.ts";
import type { Constructor } from "./helper_types.ts";

function assertInstanceOf<T>(value: T, type: Constructor<T>) {
  assert(value instanceof type, `${value} is not of type ${type.name}`);
}

@Injectable()
class TestA {
  whoami() {
    return "TestA";
  }
}

@Injectable()
class TestB {
  constructor(public a: TestA) {}

  whoami() {
    return `TestB, depending on (${this.a.whoami()})`;
  }
}

@Injectable()
class TestC {
  constructor(public a: TestA, public b: TestB) {}

  whoami() {
    return `TestC, depending on (${this.a.whoami()}) and (${this.b.whoami()})`;
  }
}

@Bootstrapped()
class Main {
  constructor(public c: TestC) {}
}

@Injectable()
class TestAOverride {
  whoami() {
    return "TestA Override";
  }
}

@Injectable({ isSingleton: false })
class TestAInstancedOverride {
  whoami() {
    return "TestA Instanced Override";
  }
}

@Injectable()
class TestCOverride {
  constructor(public a: TestA, public c: TestC) {}

  whoami() {
    return `TestC Override, depending on (${this.a.whoami()}) and (${this.c.whoami()})`;
  }
}

@Bootstrapped()
class UninjectableMain {
  constructor(public s: string) {}
}

@Injectable()
class UninjectableTest {
  constructor(public n: number) {}
}

@Bootstrapped()
class UninjectableDependency {
  constructor(public u: UninjectableTest) {}
}

@Injectable()
class CycleDummy {}

@Injectable()
class CycleA {
  constructor(dummy: CycleDummy) {}
}

@Injectable()
class CycleB {
  constructor(a: CycleA) {}
}

@Bootstrapped()
class CycleMain {
  constructor(b: CycleB) {}
}

Deno.test("bootstrap(), no overrides", () => {
  const main = bootstrap(Main);
  assertInstanceOf(main.c, TestC);
  assertInstanceOf(main.c.a, TestA);
  assertInstanceOf(main.c.b, TestB);
  assertInstanceOf(main.c.b.a, TestA);
  assertStrictEquals(main.c.a, main.c.b.a);
});

Deno.test("bootstrap(), TestAOverride", () => {
  const overrides = new Map([[TestA, TestAOverride]]);
  const main = bootstrap(Main, overrides);
  assertInstanceOf(main.c, TestC);
  assertInstanceOf(main.c.a, TestAOverride);
  assertInstanceOf(main.c.b, TestB);
  assertInstanceOf(main.c.b.a, TestAOverride);
  assertStrictEquals(main.c.a, main.c.b.a);
});

Deno.test("bootstrap(), TestAInstancedOverride", () => {
  const overrides = new Map([[TestA, TestAInstancedOverride]]);
  const main = bootstrap(Main, overrides);
  assertInstanceOf(main.c, TestC);
  assertInstanceOf(main.c.a, TestAInstancedOverride);
  assertInstanceOf(main.c.b, TestB);
  assertInstanceOf(main.c.b.a, TestAInstancedOverride);
  assertNotStrictEquals(main.c.a, main.c.b.a);
});

Deno.test("bootstrap(), TestCOverride", () => {
  const overrides = new Map([[TestC, TestCOverride]]);
  const main = bootstrap(Main, overrides);
  assertInstanceOf(main.c.a, TestA);
  assertInstanceOf(main.c as unknown, TestCOverride);
  const cO = main.c as unknown as TestCOverride;
  assertInstanceOf(cO.c, TestC);
  assertInstanceOf(cO.c.a, TestA);
  assertInstanceOf(cO.c.b, TestB);
  assertInstanceOf(cO.c.b.a, TestA);
  assertStrictEquals(main.c.a, cO.c.a);
  assertStrictEquals(main.c.a, cO.c.b.a);
});

Deno.test("bootstrap(), TestAOverride and TestCOverride", () => {
  const overrides = new Map<Constructor, Constructor>(
    [[TestA, TestAOverride], [TestC, TestCOverride]],
  );
  const main = bootstrap(Main, overrides);
  assertInstanceOf(main.c.a, TestAOverride);
  assertInstanceOf(main.c as unknown, TestCOverride);
  const cO = main.c as unknown as TestCOverride;
  assertInstanceOf(cO.c, TestC);
  assertInstanceOf(cO.c.b, TestB);
  assertInstanceOf(cO.c.b.a, TestAOverride);
  assertStrictEquals(main.c.a, cO.c.a);
  assertStrictEquals(main.c.a, cO.c.b.a);
});

Deno.test("bootstrap(), TestAInstancedOverride and TestCOverride", () => {
  const overrides = new Map<Constructor, Constructor>(
    [[TestA, TestAInstancedOverride], [TestC, TestCOverride]],
  );
  const main = bootstrap(Main, overrides);
  assertInstanceOf(main.c.a, TestAInstancedOverride);
  assertInstanceOf(main.c as unknown, TestCOverride);
  const cO = main.c as unknown as TestCOverride;
  assertInstanceOf(cO.c, TestC);
  assertInstanceOf(cO.c.b, TestB);
  assertInstanceOf(cO.c.b.a, TestAInstancedOverride);
  assertNotStrictEquals(main.c.a, cO.c.a);
  assertNotStrictEquals(main.c.a, cO.c.b.a);
  assertNotStrictEquals(cO.c.a, cO.c.b.a);
});

Deno.test("bootstrap(), uninjectable main", () => {
  assertThrows(
    () => bootstrap(UninjectableMain),
    TypeError,
    "Type String is not injectable",
  );
});

Deno.test("bootstrap(), uninjectable dependency", () => {
  assertThrows(
    () => bootstrap(UninjectableDependency),
    TypeError,
    "Dependency Number of UninjectableTest is not injectable",
  );
});

Deno.test("bootstrap(), dependency cycle", () => {
  assertThrows(
    () => bootstrap(CycleMain, new Map([[CycleDummy, CycleB]])),
    Error,
    "Dependency cycle detected: Failed to resolve CycleB (-> CycleA), CycleA (-> CycleB)",
  );
});

Deno.test("bootstrap(), class under test", () => {
  const instance = bootstrap(TestB, new Map([[TestA, TestAOverride]]));

  assertEquals(instance.whoami(), "TestB, depending on (TestA Override)");
});

Deno.test("Injector.bootstrap(), sharing dependency instances", () => {
  const injector = new Injector();
  const b = injector.bootstrap(TestB);
  const c = injector.bootstrap(TestC);
  const main = injector.bootstrap(Main);

  assertStrictEquals(b.a, c.a);
  assertStrictEquals(c.b, b);
  assertStrictEquals(main.c, c);
});
