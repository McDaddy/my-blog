# Promise 相关

## 为什么需要Promise？

因为JavaScript是单线程语言，不能像Java那样new一个thread然后start之后就去做别的事情。在解决异步场景的时候就要用到回调函数，但是如果嵌套的层数过多，就会不利于后期维护，也就产生了**回调地狱**。Promise产生的目的就是把这些异步化的代码写到“同步化”

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
// 这种情况, 虽然promise在第一步就被reject了，但是即使是catch，它返回的依然是一个promise，依然可以把值传递下去
const promise = Promise.reject(123);
promise.catch((val) => {console.log(val); return 'xxx'}).then((v) => console.log(666, v))
```

## Promise 规范

以下为摘抄的主要的Promise A+ 规范内容

promise 的状态

⼀个 Promise 的当前状态必须为以下三种状态中的⼀种：等待态（Pending）、已完成（Fulfilled）和已

拒绝（Rejected）。

处于等待态时，promise 需满⾜以下条件：可以变为「已完成」或「已拒绝」

处于已完成时，promise 需满⾜以下条件：1. 不能迁移⾄其他任何状态 2. 必须拥有⼀个不可变的值

处于已拒绝时，promise 需满⾜以下条件：1. 不能迁移⾄其他任何状态 2. 必须拥有⼀个不可变的原因