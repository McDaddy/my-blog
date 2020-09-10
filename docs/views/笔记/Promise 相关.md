---
title: 【笔记】- Promise详解
date: 2020-05-07
tags:
 - ES6
 - Promise
categories:
 - JavaScript
 - 笔记
---

## 为什么需要Promise？

因为JavaScript是单线程语言，不能像Java那样new一个thread然后start之后就去做别的事情。在解决异步场景的时候就要用到回调函数，但是如果嵌套的层数过多，就会不利于后期维护，也就产生了**回调地狱**。Promise产生的目的就是把这些异步化的代码写到“同步化”

<!-- more -->

## Promise的优点

1. 更优雅的异常捕获，原先的回调模式， 必须在每一个回调的第一步完成异常的处理，现在可以统一处理

## Promise的缺点

1. 虽然可以链式调用，但依然是基于回调的，即在then或者catch里面写回调函数，还是可能会把代码写很长
2. 一个promise一旦开始没法停止

## Promise 基础

- Promise是一种规范，只要自己的实现符合Promise A+的规范，那就是一个标准的Promise
- Promise只有三种状态： 1. pending 2. fulfilled 3. rejected
- 状态只能从pending流向后两者，且状态不可逆
- then和catch返回的永远是Promise实例
- Promise构造函数接受一个带两个参数的函数，两个参数分别用于触发两种状态的改变，如果是resolve可以把这个promise的结果值传递给下面的then，如果是reject那可以把失败的理由传递给下一个.catch或者.then方法中的第二个参数
- then方法接受两个参数，第⼀个参数为 resolve 后执⾏，第⼆个函数为 reject 后执⾏, 所以一次最多执行一个参数
- then的第二个onReject参数不太常用，只要原因是它无法捕获自身这个then中onResolve执行时抛出的异常，为了保险还必须在后面再跟一个catch，所以意义就不大了，一般情况下在整个链式调用的尾部加一个catch就好了
- catch并不能捕获自己本身抛出的异常，所以最最保险的做法是用一个大的try…catch来包住整个链式调用

```javascript
// promise 的 then 可以接受两个函数，
promise3().then(onResolve, onReject);
// 也可以通过 .catch ⽅法拦截状态变为已拒绝时的 promise
promise3().catch(onReject).then(onResolve);
```

## Promise 规范

以下为摘抄的主要的Promise A+ 规范内容

##### promise 的状态

⼀个 Promise 的当前状态必须为以下三种状态中的⼀种：**等待态（Pending）**、**已完成（Fulfilled）**和 **已**
**拒绝（Rejected）**。

- 处于等待态时，promise 需满⾜以下条件：可以变为「已完成」或「已拒绝」
- 处于已完成时，promise 需满⾜以下条件：1. 不能迁移⾄其他任何状态 2. 必须拥有⼀个**不可变**的值
- 处于已拒绝时，promise 需满⾜以下条件：1. 不能迁移⾄其他任何状态 2. 必须拥有⼀个**不可变**的原因
- 这个值或者原因可以是任何东西，**当不返回的时候就是undefined**，这个值也可以是一个promise

##### 必须有⼀个 then ⽅法

⼀个 promise实例 必须提供⼀个 then ⽅法以访问其当前值或原因。

promise 的 then ⽅法接受两个参数： promise.then(onFulfilled, onRejected) 他们都是可选参数，同时他们都是函数，如果 onFulfilled 或 onRejected 不是函数，则需要**忽略**他们。忽略的意思就是跳过，直接带着上一个Promise的结果进入下一个链式调用或者结束

- 如果 onFulfilled 是⼀个函数
  - 当 promise 执⾏结束后其必须被调⽤，其第⼀个参数为 promise 的结果
  - 在 promise 执⾏结束前其不可被调⽤
  - 其调⽤次数不可超过⼀次

- 如果 onRejected 是⼀个函数
  - 当 promise 被拒绝执⾏后其必须被调⽤，其第⼀个参数为 promise 的原因
  - 在 promise 被拒绝执⾏前其不可被调⽤
  - 其调⽤次数不可超过⼀次

- 在执⾏上下⽂堆栈仅包含平台代码之前，不得调⽤ onFulfilled 或 onRejected，意思就是必须后面的then或者catch被注册之后才能开始执行

- then ⽅法可以被同⼀个 promise 调⽤多次

  - 当 promise 成功执⾏时，所有 onFulfilled 需按照其注册顺序依次回调

  - 当 promise 被拒绝执⾏时，所有的 onRejected 需按照其注册顺序依次回调

- then ⽅法必须返回⼀个 promise 对象 promise2 = promise1.then(onFulfilled, onRejected);
  - 只要 onFulfilled 或者 onRejected 返回⼀个值 x ，promise 2 都会进⼊ onFulfilled 状态
  - 如果 onFulfilled 或者 onRejected 抛出⼀个异常 e ，则 promise2 必须拒绝执⾏，并返回拒因 e
  - 如果 onFulfilled 不是函数（非函数忽略）且 promise1 状态变为已完成， promise2 必须成功执⾏并返回相同的值
  - 如果 onRejected 不是函数（非函数忽略）且 promise1 状态变为已拒绝， promise2 必须执⾏拒绝回调并返回相同的据因
- finally 方法不能像then一样直接拿到上一步的结果value，而是直接执行Callback然后把前面的值作为promise返回

```javascript
var promise1 = new Promise((resolve, reject) => {reject();});
promise1.then(null, function() {
	return 123;
}).then(null, null).then(null, null).then(() => {
	console.log('promise2 已完成');
},() => {
	console.log('promise2 已拒绝');
});

// promise2 已完成
// 同时123会被一路带下来

// 这种情况, 虽然promise在第一步就被reject了，但是即使是catch，它返回的依然是一个promise，依然可以把值传递下去
const promise = Promise.reject(123);
promise.catch((val) => {console.log(val); return 'xxx'}).then((v) => console.log(666, v))
// 这种情况在resolve的后面直接跟catch，因为catch只接受异常不接受正常值，所以这个函数就被跳过了。带着上面的状态进入下一个then
const promise = Promise.resolve(123);
promise.catch((val) => {console.log(val)}).then((v) => console.log(666, v))

// 小技巧
// 在Promise.all中，写成下面的形式，可以使在某些promise失败的情况，依然进入then方法
// 原因1. err在catch中被返回就成为了下一个then的值。 2.如果不报错那么根据上面的情况，不会走进catch同时会带着fulfilled的值进入下一个then
Promise.all([p1.catch(err => err), p2.catch(err => err)]).then(result => ...)
```

##### promise 的解决过程

Promise 解决过程是⼀个抽象的操作，其需输⼊⼀个 promise 和⼀个值，我们表示为` [[Resolve]](promise, x) `（这句话的意思就是把 promise resolve 了，同时传⼊ x 作为值）

如果 x 有 then ⽅法且看上去像⼀个 Promise ，解决程序即尝试使 promise 接受 x 的状态；否则其⽤ x 的值来执⾏ promise 。

```javascript
promise.then(function(x) {
	console.log('会执⾏这个函数，同时传⼊ x 变量的值', x);
});
// 这个x可以是一个非异常的任何值， 也可以是一个promise
// 如果x是promise那么就要等这个x的promise执行完毕了，带着它执行的结果才会走到下一步
```

- 如果 x 为 Object 或 function（不常⻅）
  - ⾸先尝试执⾏ x.then
  - 如果取 x.then 的值时抛出错误 e ，则以 e 为据因拒绝 promise
  - 如果 then 是函数，将 x 作为函数的作⽤域 this 调⽤。传递两个回调函数作为参数，这就成为了一个嵌套的promise
  - 如果then不是个函数，那么x本身就是完成的值
  - 所以如果返回Object的promise, 返回体里的then是方法， 那就要注意了，**这是一个潜在的坑**

##### Promise的静态方法

`Promise.resolve`
返回⼀个 promise 实例，并将它的状态设置为已完成，同时将他的结果作为传⼊ promise 实例的值

`Promise.reject`
返回⼀个 promise 实例，并将它的状态设置为已拒绝，同时也将他的结果作为原因传⼊ onRejected 函数

`Promise.all`
返回⼀个 promise 实例，接受⼀个数组，⾥⾯含有多个 promise 实例，当所有 promise 实例都成为已完成状态时，进⼊已完成状态，否则进⼊已拒绝状态。

`Promise.race`
返回⼀个 promise 实例，接受⼀个数组，⾥⾯含有多个 promise 实例，当有⼀个 promise 实例状态改变时，就进⼊该状态且不可改变。这⾥所有的 promise 实例为竞争关系，只选择第⼀个进⼊改变状态的promise 的值。

## 手撸一个简易版Promise

```javascript
const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

class MyPromise {
  constructor(promiseHandler) {
    this.status = PENDING;
    this.val = undefined;
    this.resolveHandleList = [];
    this.rejectHandleList = [];
    try {
      promiseHandler(this.triggerResolve, this.triggerReject);
    } catch (error) {
      this.triggerReject(error);
    }
  }

  triggerResolve = (value) => {
    setTimeout(() => {
      // 如果调用resolve时已经不是pending了那就返回，因为状态不能逆转
      if (this.status !== PENDING) {
        return;
      }
      this.status = FULFILLED;
      this.val = value;
      this.resolveHandleList.forEach((handler) => {
        handler(value);
      });
      this.resolveHandleList = [];
    });
  };

  triggerReject = (error) => {
    setTimeout(() => {
      if (this.status !== PENDING) {
        return;
      }
      debugger
      this.status = REJECTED;
      this.val = error;
      this.rejectHandleList.forEach((handler) => {
        handler(error);
      });
      this.rejectHandleList = [];
    });
  };

  // then的意义就是注册后面的handle函数, 不是执行, 执行是发生在上一个promise完成之后，这里只是注册
  // resolveHandler是不需要return值的
  // 每个then接受两个参数，resolveHandler, rejectHandler
  // then永远都要返回一个promise 这一点catch也一样
  // resolveHandler, rejectHandler这两个方法return(或自然结束)或者throw error时。就是这个promise被resolve或reject的时机
  then = (resolveHandler, rejectHandler) => {
    const { status, val } = this;
    return new MyPromise((onResolve, onReject) => {
      // 这一步是为了融合当前then的下一个接着的then
      // 因为当前的then会返回一个Promise，如果不调用这个onResolve，那么这个Promise就永远没法被resolve或者reject，也就不能被继续then
      const unionResolveHandler = (value) => {
        // 这里隐式得考虑了resolveHandler没有传的情况，这种情况相当于catch或者promise.then(null, null)，如果promise的返回不是异常那么就会直接resolve掉
        if (typeof resolveHandler !== "function") {
          // 如果then的第一个参数不是function，那么就要忽略它，带着上一步的结果往下走
          onResolve(value);
        } else {
          // 否则先执行当前then的resolveHandler，拿到结果传给下一个then的resolveHandler
          const res = resolveHandler(value);
          if (res instanceof MyPromise) {
            res.then(onResolve, onReject);
          } else {
            onResolve(res);
          }
        }
      };

      const unionRejectHandler = (reason) => {
        if (typeof rejectHandler !== "function") {
          onReject(reason);
        } else {
          let res = null;
          try {
            res = rejectHandler(reason);
            if (res instanceof MyPromise) {
              res.then(onResolve, onReject);
            } else {
              onResolve(res);
            }
          } catch (error) {
            console.log('catch ', error);
            onReject(error);
          }
        }
      };

      switch (status) {
        case PENDING: {
          // 注册handler
          this.resolveHandleList.push(unionResolveHandler);
          this.rejectHandleList.push(unionRejectHandler);
          break;
        }
        case FULFILLED: {
          // 为什么这里会有fulfilled状态，是因为同一个promise可以被多次then，同理rejected
          // 这种情况比较难模拟，第二次调then需要异步触发
          // promise.then((v) => { console.log('resolve1', v )});
          // setTimeout(() => {
          //   promise.then((v) => { console.log('resolve2', v )});
          // }, 1000);
          unionResolveHandler(val);
          break;
        }
        case REJECTED: {
          unionRejectHandler(val);
          break;
        }
      }
    });
  };

  catch = (nextRejectHandler) => {
    return this.then(null, nextRejectHandler);
  };

  static resolve(value) {
    if (value instanceof MyPromise) {
      return value;
    }
    return new MyPromise((onResolve) => onResolve(value));
  }

  static reject(error) {
    return new MyPromise((onResolve, onReject) => onReject(error));
  }

  static all(list) {
    return new MyPromise((resolve, reject) => {
      let count = 0;
      const values = [];

      for (const [i, myPromiseInstance] of list.entries()) {
        MyPromise.resolve(myPromiseInstance).then(
          (res) => {
            values[i] = res;
            count++;
            if (count === list.length) resolve(values);
          },
          (err) => {
            reject(err);
          }
        );
      }
    });
  }

  static race(list) {
    return new MyPromise((resolve, reject) => {
      list.forEach((item) => {
        MyPromise.resolve(item).then(
          (res) => {
            resolve(res);
          },
          (err) => {
            reject(err);
          }
        );
      });
    });
  }

	finally(callback) {
  	return this.then(
      value => MyPromise.resolve(callback()).then(() => value),   // MyPromise.resolve执行回调,并在then中return结果传递给后面的Promise
      reason => MyPromise.resolve(callback()).then(() => { throw reason })  // reject同理
  	)
	}
}

// test case

// MyPromise.resolve('hello world').then(val => {
//   console.log('resolve', val);
// })

// MyPromise.reject('hello world').catch(err => {
//   console.log('reject', err);
// })

// MyPromise.reject("hello world")
//   .catch((err) => {
//     console.log("reject", err);
//     return 12;
//   }).then((val) => {
//     console.log("resolve1", val);
//   }).catch(() => {
//     console.log(12993);
//   }).finally(() => {
//     console.log('finally');
//   });

const promise = new MyPromise((resolve, reject) => {
  setTimeout(() => {
    console.log("promise resolved");
    resolve('kuimo');
  }, 1000);
});

// promise
//   .then((val) => {
//     console.log("then", val);
//     return "hello";
//   })
//   .then((v) => {
//     console.log("resolve", v);
//   })
//   .catch((error) => {
//     console.log("error", error);
//   });

promise.then((v) => { console.log('resolve1', v )});
setTimeout(() => {
  promise.then((v) => { console.log('resolve2', v )});
}, 1110);
```

## Q & A

Q： resolve的下一行报错了 会怎么样？

A： 不会怎么样。代码不会报错。 就像这个throw error不存在一样

Q：finally后面跟then会怎样？

A：finally虽然也是返回promise，但是不会影响下一个then得到的结果，所以不管return什么都是没用的，下一个then只会取上面的结果，此外，finally是函数是拿不到上一个promise的结果的。 **但是**如果在finally中报错了。那还是会走到下一个catch中去的。<u>finally的本质任务</u>是不被跳过，普通的then和catch都是可能被选择性跳过的而finally不会。 可以在一串then中间插一个finally，即使finally前的某一步报错了，也会在finally卡住，而不会直接跑到最后去

Q: 如果发生了reject行为，但是后续没有.catch或者没有try catch会怎样

A：结果就跟throw Error一样。会抛出一个`UnhandledPromiseRejectionWarning`，导致程序异常

Q: 如果在Promise.reject中传入一个异步promise，下面的catch中得到的data是什么

A：如果是Promise.resolve传入promise那就相当于`Promise.resolve(p).then === p.then `，但如果是Promise.reject(p)的话，这个p就相当于是reason不会等待它改变状态直接传到下面的catch里面去 