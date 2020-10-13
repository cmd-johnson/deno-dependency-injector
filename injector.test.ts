// deno-lint-ignore-file no-explicit-any

import { assert, assertEquals, assertNotEquals, assertNotStrictEquals, assertStrictEquals } from "https://deno.land/std@0.71.0/testing/asserts.ts";
import { Injectable, Bootstrapped, Injector } from "./mod.ts";
import type { Constructor } from "./helper_types.ts";

function assertInstanceOf<T>(value: T, type: Constructor<T>) {
  assert(value instanceof type, `${value} is not of type ${type.name}`);
}

interface Testable {
  whoami(): string;
}

@Injectable()
class TestA implements Testable {
  constructor() {}

  whoami() {
    return "TestA";
  }
}

@Injectable()
class TestB implements Testable {
  constructor(
    public a: TestA,
  ) {}

  whoami() {
    return `TestB, depending on (${this.a.whoami()})`;
  }
}

@Injectable()
class TestC implements Testable {
  constructor(
    public a: TestA,
    public b: TestB,
  ) {}

  whoami() {
    return `TestC, depending on (${this.a.whoami()}) and (${this.b.whoami()})`;
  }
}

@Bootstrapped()
class Main {
  constructor(
    public c: TestC,
  ) {}
}

@Injectable()
class TestAOverride implements Testable {
  whoami() {
    return "TestA Override";
  }
}

@Injectable({ isSingleton: false })
class TestAInstancedOverride implements Testable {
  whoami() {
    return "TestA Instanced Override";
  }
}

@Injectable()
class TestCOverride implements Testable {
  constructor(
    public a: TestA,
    public c: TestC,
  ) {}

  whoami() {
    return `TestC Override, depending on (${this.a.whoami()}) and (${this.c.whoami()})`;
  }
}

Deno.test("Injector.bootstrap()", () => {
  // Test 1, no overrides
  {
    const main = new Injector().bootstrap(Main);
    assertInstanceOf(main.c, TestC);
    assertInstanceOf(main.c.a, TestA);
    assertInstanceOf(main.c.b, TestB);
    assertInstanceOf(main.c.b.a, TestA);
    assertStrictEquals(main.c.a, main.c.b.a);
  }
  // Test 2a, TestAOverride
  {
    const main = new Injector(new Map([
      [TestA, TestAOverride],
    ])).bootstrap(Main);
    assertInstanceOf(main.c, TestC);
    assertInstanceOf(main.c.a, TestAOverride);
    assertInstanceOf(main.c.b, TestB);
    assertInstanceOf(main.c.b.a, TestAOverride);
    assertStrictEquals(main.c.a, main.c.b.a);
  }
  // Test 2b, TestAInstancedOverride
  {
    const main = new Injector(new Map([
      [TestA, TestAInstancedOverride],
    ])).bootstrap(Main);
    assertInstanceOf(main.c, TestC);
    assertInstanceOf(main.c.a, TestAInstancedOverride);
    assertInstanceOf(main.c.b, TestB);
    assertInstanceOf(main.c.b.a, TestAInstancedOverride);
    assertNotStrictEquals(main.c.a, main.c.b.a);
  }
  // Test 3, TestCOverride
  {
    const main = new Injector(new Map([
      [TestC, TestCOverride],
    ])).bootstrap(Main);
    assertInstanceOf(main.c.a, TestA);
    assertInstanceOf(main.c as any, TestCOverride);
    const cO = main.c as any as TestCOverride;
    assertInstanceOf(cO.c, TestC);
    assertInstanceOf(cO.c.a, TestA);
    assertInstanceOf(cO.c.b, TestB);
    assertInstanceOf(cO.c.b.a, TestA);
    assertStrictEquals(main.c.a, cO.c.a);
    assertStrictEquals(main.c.a, cO.c.b.a);
  }
  // Test 4a, TestAOverride and TestCOverride
  {
    const main = new Injector(new Map<Constructor, Constructor>([
      [TestA, TestAOverride],
      [TestC, TestCOverride],
    ])).bootstrap(Main);
    assertInstanceOf(main.c.a, TestAOverride);
    assertInstanceOf(main.c as any, TestCOverride);
    const cO = main.c as any as TestCOverride;
    assertInstanceOf(cO.c, TestC);
    assertInstanceOf(cO.c.b, TestB);
    assertInstanceOf(cO.c.b.a, TestAOverride);
    assertStrictEquals(main.c.a, cO.c.a);
    assertStrictEquals(main.c.a, cO.c.b.a);
  }
  // Test 4b, TestAInstancedOverride and TestCOverride
  {
    const main = new Injector(new Map<Constructor, Constructor>([
      [TestA, TestAInstancedOverride],
      [TestC, TestCOverride],
    ])).bootstrap(Main);
    assertInstanceOf(main.c.a, TestAInstancedOverride);
    assertInstanceOf(main.c as any, TestCOverride);
    const cO = main.c as any as TestCOverride;
    assertInstanceOf(cO.c, TestC);
    assertInstanceOf(cO.c.b, TestB);
    assertInstanceOf(cO.c.b.a, TestAInstancedOverride);
    assertNotStrictEquals(main.c.a, cO.c.a);
    assertNotStrictEquals(main.c.a, cO.c.b.a);
    assertNotStrictEquals(cO.c.a, cO.c.b.a);
  }
});
