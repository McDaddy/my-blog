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

  3 . 都可以继承，但语法不同。 可以互相混着继承

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

