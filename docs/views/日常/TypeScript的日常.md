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



