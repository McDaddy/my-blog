---
title: 【笔记】- 微前端初探 Single-SPA
date: 2020-05-07
tags:
 - 微前端
categories:
 - 笔记
---



## Single-SPA的接入API

Single-SPA提供了两个主要的API用来接入子应用

1. `registerApplication`， 用来注册和预加载子应用，参数为一个app对像的4个部分。这被称为协议接入
   1. app name
   2. load function 加载app的方法，必须是promise，要返回一个对象里面有三个属性分别是`bootstrap`, `mount`, `unmount`，而这三个属性也都是返回promise的方法。bootstrap一般涉及资源的加载，mount和unmount主要就是渲染的生命周期
   3. 匹配路由，即表示在什么路由条件下需要被激活加载
   4. custom Props， 从父应用传入props，实现父子的通信
2. `start`，用来启动和挂载应用



## 子应用的生命周期

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200811001211024.png" alt="image-20200811001211024" style="zoom:80%;" />

分成图中12种状态

- 当页面载入并调用`registerApplication`，去注册一个app
- 初始状态下为`NOT_LOADED`
- 在注册中去加载app相关的资源，目的是拿到app的三个生命周期方法bootstrap/mount/unmount，然后挂载到app实例上，此时进入`LOADING_RESOURCE_CODE`，结束时变成`NOT_BOOTSTRAPPED`，表示**预加载**完成，但还没启动，更没有挂载。
- 此时，会检查当前的`window.location`的位置，判断出此时需要启动什么应用，挂载什么应用，卸载什么应用。
  - 如果之前已经是`MOUNTED`，当前路由不匹配，那么就要归入需要被卸载的应用
  - 如果此时路由与app匹配，如果状态是`NOT_BOOTSTRAPPED`或者`NOT_MOUNTED`，那么将归入需要挂载的应用
  - 如果此时路由与app匹配，如果状态是`NOT_LOADED`，那么就要归入需要启动的应用。
- 挂载一个应用的实际过程就是依次调用`bootstrap`和`mount`方法，然后状态变成`MOUNTED`，一般来说mount方法会返回渲染好的子模块，然后挂载到父应用上。卸载一个应用就是调用它的`unmount`方法，然后又变成`NOT_MOUNTED`
- 当切换路由时，需要劫持路由，走一遍上面的检查过程，来按需加载卸载



## 几个细节技术点

**因为载入函数是可以写成方法数组的，即真正载入时，需要依次执行数组中的async方法，如何做到将这个方法数组组合成一个顺序执行的方法？**

```javascript
function flattenFnArray(fns) {
  fns = Array.isArray(fns) ? fns : [fns];
  return function (props) {
    return fns.reduce((p, fn) => p.then(() => fn(props)), Promise.resolve());
  };
}

flattenFnArray([
  async () => {},
  async () => {},
])
```

用一个`reduce`方法，用Promise.resolve()产生一个promise作为初始值。然后遍历数组，每次都将前面的结果promise.then(() => 新的函数)，然后直接返回。这样就做到了一个链式的调用。



**载入app的方法可能会被两个方法接近同时调用，此时如果都执行的话就会有重复执行的情况。解决方法是加入一个缓存机制**

```javascript
export async function toLoadPromise(app) {
  if (app.loadingPromise) {
    return app.loadingPromise; // 缓存机制
  }

  return (app.loadingPromise = Promise.resolve().then(async () => {
    app.status = LOADING_SOURCE_CODE;

    let { bootstrap, mount, unmount } = await app.loadApp(app.customProps);
    app.status = NOT_BOOTSTRAPPED;

    // bootstrap可能是数组，需要compose 拍平
    app.bootstrap = flattenFnArray(bootstrap);
    app.mount = flattenFnArray(mount);
    app.unmount = flattenFnArray(unmount);

    delete app.loadingPromise;
    return app;
  }));
}
```

这个方法本身就是一个async方法，最终返回一个promise。 传入的app是个引用，所以两个方法同时调，传入的是同一个对象。给app加上一个loading的属性，用Promise.resolve包一下原始的方法，然后赋给loading属性，并返回这个promise， 当promise执行完成后又将loading属性delete掉，非常巧妙。



**如何劫持路由**

```javascript
function patchedUpdateState(updateState, methodName) {
    return function () {
        const urlBefore = window.location.href;
        updateState.apply(this, arguments); 
        const urlAfter = window.location.href;

        if (urlBefore !== urlAfter) {
            urlReroute(new PopStateEvent('popstate'))
        }
    }
    
}

window.history.pushState = patchedUpdateState(window.history.pushState, 'pushState')
window.history.replaceState = patchedUpdateState(window.history.replaceState, 'replaceState')
```

