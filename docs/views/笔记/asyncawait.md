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

   