import reactive from "./reactive";
class Class1 {
  a: number;
  b: string;
  c: string;

  constructor() {
    this.a = 12;
    this.b = "str prop";
    this.c = "aaa";
  }

  get doubleA() {
    return this.a * 2;
  }

  get tripleA() {
    return this.a * 3;
  }

  methodC() {
    return this.b.toUpperCase();
  }

  set doubleA(value) {
    this.a = value / 2;
  }

  get longRunningOp() {
    const longRunningSum = new Array(20000000)
      .fill(Math.random())
      .reduce((prev, curr) => prev + curr, 0);
    console.log(`test ${this.b}`);
    return longRunningSum + this.doubleA;
  }
}

const obs1 = reactive(new Class1());

console.log(obs1.tripleA);
console.log(obs1.doubleA);
console.log(obs1.doubleA);
obs1.doubleA = 12;
console.log(obs1.doubleA);

/*
const startT = Date.now();
console.log("start ", startT);
console.log(obs1.longRunningOp);
console.log("end ", Date.now() - startT);

console.log(obs1.longRunningOp);

console.log("change value that doesn't affect cache");
obs1.c = "bbbb";
console.log(obs1.longRunningOp);

console.log("reset cache with val change");
obs1.b = "bbbb";
console.log(obs1.longRunningOp);
*/

class Class2 extends Class1 {
  xx: string;

  constructor() {
    super();
    this.xx = "cc2";
  }

  get upperXX() {
    return this.xx.toUpperCase() + this.b;
  }
}

const obs2 = reactive(new Class2());
//console.log(obs2);
//console.log(obs2.doubleA);
