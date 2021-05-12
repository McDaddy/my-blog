---
title: 【笔记】- async/await 详解
date: 2020-05-13
tags:
 - ES6
categories:
 - JavaScript
 - 笔记

---

## Babel是如何实现async/await的

通过Babel官方的在线转义得到编译后的代码

```javascript
async function t() {
    const x = await getResult();
  	const y = await getResult2();
  	return x + y;
}
```

<!-- more -->

```javascript
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
  try {
    var info = gen[key](arg);
    var value = info.value;
  } catch (error) {
    reject(error);
    return;
  }
  if (info.done) {
    // 如果generator完成， 直接完成
    resolve(value);
  } else {
    // 否则，如果value是普通值，那么执行下个_next, 如果是个promise，可以通过then来自行判断进入next还是throw
    Promise.resolve(value).then(_next, _throw);
  }
}

// 接收一个generator函数fn
function _asyncToGenerator(fn) {
  return function() {
    var self = this,
      args = arguments;
    // return 一个Promise符合async函数的返回，可以后续then
    return new Promise(function(resolve, reject) {
      // 得到一个generator
      var gen = fn.apply(self, args);
      // 定义一个_next,标示类型
      function _next(value) {
        // 递归
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
      }
      function _throw(err) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
      }
      _next(undefined);
    });
  };
}

function t() {
  return _t.apply(this, arguments);
}

function _t() {
  _t = _asyncToGenerator(function*() {
    const x = yield getResult();
    const y = yield getResult2();
    return x + y;
  });
  return _t.apply(this, arguments);
}
```

### async/await的优势

1. 同步方式处理异步

   ```javascript
   function getData() {
       getRes().then((res) => {
           console.log(res);
       })
   }
   // vs
   const getData = async function() {
       const res = await getRes();
       console.log(res);
   }
   
   ```

2. 获取中间值更方便直观

   ```javascript
   const morePromise = () => {
   	return promiseFun1().then((value1) => {
   		return promiseFun2(value1).then((value2) => {
   			return promiseFun3(value1, value2).then((res) => {
   				console.log(res);
   			})
   		}) 
   	})
   }
   // vs
   const morePromise = async function() {
   	const value1 = await promiseFun1();
   	const value2 = await promiseFun2(value1);
   	const res = await promiseFun3(value1, valuw2);
   	return res;
   }
   
   ```

3. 可以配合Promise.all来实现并行异步

   ```javascript
   const a = async function() {
       const res = await Promise.all[getRes1(), getRes2()];
       return res;
   }
   ```

   

## Generator的Babel实现

总体思想

1. 维护一个整体全局的context，这样不论这个generator运行在哪一步都由这个全局来记录，并且由此来提供这个generator最新的状态和值
2. 提供一个next方法，当调用时将context传入gen$函数
3. gen$这个函数， 实际就是将generator中的每一个yield中的内容放到一个switch的case中，每次执行一次next，将指针指向next的位置，并且返回当前yield计算的值。如果接下来gen继续调用next的话，那switch就会走进上次指定的next case同时再重置next
4. 实际过程中如果yield后的是promise，还要经历更复杂的处理

```javascript
// promise中有很多问题 内部还是采用回调的方式 ，如果逻辑过多还是可能会导致 回调地狱

// 我们希望写的代码更像同步一些 generator 
// koa1.0 用的是generator  koa2 => async + await

// generator 函数可以实现暂停的功能 -> redux-saga （dva）

// yield 表示的是产出 * generator函数 （迭代器函数）

function gen$(context) {
    switch (context.prev = context.next) {
        case 0:
            context.next = 1;
            return 1
        case 1:
            console.log('第二步');
            context.next = 2;
            return 2
        case 2:
            context.next = 3;
            return 3
        case 3:
            context.stop();
            return 100
    }
}
let gen = function() {
    const context = {
        prev: 0, // 当前要运行的
        next: 0, // 下一次要运行的
        done: false, // 是否完成运行
        stop() {
            this.done = true; // 更改完成状态
        }
    }
    return {
        next() {
            return {
                value: gen$(context), // 将上下文传入
                done: context.done
            }
        }
    }
}

// function* gen() { // 根据指针向下执行 + switch-case来实现
//     yield 1
//     yield 2
//     yield 3
//     return 100;
// }
let it = gen();
console.log(it.next()); // {value:1,done:false}
console.log(it.next()); // {value:2,done:false}
console.log(it.next()); // {value:3,done:false}
console.log(it.next()); // {value:undefined,done:true}
```

## async/await原理

> async/await = generator + co
>
> 核心思想：
>
> 1. 借助generator通过指针可以暂停代码的特性，在下面代码的第7行，将yield之后的内容包装成一个Promise，并且仅当then时才step下一步，这样的结果就是只有当这个promise被resolve了，generator的指针才会走到下一步去，这样就完美实现了异步代码的同步化
> 2. 借助co一次性完成迭代器的特性，不需要代码手动去调迭代器的next方法，一次性走完一个async函数

什么是co?  co是一个可以一次性将一个迭代器执行完返回的库

想象一下，把下面的代码的*改成async，yield改成await。这就是一个我们熟悉的async/await函数。 此时通过编译就得到了如下的代码块。

```javascript
let fs = require('fs').promises; // async + await === ganertor + co
function co(it) { // 异步迭代采用函数的方式  语法
    return new Promise((resolve, reject) => {
        function step(data) {
            let { value, done } = it.next(data);
            if (!done) {
                Promise.resolve(value).then((data)=>{
                    step(data)
                },reject); // 失败就失败了
            } else {
                resolve(value); // 将最终的结果抛出去
            }
        }
        step();
    })
}
function* read() { // switch - case => babel编译后就是把一个函数分成多个case 采用指针的方式向下移动
    let name = yield fs.readFile('name.txt', 'utf8'); // => 返回结果
    let age = yield fs.readFile(name, 'utf8');
    return age;
}
co(read()).then(data => {
    console.log(data);
}).catch(err => {
    console.log(err);
})
```

