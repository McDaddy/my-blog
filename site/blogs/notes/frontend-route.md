---
title: 【笔记】- 前端路由总结
date: 2020-05-25
tags:
 - React Router
categories:
 - 笔记

---

## 前端路由的产生背景

在前端路由产生之前，所有的页面路由都是服务端路由，都由服务端控制

客⼾端 -> http 请求 -> 服务端 -> 根据 url 路径的不同，返回不同的 html/数据 

优点： 首屏渲染快，SEO好
缺点： 服务器压力大，静态请求也要占用大量服务器资源。 前后端容易耦合，不易协作

Ajax的出现，实现了从服务器下载静态模板，然后异步请求数据的模式，做到了不刷新页面请求数据（从前都是需要通过页面跳转来通知服务端拿数据）

SPA的出现，不仅页面中的操作不需要刷新，跳转路由也不需要刷新。而支持这种特性的就是前端路由

<!-- more -->

## Hash的原理和实现

Hash路由的几个特性

1. Hash路由特点就是带上`#`，而井号后面的内容是不能传递到服务端的
2. Hash值的改变是不会刷新页面的
3. Hash值的改变是会在浏览器的历史记录中添加记录的，所以可以前进后退等操作
4. Hash的改变会触发`hashchange`事件

有两种方式改变

1. 通过a标签的href属性点击跳转
2. 通过js， `location.hash = test`

实现一个简单的Hash路由，总体而言分三步

1. 注册路由地址的回调
2. 在load和hashchange事件上绑定执行回调的方法
3. 当事件触发时，找到初始化时注册的那个回调，然后执行

```javascript
class BaseRouter { 
  constructor() { 
    this.routes = {}; // 保存注册路由的对象
    this.currentUrl = ""; 
    this.refresh = this.refresh.bind(this);
    window.addEventListener("load", this.refresh, false); // 初始化
    window.addEventListener("hashchange", this.refresh, false); // hash变化时 都要触发回调
  }
  
  route(path, callback) {
    // 注册路由
    this.routes[path] = callback || function () {}; 
  }
  
  refresh() {
    console.log("触发⼀次 hashchange，hash 值为", location.hash); 
    this.currentUrl = `/${location.hash.slice(1) || ""}`; 
    // 找出当前url对应的路由回调，然后执行
    this.routes[this.currentUrl](); 
  } 
}

const Router = new BaseRouter(); 
Router.route("/", function () { changeBgColor("white"); });
```

## History路由的原理和实现

因为H5的出现，history api的加入使得History路由成为可能

主要有5个API

> window.history.back(); // 后退 
>
> window.history.forward(); // 前进 
>
> window.history.go(-3); // 后退三个⻚⾯ 
>
> window.history.pushState(null, null, path);  // 会增加历史记录
>
> window.history.replaceState(null, null, path);  // 会直接替换当前历史记录
>
> 两个函数的三个参数相同
>
> 1. 指定这个路由的state对象，当popstate的时候有用，否则回退时是拿不到路由信息的
> 2. 新页面的title，直接设null
> 3. 新的路径，可以是绝对和相对路径

History路由的几个特点

1. `pushState`和`replaceState`<u>不会</u>触发`popstate`事件，需要手动得去重新渲染
2. 除此之外都可以通过监听`popstate`事件来监听路由变化
3. 只有通过点击浏览器前进后退或使用前三个API才会触发popstate

实现一个简单的History路由

```javascript
class BaseRouter { 
  constructor() { 
    this.routes = {}; 
    this._bindPopState(); 
    this.init(location.pathname); 
  }
  
  init(path) { 
    history.replaceState( { path: path, },null, path );
    this.routes[path] && this.routes[path](); 
  }
  
  route(path, callback) {
    // 注册路由 同hash
    this.routes[path] = callback || function () {}; 
  }
  
  go(path) { 
    // 使用pushState主动渲染回调
    history.pushState( { path: path, },null, path );
    this.routes[path] && this.routes[path](); 
  }
  
  _bindPopState() { 
    // 监听popstate 然后调用渲染回调
    window.addEventListener("popstate", (e) => { 
      const path = e.state && e.state.path; 
      console.log(path); 
      this.routes[path] && this.routes[path](); 
    }); 
  } 
}

const Router = new BaseRouter();
```

