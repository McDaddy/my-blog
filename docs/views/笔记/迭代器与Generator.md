---
title: 【笔记】- 迭代器与Generator详解
date: 2020-05-14
tags:
 - ES6
categories:
 - JavaScript
 - 笔记


---

## 迭代器

### 可迭代协议 与 迭代器协议

为什么要有两个协议?

因为如果只判断对象有没有`next`方法那样的判断太宽松了，很容易误判这是个迭代器，所以加入了可迭代协议，加入`@@iterator`来确保这是一个可迭代的对象

for...of / ... / Array.from 都是使用了迭代器协议，所以才能迭代出内容
[] / Set / Map / generators 都是实现了Iterators

<!-- more -->

```javascript
const array = [1, 2, 3];
// 取出array的迭代器
const iterator = array[Symbol.iterator](); // 注意@@iterator属性是一个方法，执行它之后才能得到真正的迭代器
console.log("iterator", iterator)
for (const item of iterator) {
    console.log("item", item) // 1, 2, 3
}

// 实现一个迭代器对象
// 遵守两点
// 1. 可迭代协议，必须有@@iterator属性，此属性是一个无参的方法，返回一个真的迭代器
// 2. 迭代器协议，要有一个next方法， 调用后返回两个属性{ done: boolean, value: any }
const  obj = {
    count: 0,
    value: [1, 2, 3],
    next: function(v) {  // 注意不能写成箭头函数
        if (this.count === 3) { // 注意终止条件，否则就会无限next
            return {
                done: true,
                value: undefined,
            }
        }
        return {
            done: false,
            value: this.value[this.count++ % 3]
        }
    },
    [Symbol.iterator]: function() { return this }, // 注意不能写成箭头函数
}

for (const item of obj) {
    console.log("item", item) // 1, 2, 3
}
```

## Generator

一个🌰

```typescript
function* sop() {
    console.log('洗澡之前');
    global.a = yield '洗澡';
    console.log('洗完澡了', global.a);
    const b = yield '拍照';
    console.log('拍完了', b);
    const c = yield '发图';
}

let handler = sop(); // 得到gen句柄
// console.log('handler', handler);
const s1 = handler.next();
console.log('global.a', typeof global.a) // undefined
console.log('第一步完成'); // 第一个next之后下一个next之前，打出log
const s2 = handler.next(s1.value); // 
handler.next(s2); // 此时的done依然是false
```

Generator的优点主要是

1. 可以同步化代码的写法
2. 可以在函数外，在函数中的两步之间插入代码，如上面两个next之间插入一条log

注意点：

1. 每次的next执行时，它的执行顺序是**从右到左**，比如上面的例子，第一次`handler.next()`结束时，代码执行完`yield '洗澡'` 但是不会给左边的window.a赋值
2. `next`必须传入上一步完成后得到的值来作为`yield`的返回，单纯的`const a = yield getData()` a是拿不到后面的值的。必须要在外面用上一步`next`得到的value来传入下一个`next`

Generator因为实现了迭代器协议，所以可以被迭代

```javascript
// 还是上面的例子
let handler = sop(); // 得到gen句柄
for (const iterator of handler) {
    console.log('item', iterator);
}
```

