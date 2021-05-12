---
title: 【笔记】- 如何实现一个Koa
date: 2020-10-08
tags:
 - NodeJS
 - Koa
categories:
 - 笔记
---

Koa本质就是对nodeJS http模块的封装，所以理论上讲可以自己实现一个Koa。 Koa有几个特性是原生http server不支持的，主要包括

1. 用一个`ctx`来替代对原生`request`和`response`的操作
2. ctx还能拿到原本没有path, query等属性
3. 可以用async/await的函数来注册中间件

所以主要针对这些特性，就可以手动实现一个Koa

## context代理res/req

先创建三个普通对象（不是类），分别对应`context/request/response`。但是每次请求都是独立的context/request/response，那么如何让每次产生的对象都是隔离的呢？答案是使用`Object.create`，这样生成出来的对象原型链上有原始的对象，同时在对象上做操作不会对原始对象产生影响。

```javascript
// application.js
this.context = Object.create(context); // 此方法一般用于继承 可以继承原本的属性,用户扩展，扩展到新创建的对象 不会影响原来的对象
this.request = Object.create(request);
this.response = Object.create(response);
```

第二步，考虑如何将res/req代理到ctx上。 首先ctx对象要有request/response属性，然后在context文件中，利用`defineGetter/defineSetter`在proto上，当访问或设置res/req上某个不存在的属性时（比如body/path），就代理到context的原型链proto上。 相当于是做了一层`object.defineProperty`

有些属性是只能取，不能设的，比如path，url，这些都是通过ctx直接向req/res取的

```javascript
// application.js
// request和response就是我们koa自己的对象
// req，res就是原生的对象
ctx.request = request;
ctx.response = response;
ctx.request.req = ctx.req = req;
ctx.response.res = ctx.res = res;

// context.js
let proto = {};
module.exports = proto;
// proto和ctx的关系
// ctx.__proto__.__proto__ = proto

function defineGetter(target, key) {
  proto.__defineGetter__(key, function () {
    // defineProperty
    return this[target][key];
  });
}
function defineSetter(target, key) {
  proto.__defineSetter__(key, function (value) {
    this[target][key] = value; //ctx.body = 'xxx' ctx.respinse.body = 'xxx'
  });
}
// 代理实现 ctx.xxx = ctx.request.xxx   ctx.xxx = ctx.response.xxx
defineGetter("request", "path");
defineGetter("request", "url");
defineGetter("response", "body");
defineSetter("response", "body");

//request.js
const url = require("url");

// request对象是基于req进行的扩展
module.exports = {
  get path() {
    let { pathname } = url.parse(this.req.url);
    return pathname;
  },
  get query() {
    let { query } = url.parse(this.req.url, true);
    return query;
  },
};

// response.js
module.exports = {
  _body: undefined,
  get body() {
    return this._body;
  },
  set body(val) {
    this.res.statusCode = 200; // 更改状态码是200
    this._body = val;
  },
};
```



## 实现中间件的顺序调用

需要一个`compose`方法来集合所有注册的中间件，可以用reduce来实现也可以用递归来实现

```javascript
  compose(ctx) {
    //  需要将多个函数进行组合
    let index = -1;
    const dispatch = (i) => {
      // 如果一个方法都没有或者next调用多次
      if (index > i) return Promise.reject("next() called multiples");
      if (i === this.middlewares.length) return Promise.resolve(); // 终止条件

      index = i;

      let middleware = this.middlewares[i];
      // reduce方法也可以实现 , 新版本的resolve，如果内部是一个promise 就不会在包装了，如果不是promise就包装成一个promise
      try {
        return Promise.resolve(middleware(ctx, () => dispatch(i + 1)));
      } catch (e) {
        return Promise.reject(e);
      }
    };
    return dispatch(0);
  }
```

每次接受请求

```javascript
  handleRequest(req, res) {
    let ctx = this.createContext(req, res);

    res.statusCode = 404;

    this.compose(ctx)
      .then(() => {
        let body = ctx.body; // 最终将body的结果返回获取
        if (typeof body == "string" || Buffer.isBuffer(body)) {
          res.end(ctx.body); // 用户多次设置只采用最后一次
        } else if (body instanceof Stream) {
          // res.setHeader(`Content-Disposition`,`attachement;filename=${encodeURIComponent('下载')}`);
          body.pipe(res); // 可读流. pipe(可写流)
        } else if (typeof body == "object") {
          res.end(JSON.stringify(body));
        } else {
          res.end(`Not Found`);
        }
      })
      .catch((err) => {
        this.emit("error", err);
      });
    this.on("error", () => {
      res.statusCode = 500;
      res.end("Internal Error");
    });
  }
```

