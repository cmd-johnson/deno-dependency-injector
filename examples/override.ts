import { bootstrap, Bootstrapped, Injectable } from "../mod.ts";

@Injectable()
class Counter {
  protected count = 0;

  public increment(): void {
    this.count++;
  }

  public getCount(): number {
    return this.count;
  }
}

@Injectable()
class CounterOverride extends Counter {
  public getCount(): number {
    return 42;
  }
}

@Bootstrapped()
class Main {
  constructor(public counter: Counter) {}
}

const main = bootstrap(Main, new Map([[Counter, CounterOverride]]));
console.log(main.counter.getCount()); // "42"
main.counter.increment();
console.log(main.counter.getCount()); // "42"
