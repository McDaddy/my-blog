---
title: 【笔记】- NodeJS基础
date: 2020-07-09
tags:
 - NodeJS
categories:
 - NodeJS
 - 笔记

---

node.js 是⼀个 JS 的服务端运⾏环境，简单的来说，他是在 JS 语⾔规范的基础上，封装了⼀些服务端的运⾏时对象，让我们能够简单实现⾮常多的业务功能。如果我们只使⽤ JS 的话，实际上只是能进⾏⼀些简单的逻辑运算。**node.js** 就是基于 **JS** 语法增加与操作系统之间的交互。

<!-- more -->

## NodeJS的底层依赖

- V8引擎：用来对JS语法进行解析，有了它才能基于JS来做开发，理论上讲把V8换成别的语言的引擎那也可以用别的语言来开发node，**quickJS**是一个相比V8更加轻量的JS执行引擎，对嵌入式的设备更友好，也许会成为将来的实现。
- libuv：c 语⾔实现的⼀个⾼性能异步⾮阻塞 `IO 库`，用来实现nodeJS的事件循环。
- http-parser/llhttp：用来处理底层http请求、报文、解析等内容。
- openssl: 处理加密算法，各种框架运⽤⼴泛。
- zlib: 处理压缩等内容。

## CommonJS的实现

众所周知，CommonJS并不是ECMA规范所支持的模块化方案，相比ES Module， CommonJS完全可以理解为是运行环境为代码封装模块化提供的一种非语法层面的实现。 类似是一种polyfill，脱离node环境就是无法运转起来的。

如果我们要自己实现CommonJS的这套模块化规范，理论上只需要一个类似V8的JS引擎就可以做到

```javascript
// index.js
require('./require');
const m = customRequire('./module');

console.log('log', m)
```

```javascript
// module.js
module.exports = {
    a: 1
}
```

```javascript
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const customRequire = function(inputPath) {
  	// 这里没有处理扩展名的问题，实际实现会更复杂
  	// 拿到要require的文件的路径，然后合成为绝对路径，最后将文件内容用字符串形式读出
    const filePath = path.resolve(__dirname, './' + inputPath + '.js');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    const functionWrap = [
        '(function(require, module, exports) {',
        '})'
    ]
		// 给content前后套上一个匿名函数，这样代码里面就能得到require，module等对象
    const moduleStr = functionWrap[0] + content + functionWrap[1];
    const myModule = {
        exports: {}
    };
  	// 类型eval和new Function，将上面的函数字符串转化成真的函数对象，此处script的typeof是object
    const script = new vm.Script(moduleStr, { filename: 'index.js'})
    // 这里得到的result是一个真正的可执行的函数
    const result = script.runInThisContext();
  	// 把customRequire递归得传递进去，最后的导出都会在module.exports
    result(customRequire, myModule, myModule.exports);
    return myModule.exports;
}

global.customRequire = customRequire;
```

从上面的实现可以解释为什么`module.exports = xxx`和`exports.xx = xx`都是合理的。而`exports = xxx`是不合规的。因为把exports直接赋给一个值就等于把exports和module之间的引用关系给切断了。