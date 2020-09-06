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
5. interface可以重复定义，然后自动merge

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



## 如何得到一个对象的key集合类型

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
const enum Work {
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

