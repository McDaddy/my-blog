---
title: 【笔记】- 手撸Vue
date: 2020-11-01
tags:
 - Vue
categories:
 - 笔记

---

## 初始化项目

一般来说框架类库都使用`rollup`来打包，因为rollup会少很多多余的代码，代码会更干净，体积更小

```javascript
// rollup.config.js
import serve from "rollup-plugin-serve";
import babel from "rollup-plugin-babel";

export default {
  input: "./src/index.js", // 入口文件
  output: {
    file: "dist/vue.js", // 输出文件
    name: "Vue", // 输出的库名
    format: "umd",
    sourcemap: true, // 开启source map
  },
  plugins: [
    babel({  // 用来将ES6编译成ES5
      exclude: "node_modules/**",
    }),
    serve({ // 启动一个本地server，做到编码热更新
      open: true,
      openPage: "/public/index.html",
      port: 3000,
      contentBase: "",
    }),
  ],
};

```

这里为什么要使用`umd`的输出格式？

umd的主要特点就是可以自动区分环境来运行，本质就是一个IIFE，将当前环境的`this`传入

- 如果exports是对象，且module不是空，则这是node环境，将factory的执行结果赋值给module.exports
- 如果define存在。则是AMD规范
- 如果globalThis存在，那么直接在globalThis上挂载刚才rollup配置的name的名字。
- globalThis是ES2020的标准，用来指代当前环境的全局变量

```javascript
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Vue = factory());
}(this, (function () { 'use strict';

    function Vue(options) {
      console.log('Vue');
    }
    return Vue;

})));

// 在node.js中也能运行
const v = require('./vue.js')
v(); // Vue
```

