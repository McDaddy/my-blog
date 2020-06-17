---
title: Webpack打包内容解析
date: 2020-06-16
tags:
 - Webpack
categories:
 - 工具
---

Webpack作为打包工具，如何将编译好的代码整合起来，做到让浏览器可读可执行。读懂Webpack的打包后源码有助于理解代码的模块化和运行时加载等概念，对代码优化有重要的意义

<!-- more -->

## 抛出问题

1. Babel-loader编译完成是CommonJS，不编译的话是ESModule，而浏览器不会识别CommonJS，也可能不支持ESModule，最终是如何让浏览器支持模块化的？
2. import了模块，但是实际代码没有调用会不会被打包进去？
3. require和import是不是可以混写？为什么
4. 如何实现异步加载模块？
5. 加载过的模块如何做到不重复加载？

## 代码准备

[webpack-example](https://github.com/McDaddy/webpack-examples) 依然是使用这个webpack测试仓库，主要代码包括

```javascript
// 打包入口文件 PageA.js， 引了两个util文件和一个vendor文件
import vendor1 from 'vendor1';
import utility1 from './utility1';
import utility2 from './utility2';

console.log('init');

setTimeout(() => {
    //懒加载
    // import('./async1');
    // import('./async2');
}, 100)

export default ()=>{
    console.log('pageA');
}

// utility1.js 引了utility2
import utility2 from './utility2';

export default ()=>{
    console.log('utility1');
}

// utility2.js
export default ()=>{
    console.log('utility2');
}

// vendor1.js 被放在node_modules
export default ()=>{
    console.log('vendor1');
}
```



## 入口文件打包结果

```javascript
// PageA.js
 (function(modules) { // webpackBootstrap
 	// install a JSONP callback for chunk loading
 	function webpackJsonpCallback(data) {
 		var chunkIds = data[0];
 		var moreModules = data[1];
 		var executeModules = data[2];

 		// add "moreModules" to the modules object,
 		// then flag all "chunkIds" as loaded and fire callback
 		var moduleId, chunkId, i = 0, resolves = [];
 		for(;i < chunkIds.length; i++) {
 			chunkId = chunkIds[i];
 			if(Object.prototype.hasOwnProperty.call(installedChunks, chunkId) && installedChunks[chunkId]) {
 				resolves.push(installedChunks[chunkId][0]);
 			}
 			installedChunks[chunkId] = 0;
 		}
 		for(moduleId in moreModules) {
 			if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
 				modules[moduleId] = moreModules[moduleId];
 			}
 		}
 		if(parentJsonpFunction) parentJsonpFunction(data);

 		while(resolves.length) {
 			resolves.shift()();
 		}

 		// add entry modules from loaded chunk to deferred list
 		deferredModules.push.apply(deferredModules, executeModules || []);

 		// run deferred modules when all chunks ready
 		return checkDeferredModules();
 	};
 	function checkDeferredModules() {
 		var result;
 		for(var i = 0; i < deferredModules.length; i++) {
 			var deferredModule = deferredModules[i];
 			var fulfilled = true;
 			for(var j = 1; j < deferredModule.length; j++) {
 				var depId = deferredModule[j];
 				if(installedChunks[depId] !== 0) fulfilled = false;
 			}
 			if(fulfilled) {
 				deferredModules.splice(i--, 1);
 				result = __webpack_require__(__webpack_require__.s = deferredModule[0]);
 			}
 		}

 		return result;
 	}

 	// The module cache
 	var installedModules = {};

 	// object to store loaded and loading chunks
 	// undefined = chunk not loaded, null = chunk preloaded/prefetched
 	// Promise = chunk loading, 0 = chunk loaded
 	var installedChunks = {
 		"pageA": 0
 	};

 	var deferredModules = [];

 	// The require function
 	function __webpack_require__(moduleId) {

 		// Check if module is in cache
 		if(installedModules[moduleId]) {
 			return installedModules[moduleId].exports;
 		}
 		// Create a new module (and put it into the cache)
 		var module = installedModules[moduleId] = {
 			i: moduleId,
 			l: false,
 			exports: {}
 		};

 		// Execute the module function
 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

 		// Flag the module as loaded
 		module.l = true;

 		// Return the exports of the module
 		return module.exports;
 	}

 	var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
 	var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
 	jsonpArray.push = webpackJsonpCallback;
 	jsonpArray = jsonpArray.slice();
 	for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
 	var parentJsonpFunction = oldJsonpFunction;


 	// add entry module to deferred list
 	deferredModules.push(["./pageA.js","commons~async1~async2~pageA","commons~pageA~pageB~pageC","vendor~pageA"]);
 	// run deferred modules when ready
 	return checkDeferredModules();
 })
/************************************************************************/
 ({

/***/ "./pageA.js":
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

    "use strict";
    eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var vendor1__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! vendor1 */ \"./node_modules/vendor1.js\");\n/* harmony import */ var _utility1__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utility1 */ \"./utility1.js\");\n/* harmony import */ var _utility2__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./utility2 */ \"./utility2.js\");\n\n\n\n\nconsole.log('init');\n\n\n/* harmony default export */ __webpack_exports__[\"default\"] = (()=>{\n    //懒加载\n    // import('./async1');\n    // import('./async2');\n    const aa = new _utility1__WEBPACK_IMPORTED_MODULE_1__[\"default\"]();\n    console.log(\"aa\", aa)\n    console.log('pageA');\n});\n\n\n//# sourceURL=webpack:///./pageA.js?");
    
    /***/ })
    
     });
```

拿到代码先不要从上往下直接读，这样会陷入代码的汪洋大海，先理一个脉络出来，理出主要的几个方法和步骤，整个文件结构大致如下

- 最外层的IIFE，接受一个对象，key是模块名，value是一个模块函数

- IIFE中定义了几个方法和对象，对象包括

  1. `installedModules` 用来缓存加载过的模块module
  2. `installedChunks` 用来标记一个chunk是否被加载（仅标示状态）
  3. `deferredModules` 用来表示当前模块下，需要一起加载的模块
  4. 传入的对象`modules`，可以看做是一个module的对象集合，结构如`{'./pageA': function(){...}}`

  方法包括

  1. `webpackJsonpCallback` 当chunk被加载后的回调
  2. `checkDeferredModules` 检查是否加载完成
  3. `__webpack_require__` 以及一系列方法，用来模拟模块引入

> Module 和 Chunk的区别：
>
> module是模块单位，基本就是一个文件就是一个module，算是一个抽象概念
>
> chunk是打包单位，一个chunk可以对应多个module，就是一个实际的打包文件，具体怎么分chunk要看webpack的配置策略
>
> 最终运行时要的是module不是chunk，chunk只是用来承载内容

接下来逐个解析

### 非入口chunk打包代码

每一个chunk主体都是一个函数，接受三个参数（module, \__webpack_exports__, \__webpack_require__)， 调用这个函数时就是把eval中的内容载入到exports的过程

```javascript
// 这里是utility1的打包代码，实际就是一个push操作，把模块内容push到window.webpackJsonp中
// 结构大致是
// [['chunckId'], { chunk content }]
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["commons~async1~async2~pageA"],{

/***/ "./utility1.js":
/*!*********************!*\
  !*** ./utility1.js ***!
  \*********************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
 // 这里用eval， 因为在这里上下文没有__webpack_require__这个东西。只有在entry加载后才有
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _utility2__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./utility2 */ \"./utility2.js\");\n\n\n/* harmony default export */ __webpack_exports__[\"default\"] = (()=>{\n    console.log('utility1');\n});\n\n//# sourceURL=webpack:///./utility1.js?");

/***/ })

}]);
```



### 主流程代码

```javascript
// 抛开定义，实际代码从142行开始运行

// 当运行到这步时，window["webpackJsonp"]已经被填上值了，里面的值就是需要被同步加载的模块列表， 什么时候填的看后面解析
 	var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
 	var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
// 覆盖了数组原本的push方法，变成每次push实际调的都是webpackJsonpCallback，这是为了将来有模块要加载都能通过webpackJsonpCallback，而下面的遍历仅作用于页面的第一次加载
 	jsonpArray.push = webpackJsonpCallback;
 	jsonpArray = jsonpArray.slice();
// 遍历jsonpArray，然后就到了webpackJsonpCallback的逻辑
 	for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
 	var parentJsonpFunction = oldJsonpFunction;


 	// add entry module to deferred list
// 当前入口文件需要同步加载的chunk列表
 	deferredModules.push(["./pageA.js","commons~async1~async2~pageA","commons~pageA~pageB~pageC","vendor~pageA"]);
 	// run deferred modules when ready
// 检查是否全部加载完成，然后返回结果
 	return checkDeferredModules();
```

### webpackJsonpCallback

```javascript
 	// install a JSONP callback for chunk loading
 	function webpackJsonpCallback(data) {
    // data的结构上面提过 [['chunckId'], { chunk content }]
    // content可能有多个值 
    // { ./utility2.js: ƒ (module, __webpack_exports__, __webpack_require__)
		//	./utility3.js: ƒ (module, __webpack_exports__, __webpack_require__) }
 		var chunkIds = data[0];
 		var moreModules = data[1];
 		var executeModules = data[2]; // 暂时没找到这个场景

 		// add "moreModules" to the modules object,
 		// then flag all "chunkIds" as loaded and fire callback
 		var moduleId, chunkId, i = 0, resolves = [];
 		for(;i < chunkIds.length; i++) {
 			chunkId = chunkIds[i];
      // 检查installedChunks里有没有这个chunkId, 有的话直接放进resolve中
 			if(Object.prototype.hasOwnProperty.call(installedChunks, chunkId) && installedChunks[chunkId]) {
 				resolves.push(installedChunks[chunkId][0]);
 			}
      // 标0表示此chunkId已经被加载过了
 			installedChunks[chunkId] = 0;
 		}
    // 遍历chunk中的content
 		for(moduleId in moreModules) {
 			if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
        // 把content加入到传入参数modules中
 				modules[moduleId] = moreModules[moduleId];
 			}
 		}
    // TODO
 		if(parentJsonpFunction) parentJsonpFunction(data);

 		while(resolves.length) {
 			resolves.shift()();
 		}

 		// add entry modules from loaded chunk to deferred list
 		deferredModules.push.apply(deferredModules, executeModules || []);

 		// run deferred modules when all chunks ready
    // 返回checkDeferredModules的结果
 		return checkDeferredModules();
 	};
```

### checkDeferredModules

```javascript
 	function checkDeferredModules() {
 		var result;
    // 如果deferredModules为空代表当前加载的chunk是没有需要同步加载chunk
    // 比如主入口文件就肯定有deferredModules列表
 		for(var i = 0; i < deferredModules.length; i++) {
 			var deferredModule = deferredModules[i];
 			var fulfilled = true;
 			for(var j = 1; j < deferredModule.length; j++) {
 				var depId = deferredModule[j];
        // 如果有任何一个需要同步加载的chunk还没加载，fulfilled就是false
 				if(installedChunks[depId] !== 0) fulfilled = false;
 			}
 			if(fulfilled) {
        // 只有fulfilled才会有result，deferredModules - 1
 				deferredModules.splice(i--, 1);
        // 到了这一步只是确定所有必须加载的chunk文件都加载完成了，并没有真的开始连接各个模块
 				result = __webpack_require__(__webpack_require__.s = deferredModule[0]);
 			}
 		}
		// 只要result不为空，那么一个模块就加载完成了
 		return result;
 	}
```

### \__webpack_require__

```javascript
 	// The require function
// __webpack_require__ 模拟真正的require， 最后返回的module.exports就是具体的模块
// moduleId就是真实的模块名，比如./pages/index.js
 	function __webpack_require__(moduleId) {

 		// Check if module is in cache
    // 检查是否在缓存中，在的话直接返回
 		if(installedModules[moduleId]) {
 			return installedModules[moduleId].exports;
 		}
 		// Create a new module (and put it into the cache)
    // 定义这个模块并放入缓存
 		var module = installedModules[moduleId] = {
 			i: moduleId, // id
 			l: false, // isLoaded
 			exports: {}
 		};

 		// Execute the module function
    // 这里调用了module的content function， 这里开始正式加载模块
 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

 		// Flag the module as loaded
 		module.l = true;

 		// Return the exports of the module
    // 走到这里module就是一个有导出的对象了
 		return module.exports;
 	}
```

## 加入异步加载

```javascript
import vendor1 from 'vendor1';
import utility1 from './utility1';
import utility2 from './utility2';

console.log('init');

setTimeout(() => {
    //懒加载
    import('./async1');
    import('./async2');
}, 100)

export default ()=>{
    console.log('pageA');
}
```

async1和async2打包出来的文件和普通chunk没有任何区别，区别在于pageA多了一段requireEnsure的代码

首先看下async1在Page的content中是什么样子，看起来是一个promise， 加载完成之后再去require

```javascript
__webpack_require__.e(/*! import() */ 0).then(__webpack_require__.bind(null, /*! ./async1 */ "./async1.js"));
```

```javascript
 	// This file contains only the entry chunk.
 	// The chunk loading function for additional chunks
	// 这里就是.e的实现
 	__webpack_require__.e = function requireEnsure(chunkId) {
 		var promises = [];


 		// JSONP chunk loading for javascript
		// 第一步还是检查缓存，加载过的chunk不会重复加载
 		var installedChunkData = installedChunks[chunkId];
 		if(installedChunkData !== 0) { // 0 means "already installed".

 			// a Promise means "currently loading".
      // 处理可能多处同时加载一个chunk的情况
 			if(installedChunkData) {
 				promises.push(installedChunkData[2]);
 			} else {
 				// setup Promise in chunk cache
 				var promise = new Promise(function(resolve, reject) {
 					installedChunkData = installedChunks[chunkId] = [resolve, reject];
 				});
 				promises.push(installedChunkData[2] = promise);

 				// start chunk loading
        // 真正的jsonp开始
 				var script = document.createElement('script');
 				var onScriptComplete;

 				script.charset = 'utf-8';
 				script.timeout = 120;
 				if (__webpack_require__.nc) {
 					script.setAttribute("nonce", __webpack_require__.nc);
 				}
        // 拼出src
 				script.src = jsonpScriptSrc(chunkId);

 				// create error before stack unwound to get useful stacktrace later
 				var error = new Error();
 				onScriptComplete = function (event) {
 					// avoid mem leaks in IE.
 					script.onerror = script.onload = null;
 					clearTimeout(timeout);
 					var chunk = installedChunks[chunkId];
 					if(chunk !== 0) {
 						if(chunk) {
 							var errorType = event && (event.type === 'load' ? 'missing' : event.type);
 							var realSrc = event && event.target && event.target.src;
 							error.message = 'Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
 							error.name = 'ChunkLoadError';
 							error.type = errorType;
 							error.request = realSrc;
 							chunk[1](error);
 						}
 						installedChunks[chunkId] = undefined;
 					}
 				};
        // 载入超时默认2分钟
 				var timeout = setTimeout(function(){
 					onScriptComplete({ type: 'timeout', target: script });
 				}, 120000);
 				script.onerror = script.onload = onScriptComplete;
 				document.head.appendChild(script);
 			}
 		}
    // 这里返回之后, pageA里面的then就可以通过require来引入这个chunk（跟普通chunk一样）
 		return Promise.all(promises);
 	};
```




## 回答问题

1. Babel-loader编译完成是CommonJS，不编译的话是ESModule，而浏览器不会识别CommonJS，也可能不支持ESModule，最终是如何让浏览器支持模块化的？
   这里最终引入pageA的utility1模块，是一个相当于用\__webpack_require__引入的具体模块对象，这就有点像在浏览器端实现了一套CommonJS的规范，所以可以直接使用

   

   <img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200616190334070.png" alt="image-20200616190334070" style="zoom:80%;" />

    ```javascript
      // 在最终导出的pageA中所引用的utility1.js在浏览器环境下实际就是这个实现
      var _utility1__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utility1 */ \"./utility1.js\");
    ```

2. import了模块，但是实际代码没有调用会不会被打包进去？

   在实际打包中，即使没有使用，但是import关键字会把引入的模块纳入到chunk中，所以代码依然会被打包

3. require和import是不是可以混写？为什么
   可以混写，因为编译完之后都是CommonJS

4. 如何实现异步加载模块？
   jsonp

5. 加载过的模块如何做到不重复加载？
   因为有chunk的缓存