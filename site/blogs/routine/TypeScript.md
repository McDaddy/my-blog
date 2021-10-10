---
title: TypeScript Q & A
date: 2020-08-28
tags:
 - TypeScript
categories:
 - JavaScript

---

日常解答和记录自己在TypeScript上的疑问

<!-- more -->

## interface和type到底有什么区别？

1. 语法不同
2. type可以支持原生类型，组合与元组，而interface不能

```typescript
// primitive
type Name = string;

// union
type PartialPoint = PartialPointX | PartialPointY;

// tuple
type Data = [number, string];
```

  3 . 都可以继承（type其实是组合），但语法不同。 可以互相混着继承，注意interface是可以多重集成的

```typescript
interface PartialPointX { x: number; }
interface Point extends PartialPointX { y: number; }

type PartialPointX = { x: number; };
type Point = PartialPointX & { y: number; };

type PartialPointX = { x: number; };
interface Point extends PartialPointX { y: number; }

interface PartialPointX { x: number; }
type Point = PartialPointX & { y: number; };
```

4. class一定可以继承interface但不一定能继承type，原因跟第二点一样，class不能继承`type xx = string`
5. interface可以重复定义，然后自动merge，这一点的实际意义，比如要在Window这个内置类型上添加属性，直接定义一个同名的interface，然后写自己的属性，最后两者会自动合并，不会起冲突

```typescript
// These two declarations become:
// interface Point { x: number; y: number; }
interface Point { x: number; }
interface Point { y: number; }

const point: Point = { x: 1, y: 2 };
```



## 如何避免重复定义？

比如说下面的情况， 两个类型只差一个属性

```typescript
interface Person {
  firstName: string;
  lastName: string;
}

interface PersonWithBirthDate {
  firstName: string;
  lastName: string;
  birth: Date;
}
```

1. 可以使用extends

```typescript
interface PersonWithBirthDate extends Person { 
  birth: Date; 
}
```

2. type的话可以用& `type PersonWithBirthDate = Person & { birth: Date };`

相反的例子，假设先有了PersonWithBirthDate， 这时候要定义一个只少一个属性的Person怎么办？

1. 用`[k in ‘xxx’]`的语法

```
type Person = {
	[k in 'firstName' | 'lastName']: PersonWithBirthDate[k];
}
```

这样两个类型就链接在一起了，父类型变子类型也相应会变

2. 利用工具类型`Pick`， `type Person = Pick<PersonWithBirthDate, ‘firstName’ | ‘lastName’>;`
3. 利用工具类型`Omit`，`type Person = Omit<PersonWithBirthDate, ‘birth’>;`



## 如何得到一个对象的key集合类型?

使用`keyof typeof`

```typescript
const obj = {
  a: 1,
  b: '2',
  c: true,
};

type K = keyof typeof obj;

Object.keys(obj).forEach((key) => {
  const k = key as K;
  const v = obj[k];
  console.log('v', v);
});
```

## 枚举和常量枚举，有什么区别？

区别就是带上了const 那么在编译过后就会被移除， 而不带const就不会

```typescript
enum Work {
    A = 'A',
    B = "b",
}

const obj = Work.A
console.log(obj);

// 编译结果
"use strict";
var Work;
(function (Work) {
    Work["A"] = "A";
    Work["B"] = "b";
})(Work || (Work = {}));
const obj = Work.A;
console.log(obj);

///
const enum Work {
    A = 'A',
    B = "b",
}

const obj = Work.A
console.log(obj);

// 编译结果
"use strict";
const obj = "A" /* A */;
console.log(obj);
```

## never类型到底是干嘛的？

never类型是一种**底座类型**。底座类型是任何类型的子类型（但所有类型的子类型不一定都是never）

```typescript
// 什么是底部类型， never可以赋值给任何类型， 任何类型不能赋给never， 类似Java， Object和具体类的关系
let a: never;

a = 1; // 编译报错 Type '1' is not assignable to type 'never'.

let b: number = 0;
b = a;  // OK 
let c: object;
c = a;  // OK
```

一般用于两种情况，1. 永远不会返回的情况，比如while(true)， 2. 会抛出异常的情况

和void的区别，void是函数没有显示返回时默认返回undefined。而never是永远不返回了或者会因为抛错而异常退出

```typescript
function fn(): never {
	while(true) {
    
  }
}

function fn(): never {
	throw new Error('');
}
```

因为never是底部类型，是任何类型的子类型，所以当它和任何类型做& 那么得到的都是never

```typescript
type T1 = number & never // never
// T1表示，同时既可以赋值为number也可以赋值为never，因为never为底部类型，所以能赋给never就没法赋值给别的类型了
type T2 = number & string // never
// 同理一个类型不能同时赋给number和string， 所以就变成了never

type T2 = number | never // number
// T2表示， number和never的联合，表示类型二选一，能赋值给number那肯定也能赋值给never， 所以结果就是number
```

## 如何通过实际值动态判断类型？

可以通过`x is T`的语法， 通过这个判断可以动态决定那些非原生类型

```typescript
  interface A {
    leg: number;
    fly: string;
  }
  interface B {
    leg: number;
    run: string;
  }

  const isA = (x: A | B): x is A => {
    return x.leg === 2;
  };

  const test = (input: A | B) => {
    if (isA(input)) {
      console.log('test -> input', input.fly);
    } else {
      console.log('test -> input.ss', input.run);
    }
  };
```

## TS的符号集合

### ! 非空断言操作符

放在变量的尾巴上代表断言这个变量不为空

```javascript
let a: string | null | undefined
let b = a! // string 忽略null和undefined
a!.toString() // OK

// 确定赋值断言
let x!: number; 
initialize();
console.log(2 * x); // Ok 按理说这里如果没有赋值断言，就会报 Variable 'x' is used before being assigned.(2454)

function initialize() {
  x = 10;
}
```

### ?. 运算符

`Optional Chain`，?.前面的部分如果为空就不执行后面的，直接返回undefined

注意：Optional Chain并不是ts的特性而是ES2020的特性，ts是超集所以支持

```javascript
const val = a?.b;
// 编译的结果
var val = a === null || a === void 0 ? void 0 : a.b;

let result = obj.customMethod?.();
// 编译的结果
var result = (_a = obj.customMethod) === null
  || _a === void 0 ? void 0 : _a.call(obj);

// a?.b vs a ? a.b : undefined的区别
// 后者当a是0 NaN 空字符串 false等falsy的情况下都会返回undefined， 而?.只关心null和undefined
```

### ?? 空值合并运算符

当左侧操作数为 null 或 undefined 时，其返回右侧的操作数，否则返回左侧的操作数。 同理左边只关心null和undefined。同时不能和&&和||混合使用

```javascript
const foo = null ?? 'default string';
console.log(foo); // 输出："default string"

const baz = 0 ?? 42;
console.log(baz); // 输出：0
```

### & 运算符

所有基础类型的合并结果都是never，除此之外才能合并

### | 分隔符

与&是相反的，联合类型就是或的关系。用于限制类型的范围

## 如何实现ts函数的重载

使用以下的固定格式，前面的函数**只写定义不写实现**，用出入参数类型来做区分，中间不能插入任何别的东西。

最后写函数的实现，需要去判断下参数的类型，然后分别做处理。 实际编译出来只保留最后函数的实现

```javascript
function toArray(value: number): number[]
function toArray(value: string): string[]
function toArray(value: number | string) {
    if (typeof value == 'string') {
        return value.split('');
    } else {
        return value.toString().split('').map(item => Number(item));
    }
}
console.log(toArray(123)); // 根据传入不同类型的数据 返回不同的结果
toArray('123');
```



## HTML Event Types

全都从`React`引入

- MouseEvent
- ChangeEvent
- DragEvent
- FocusEvent
- KeyboardEvent
- FormEvent
- TouchEvent
- CompositionEvent
- ClipboardEvent
- AnimationEvent
- TransitionEvent
- WheelEvent
- PointerEvent



### 条件范型

假设要写一个`promisify`的函数

```javascript
function promisify<T> (input: T) {
  if (input instanceof Promise) {
    return input;
  }
  return Promise.resolve(input);
}

const a = promisify(1); // a: (1 & Promise<any>) | Promise<1>
```

得到的返回类型不是预期的，会自动判断传入的类型，如果是Promise就直接返回本身，不是则包装一层（`Promise<1>`）

此时就需要ts给我们动态去判断类型，需要用到`条件泛型`

`T extends U ? A : B` 的结构判断一个类型 `T` 是否是类型 `U` 的子类型，是则返回 `A`，不是返回 `B`

如：

```javascript
type Condition<T> = T extends { name: string } ? string : number;

type Test1 = Condition<{ name: string; value: number }>; // string
type Test2 = Condition<{ value: number }>; // number;
```

此时改造下promisify的定义，就可以得到预期的类型

```javascript
function promisify<T> (input: T): T extends Promise ? T : Promise<T> {
  // 函数的具体实现
}

const a = promisify(1); // a: Promise<number>
```



### infer

定义一个类型，接受一个T泛型，如果T本身是一个Promise，那么取Promise包装的内部类型，否则取T本身

```javascript
type Unpromise<T> = T extends Promise<infer U> ? U : T;
```

一般配合`extends`使用，同理可以得到

```javascript
// 提取数组项的类型
type Unarray<T> = T extends (infer U)[] ? U : never;

// 提取函数的返回值类型（TS 已内置）
type ReturnType<T> = T extends ((...params: any[]) => infer U) ? U : never;

// 提取函数的入参类型（TS 已内置）
type Parameters<T> = T extends ((...params: P) => infer P) ? P : never;

// 元组第一项的类型，可用在 Hooks 风格的 React 组件中
type Head<T> = T extends [infer H, ...any[]] ? H : never;
```



[TypeScript 夜点心：条件范型](https://zhuanlan.zhihu.com/p/110377116)



```javascript
  type myType = (s: string | number) => void;
  const myFunc = (key: string) => {};
  const foo = (func: myType) => {};
  foo(myFunc);
```

### extends的特性

`extends`（非interface A extends B， 这里特指条件类型） 当前面的参数为联合类型时则会分解（依次遍历所有的子类型进行条件判断）联合类型进行判断。然后将最终的结果组成新的联合类型。

```javascript
// 如 结果为type A3 = 1 | 2
// 原因是extends是将T的所有可能子类型都跟'x' 判断一遍，第一个x成功了。第二个y失败了
type P<T> = T extends 'x' ? 1 : 2;
type A3 = P<'x' | 'y'>

// 规避的方法是，用一个中括号括起来
type P<T> = [T] extends ['x'] ? 1 : 2;
/**
 * type A4 = 2;
 */
type A4 = P<'x' | 'y'>
  
// 1 extents A 能不能成立，取决于1能不能赋值给A
// 即 const x:A = 1 能不能成立， 如果能成立就符合extends
type A = 1 | 2;
type B = 3 extends A ? '1' : '2'; // 2
type B = 1 extends A ? '1' : '2'; // 1
```

### 可赋值性/协变/逆变/双向协变

```javascript
// 可赋值性 B继承于A, B类型可以赋值给A类型，反之不能
interface A { name: string }
interface B extends A { age: number }

let a: A;
let b: B;

a = b; // OK 因为A是父，约束更宽泛，具体的可以赋值给宽泛的，即将多的属性赋给A并不影响A的定义和使用，只要保证有name属性那就是A
b = a; // error 因为A是父，A可能没有B中有的属性，所以是不能赋给B

// 协变
let aArr: A[];
let bArr: B[];

aArr = bArr; // OK 原先的类型通过了一层Array的泛型包装后，依然保持着可赋值性，原因和上面相同
bArr = aArr; // error 

// 逆变 和协变相反，都是经过一层构造关系的转换后，继承关系反转了
let aFunc: (x: A) => void;
let bFunc: (x: B) => void;

aFunc = bFunc; // error  假设bFunc中用到了age, 然后可以正确赋值给aFunc, 此时调用时传入{ name: '1' },是不会报错的，但实际执行的时候就会报错，所以是不安全的
bFunc = aFunc; // OK 相反因为b是更具体的，虽然aFunc不会用到age这个参数，但是如果入参多传一个age也不会对结果产生影响，所以是安全的

// 双向协变 事实上我们实际开发中遇到的都是双向协变，因为这是ts的默认策略，典型的就是Event的实现
// 虽然我们传入的是更具体的MouseEvent，就等于上例中把bFunc赋值给aFunc，但这里并不会报错，反而这是一种设计模式的实现
// tsconfig.js中可以调整strictFunctionType来严格控制协变逆变
// lib.dom.d.ts中EventListener的接口定义
interface EventListener {
  (evt: Event): void;
}
// 简化后的Event
interface Event {
  readonly target: EventTarget | null;
  preventDefault(): void;
}
// 简化合并后的MouseEvent
interface MouseEvent extends Event {
  readonly x: number;
  readonly y: number;
}

// 简化后的Window接口
interface Window {
  // 简化后的addEventListener
  addEventListener(type: string, listener: EventListener)
}

// 日常使用
window.addEventListener('click', (e: Event) => {});
window.addEventListener('mouseover', (e: MouseEvent) => {});

```



### 谓词

```javascript
// 刚碰到一个ts的问题，想当然觉得原生filter是可以自动判断类型的
const a = [999, undefined];
// 此时虽然filter显式得过滤了undefined，但是b的ts类型还是number | undefined []
let b = a.filter((item) => !!item);
// 加上 is 谓词之后才能正常收窄到number
let b = a.filter((item): item is number => !!item);
// 原理就是filter只关心你传进去的函数返回true/false，在大多数情况下它没法自动推断到底过滤的是内容还是类型，所以不会自动改类型
```





### class type

有时候会纠结一个class到底是一个type还是它自己本身， 总结一下

- 当修饰class实例的时候，就是用这个Class本身，他包含所有实例方法和原型方法
- 当修饰类型本身时，要用typeof Class，这里就包含类的静态方法和属性等

```javascript
/**
 * 定义一个类
 */
class People {
  name: number;
  age: number;
  constructor() {}
}

// p1可以正常赋值
const p1: People = new People();
// 等号后面的People报错，类型“typeof People”缺少类型“People”中的以下属性: name, age
const p2: People = People;

// p3报错，类型 "People" 中缺少属性 "prototype"，但类型 "typeof People" 中需要该属性
const p3: typeof People = new People();
// p4可以正常赋值
const p4: typeof People = People;

```



### as in type定义

如何实现一个条件Pick， 如： 只Pick出类型中类型为string的属性

```javascript
interface Example {
  a: string;
  b: string | number;
  c: () => void;
  d: {};
}

type ConditionalPick<T, K> = {
  [P in keyof T as (T[P] extends K ? P : never)]: T[P]
}

// 测试用例：
type StringKeysOnly = ConditionalPick<Example, string>;
//=> {a: string}
```

其中在定义中用到了as，非常神奇。 说明as不仅可以用在强转变量的类型，还能强转泛型T的类型



### 如何在vscode调试ts

```json
{
  // Use IntelliSense to learn about possible attributes.
  // Hover to view descriptions of existing attributes.
  // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Current TS File", // 直接debug当前文件
      "type": "node",
      "request": "launch",
      "args": ["${relativeFile}"], // 就是当前编辑器上的ts文件
      "runtimeArgs": ["--nolazy", "-r", "ts-node/register", "-r", "tsconfig-paths/register"], // tsconfig-paths/register 用来指定tsconfig地址，配合下面env
      "env": {
        "TS_NODE_PROJECT": "${workspaceRoot}/tools/tsconfig.json", // 指定tsconfig地址
        "TS_NODE_TRANSPILE_ONLY": "true" // transpile only
      },
      "sourceMaps": true,
      "cwd": "${workspaceRoot}", // root 地址取决于这个launch.json建在哪里
      "protocol": "inspector",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

