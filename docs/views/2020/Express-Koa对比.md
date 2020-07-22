---
title: Express vs Koa 对比
date: 2020-07-14
tags:
 - NodeJS
categories:
 - NodeJS
---

Express和Koa两者都是对node原生`http`模块的封装，用以提供更加丰富的功能和中间件机制。理论上讲功能没有太大的差异，这里简单总结下两者的异同

<!-- more -->

## 相同点

1. 都是自上而下注册中间件，执行顺序依照注册顺序来。



## 不同点

### Handler机制

**Express 使用普通的回调函数，一种线性的逻辑，在同一个线程上完成所有的 HTTP 请求**

由于是通过Callback来实现

### 中间件实现机制

Express是线性执行的，而Koa是洋葱模型，具体看两个具体例子

```javascript
// koa-demo
const Koa = require('koa');
const KoaRouter = require('koa-router');
const app = new Koa();
const router = new KoaRouter()

const sleep = async () => {
    await new Promise(resolve => {
        setTimeout(() => {
            resolve()
        }, 2000);
    }) 
}

app.use(router.routes()).use(router.allowedMethods())

router.use(async (ctx, next) => {
    console.log('middleware1 start');
    await sleep().then(next);
    console.log('middleware1 end');
})

router.use(async (ctx, next) => {
    console.log('middleware2 start');
    await sleep().then(next);
    console.log('middleware2 end');
})

router.get('/', (ctx,next) => {
    console.log('/');
    ctx.body = 123;
})

app.listen(8000, () => {
    console.log('koa server started');
})

// express-demo
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();

const sleep = async () => {
    await new Promise(resolve => {
        setTimeout(() => {
            resolve()
        }, 1000);
    }) 
}

app.use(bodyParser.json())

app.use(async (req, res, next) => {
    console.log('middleware1 start');
    await sleep().then(next);
    console.log('middleware1 end');
})

app.use(async (req, res, next) => {
    console.log('middleware2 start');
    await sleep().then(next);
    console.log('middleware2 end');
})

app.get('/', (req,res) => {
    console.log("req", req.query)
    res.sendFile(path.resolve(__dirname, './index.html'));
})

app.listen('8000', () => {
    console.log('server started');
})
```

打印结果
```javascript
// koa
middleware1 start
middleware2 start
/
middleware2 end
middleware1 end

// express
middleware1 start
middleware2 start
middleware1 end
req {}
middleware2 end
```

在面对异步的中间件场景时，看起来Koa的执行结果是符合预期的，而Express是有问题的。具体原因就是他们实现中间件的机制不同

### Express的实现机制

**Express 中间件实现是基于 Callback 回调函数同步的，它不会去等待异步（Promise）完成**

当中间件全是同步代码时，结果等同于洋葱模型，当有异步时，就是线性的执行（按照1212而不是1221）

express中间件注册挂载的源码，本质就是把当前传入的中间件推入他的stack栈中。

```javascript
// https://github.com/expressjs/express/blob/4.x/lib/router/index.js#L428
proto.use = function use(fn) {
  var offset = 0;
  var path = '/';

  ...

  var callbacks = flatten(slice.call(arguments, offset));

  if (callbacks.length === 0) {
    throw new TypeError('Router.use() requires a middleware function')
  }

  for (var i = 0; i < callbacks.length; i++) {
    var fn = callbacks[i];

    if (typeof fn !== 'function') {
      throw new TypeError('Router.use() requires a middleware function but got a ' + gettype(fn))
    }

    // add the middleware
    debug('use %o %s', path, fn.name || '<anonymous>')

    var layer = new Layer(path, {
      sensitive: this.caseSensitive,
      strict: false,
      end: false
    }, fn);

    layer.route = undefined;

    this.stack.push(layer); // 中间件 route 的 layer 对象的 route 为 undefined，区别于路由的 router 对象
  }

  return this;
};
```

每次执行next其实就是把stack中下标+1的layer取出来然后传入req、res进行执行

- 当有异步中间件代码时，将会直接跳过继续执行，此时的 `next` 方法并未执行，需要等待当前队列中的事件全部执行完毕，所以此时我们输出的数据是线性的。
- 当 `next` 方法直接执行时，本质上所有的代码都已经为同步，所以层层嵌套，最外层的肯定会在最后，输出了类似剥洋葱模型的结果。

```javascript
// https://github.com/expressjs/express/blob/dc538f6e810bd462c98ee7e6aae24c64d4b1da93/lib/router/index.js#L136
proto.handle = function handle(req, res, out) {
  var self = this;
  ...
  next();

  function next(err) {
    ...
    // find next matching layer
    var layer;
    var match;
    var route;

    while (match !== true && idx < stack.length) {
      layer = stack[idx++]; // 取出中间件函数
      match = matchLayer(layer, path);
      route = layer.route;

      if (typeof match !== 'boolean') {
        // hold on to layerError
        layerError = layerError || match;
      }

      if (match !== true) {
        continue;
      }

      if (!route) {
        // process non-route handlers normally
        continue;
      }

      ...
    }
    
    ...
    // this should be done for the layer
    self.process_params(layer, paramcalled, req, res, function (err) {
      if (err) {
        return next(layerError || err);
      }

      if (route) {
        return layer.handle_request(req, res, next);
      }
      
      trim_prefix(layer, layerError, layerPath, path);
    });
  }
  
  function trim_prefix(layer, layerError, layerPath, path) {
    ...
    if (layerError) {
      layer.handle_error(layerError, req, res, next);
    } else {
      // 这里进行函数调用，且递归
      layer.handle_request(req, res, next);
    }
  }
};
  
// layer.handle_request的实现
Layer.prototype.handle_request = function handle(req, res, next) {
  // this.handle就是构造Layer时传入的
  var fn = this.handle;

  if (fn.length > 3) {
    // not a standard request handler
    return next();
  }

  try {
    // 这个fn的返回即使是promise，express也是不管的
    fn(req, res, next);
  } catch (err) {
    next(err);
  }
};
```

这段可以通过下面这段代码来理解，因为outer方法是没有await的，所以当inner方法出现await或者setTimeout之类的异步时，就会直接跳出，直接打印outer end，等内层异步结束之后，才会继续执行内层后续的代码。

```javascript
const outerSyncFunc = () => {
    console.log('out start');
    innerSyncFunc();
    console.log('out end');
}

const innerSyncFunc = async () => {
  console.log('inner start');
  await sleep().then(() => {
      console.log('process middleware');
  });
  console.log('inner end');
}

outerSyncFunc();

/*
out start
inner start
out end
process middleware
inner end
*/
```

虽然我每个中间件方法都包了async/await，为什么说outerSyncFunc还没有async呢？原因是express他是不管每个中间件fn的return结果的，即使用了async/await包裹返回一个promise，他也是无视的，前后两个中间件间的调用连接纯粹看什么时候调用next()，当执行一个中间件时，执行到一半，next没遇到却遇到了一个异步操作，那就直接返回上层堆栈开始执行上一层中间件的end操作，直到事件循环把异步操作完成后，再执行next()和当前中间件的end。

### Koa的实现机制

 **Koa 的中间件机制中使用 Async/Await（背后全是 Promise）以同步的方式来管理异步代码，它可以等待异步操作**

Koa执行中间件的过程：

```javascript
// 简化版
// middleware是顺序注册的中间件列表
function compose(middleware) {
  return function(context, next) {
    let index = -1
    // 从0开始调用
    return dispatch(0)
    function dispatch(i) {
      index = i
      const fn = middleware[i] || next
      if (!fn) return Promise.resolve()
      // 如果fn里面有异步操作，必须要等内层的promise resolve返回之后才会执行外层的
      return Promise.resolve(fn(context, function next() {
        // 递归取出下一个中间件，这里的返回next方法永远是一个promise
        return dispatch(i + 1)
      }))
    }
  }
}  
```

基于这种实现机制，**必须要求每一个中间件都用async/await去调用next**，如下代码中，把先执行的中间件的async/await去掉，成为一个完全同步的方法，最后输出的结果还是1212

```javascript
// koa-demo.js
router.use((ctx, next) => {
    console.log('middleware1 start');
    // await sleep().then(next);
    next();
    console.log('middleware1 end');
})

router.use(async (ctx, next) => {
    console.log('middleware2 start');
    await sleep().then(next);
    console.log('middleware2 end');
})
```

总结一下，只要都是同步代码的情况下，两者都是洋葱模型，但是在异步情况下，Express是线性执行，而Koa在包裹async/await的情况下还是洋葱模型



### 响应机制

Express只要调用了`res.send`那么响应就结束了，而Koa使用`ctx.body`的形式可以在各个中间件中去修改叠加这个返回值，当所有中间件都完成后这个ctx.body才会真的返回客户端。



## 参考

[Express VS Koa 中间件机制分析](https://juejin.im/post/5d5f3f4cf265da03f233d579)

[再也不怕面试官问你express和koa的区别了](https://juejin.im/post/5da6eef5f265da5b6b631115)

[多维度分析 Express、Koa 之间的区别](https://zhuanlan.zhihu.com/p/115339314)