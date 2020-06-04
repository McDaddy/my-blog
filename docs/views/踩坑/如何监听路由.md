---
title: React Router v5 useLocation hook 无法在子组件mount前触发更新的问题
date: 2020-05-01
tags:
 - React Router
 - React Hooks
categories:
 - React
---

React Router v5中提供了可以监听location变化的`useLocation` hook，本意是想将其放置在这个容器的顶端（page-container组件）中，然后在effect的回调中去更新路由相关的store info，但事实上除了初次加载外，所有的路由变化都无法第一时间反应到组件上。

<!-- more -->

具体查找原因，在经过测试之后发现，useLocation的更新是发生在切换路由，新组件的mount之后，导致新组件在mount时会拿到过期的路由参数。

## 原始重构方案

![Jvq6cF.png](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/Jvq6cF.png)

## 问题分析

除了首次加载页面以外，每次路由变化，第一步都会引起旧组件的卸载和新组件的加载，个人猜测是在v16中子组件mount的优先级是高于父组件effect的优先级的，所以每次路由变化都是先mount子组件然后再执行父组件里面location监听hook。 在代码中如果父子同时使用useLocation来监听路由，那么子会在父前触发。

![JvqW7R.png](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/JvqW7R.png)

那么现在的问题就是如何抢在子组件加载前去更新routeInfoStore。解决思路：

1. 在每个需要监听路由参数的子组件上添加useLocation，这样可以保证mount时一定拿到正确的参数，但这样的改动太大，重复代码太多。

2. 想办法跳过组件生命周期去监听路由，真正做到实时触发routeInfoStore的更新

## 解决方案

方案的核心就是通过重写window.history的pushState和replaceState方法 具体方法参考了 [链接](https://juejin.im/post/5e85cb8151882573c66cf63f?utm_source=gold_browser_extension#heading-11)

```javascript
// 创建全局事件
const _wr = function (type: string) {
  const orig = window.history[type];
  return function () {
    const rv = orig.apply(this, arguments);
    const e = new Event(type);
    window.dispatchEvent(e);
    return rv;
  };
};
// 重写方法
window.history.pushState = _wr('pushState');
window.history.replaceState = _wr('replaceState');
// 实现监听
window.addEventListener('replaceState', () => {
 setRouteInfo();
});
window.addEventListener('pushState', () => {
 setRouteInfo();
});
window.addEventListener('popstate', function() {
 setRouteInfo();
});
```

由于路由变化的本质就是通过这两个API，所以只要能够监听这两个方法的触发时机那么就可以做到实时更新路由信息。 当然这样仅适用于路由变化， 当首次加载时还是需要在page-container的onMount上加上setRouteInfo做一个初始化。目前经过测试暂时没有发现问题。

问题后续1. 为什么react-redux-router可以做到先于mount，是不是类似的方法。2. 父子组件调用hooks的顺序关系还不明确需要后续学习。

## 注意

`window.location.reload()`是不会触发 `replaceState/pushState`这两个API或者`popstate`这个事件的，所以当刷新页面时要拿到路由参数必须在应用顶层**mount结束**后主动触发一次路由初始化

## 参考

[阿里P7：你了解路由吗？](https://juejin.im/post/5e85cb8151882573c66cf63f?utm_source=gold_browser_extension#heading-11)