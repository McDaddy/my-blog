---
title: Babel详解
date: 2021-10-10
tags:
 - Babel
categories:
 - 前端工程化


---

## Babel是什么

Babel 是一个 JavaScript 编译器。（官网定义）

用通俗的话解释就是它主要用于将高版本的JavaScript代码转为向后兼容的JS代码，从而能让我们的代码运行在更低版本的浏览器或者其他的环境中。

babel内置的解析引擎叫**Babylon** (fork from acorn)

目前主流用的Babel是版本7或者8

<!-- more -->

## @babel/core

babel的核心工作流程分为3个阶段：

- 解析（parsing）由`@babel/parser` 完成，里面就是用了Babylon这个解析引擎，把代码转成ast

- 转换（transforming）

- 生成（generating）由`@babel/generator`完成，将ast重新变回源代码

`@babel/core`是babel的核心包，包含了上面说的两个子包。它自身不带任何转换功能，它的转换功能是依托插件（@babel/plugin-xxx）实现的，所以如果仅仅拿@babel/core来处理代码，那么输入和输出是基本一样的。

## presets

Babel官网提供了接近上百种插件用来做代码转换，为了减少使用者配置插件的成本，babel提供了预设（presets），即一系列插件的组合。比如`@babel/preset-es2015`就是用来将部分ES6语法转换成ES5语法

我们主要会用到的预设包括

- @babel/preset-env
- @babel/preset-react 用来转换jsx，即一个dom => React.createElement()
- @babel/preset-typescript

预设的执行顺序是**从后往前**

### @babel/preset-env

>  @babel/preset-env是一个智能预设，可让您使用最新的JavaScript，而无需微观管理目标环境所需的语法转换（以及可选的浏览器polyfill）。这都使您的生活更轻松，JavaScript包更小！

我们只需要配置

```javascript
{
  "presets": ["@babel/preset-env"] // ["@babel/env"] 缩写
}
```

下面的代码通过babel编译就能得到

```javascript
// 源代码
let fun = () => console.log("hello babel.js");
class Person {
  constructor(name) {
    this.name = name;
  }
  say() {
    console.log(`my name is：${this.name}`);
  }
}
const tom = new Person("tom");
tom.say();

// 编译后
"use strict";
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var fun = function fun() {
  return console.log('hello babel.js');
};

var Person = /*#__PURE__*/function () {
  function Person(name) {
    _classCallCheck(this, Person);

    this.name = name;
  }

  _createClass(Person, [{
    key: "say",
    value: function say() {
      console.log("my name is\uFF1A".concat(this.name));
    }
  }]);

  return Person;
}();

var tom = new Person('tom');
tom.say();
```

可以看到箭头函数通过严格模式变成了普通函数的语法。Class变成了function的语法，但也生成了几个类相关的辅助函数来实现class的功能。

同时我们可以通过指定`targets`来控制转换的粒度，比如如下设置，转换出来的代码和上面的源码是没区别的，因为Chrome最新版肯定是支持箭头函数和class的

```javascript
{
  "presets": [
    [
      "@babel/env",
      {
        "targets": "last 2 Chrome versions"
      }
    ]
  ]
}
```

## @babel/polyfill

虽然@babel/preset-env可以转换大多高版本的JS语法，但是一些ES6**原型链上的函数**（比如数组实例上的的filter、fill、find等函数）以及**新增的内置对象**（比如Promise、Proxy等对象），是低版本浏览器本身内核就不支持，因此@babel/preset-env面对他们时也无能为力。此时就必须要垫片来兼容，而@babel/polyfill就是做这个的

使用方法就是在工程入口引入`@babel/polyfill`，这里有两个问题是

1. 它会把所有poly-fill都放进去，不论到底需不需要，所以会导致包体积变大。
2. 它会直接覆盖对象的原型链，造成全局污染。比如array.filter方法，在IE11中是不支持的，当页面引了@babel/polyfill之后，在控制台就能直接用这个方法了，这是非常不可控的行为

```javascript
// 处理原型链函数的方式非常暴力
Object.defineProperty(Array.prototype, 'includes',function(){
  ...
})
```

所以Babel7以后就不推荐这种方法了，而是直接引入`core-js`与`regenerator-runtime`两个包，在安装这个包时候甚至会报出警告

![image-20211010201620890](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20211010201620890.png)

## core-js

作为@babel/polyfill的替代者，那`core-js`到底是什么呢？ — 可以理解为一个polyfill的集合，默认是版本2，目前推荐用3

- 它是JavaScript标准库的polyfill
- 它尽可能的进行模块化，让你能选择你需要的功能
- 它和babel高度集成，可以对core-js的引入进行最大程度的优化

## useBuiltIns

Babel 把 ES6 的标准分为 syntax 和 built-in 两种类型。syntax 就是语法，像 `const`、`=>` 这些默认被 Babel 转译的就是 syntax 的类型。而对于那些可以通过改写覆盖的语法就认为是 built-in，像 `includes` 和 `Promise` 这些都属于 built-in。而 Babel 默认只转译 syntax 类型的，对于 built-in 类型的就需要通过 @babel/polyfill 来完成转译。

`useBuiltIns`这个属性决定是否引入polyfill，可以配置三个值：false（不引入）、usage（按需引入）和entry（项目入口处引入，不管用没用到都会引入）；`corejs`表示引入哪个版本的core-js，可以选择2（默认）或者3，只有当useBuiltIns不为false时才会生效。

##  @babel/preset-env与core-js

刚才提到`@babel/preset-env`是可以用来指定polyfill的。开关就是useBuiltIns，它们两个是固定搭配，如果不在@babel/preset-env中指定useBuiltIns就不需要安装core-js

```javascript
{
  "presets": [
    [
      "@babel/preset-env",
      {
        "useBuiltIns": "usage",
        "corejs": 3
      }
    ]
  ]
}
```

通过这样编译后，就可以做到按需从core-js引入垫片， 可以这样依然会局部污染，比如下面的filter原型链还是被覆盖了

```javascript
"use strict";

require("core-js/modules/es.array.filter");

require("core-js/modules/es.object.assign");

require("core-js/modules/es.object.to-string");

require("core-js/modules/es.promise");

Object.assign({}, {});
[(1, 5, 10, 15)].filter(function (value) {
  return value > 9;
});
var promise = new Promise(function (resolve, reject) {
  resolve(1);
});
```

## @babel/runtime

看到刚才用`preset-env`编译class之后，会产生一系列辅助函数，babel会在每个模块需要时都生成这样的辅助函数，这样就造成了很大的空间浪费。所以Babel就把这些固定的辅助函数放到一个npm包中。在@babel/runtime中有一个helpers的目录，就包含了所有的辅助函数。

使用方法是要同时安装@babel/runtime和@babel/plugin-transform-runtime

```javascript
{
  "presets": ["@babel/env"],
  "plugins": ["@babel/transform-runtime"]
}
```

再次编译，这些辅助函数就会从helpers中引用

```javascript
var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
```

## @babel/plugin-transform-runtime

虽然我们用core-js不会像@babel/polyfill一样全局污染所有对象，但依然会污染部分对象（可以把core-js引入垫片理解为部分的@babel/polyfill），比如代码中用到了array.filter，控制台就能使用filter了，但依然不能用array.includes

解决方法就是给@babel/plugin-transform-runtime指定corejs

```javascript
{
  "presets": ["@babel/env"],
  "plugins": [
    [
      "@babel/transform-runtime",
      {
        "corejs": 3
      }
    ]
  ]
}
```

这里必须要先安装`@babel/runtime-corejs3`，这样编译后的代码，所有的垫片都是引用，且不会污染全局

```javascript
"use strict";

var _interopRequireDefault = require("@babel/runtime-corejs3/helpers/interopRequireDefault");

var _promise = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/promise"));

var _filter = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/instance/filter"));

var _context;

(0, _filter["default"])(_context = [1, 5, 10, 15]).call(_context, function (value) {
  return value > 9;
});
var promise = new _promise["default"](function (resolve, reject) {
  resolve(1);
});
```

@babel/runtime-corejs3 其中包含core-js， helpers和regenerator

**注意**: 一旦给@babel/plugin-transform-runtime指定了corejs，那么就不需要安装@babel/runtime了，因为@babel/runtime-corejs3已经包含了helpers了

**注意**：虽然这样看起来很美好，但有个巨大的问题，就是@babel/runtime-corejs3会无视浏览器targets，也就是说，即使是为最新的Chrome编译，依然会把所有用到的垫片放进去。所以绝对不是理想的方案

## regenerator-runtime

可以理解为实现Generator以及async/await的helper函数，它是被包含在@babel/runtime中的

## 总结

目前看起来最好的实践就是如下，必须安装的包包括

- @babel/core
- @babel/runtime
- @babel/plugin-transform-runtime
- @babel/preset-env
- core-js@3

```javascript
{
  "presets": [
    [
      "@babel/preset-env",
      {
        "useBuiltIns": "usage",
        "corejs": 3
      }
    ]
  ],
  "plugins": ["@babel/transform-runtime"]
}
```

这个配置配合targets，可以做到

1. 根据目标浏览器自动按需转换
2. 转换如箭头函数，let，const等语法
3. 转换class等需要辅助函数的语法时，单独引入helpers，不产生冗余代码
4. 转换原型链函数，Promise，Map，Reflect等，**但会污染部分全局变量**



## 参考文档

[一文彻底读懂Babel](https://mp.weixin.qq.com/s/VJL1m3op567LogrC3fWh4w)