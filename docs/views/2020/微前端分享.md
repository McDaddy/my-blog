---
title: 什么是微前端
date: 2020-09-25
tags:
 - 微前端
categories:
 - 前端工程化

---

## 什么是微前端

> Techniques, strategies and recipes for building a **modern web app** with **multiple teams** that can **ship features independently**. -- [Micro Frontends](https://micro-frontends.org/)
>
> 微前端是一种多个团队通过独立发布功能的方式来共同构建现代化 web 应用的技术手段及方法策略。

## 微前端的核心价值

- 技术栈无关
  主框架不限制接入应用的技术栈，微应用具备完全自主权
- 独立开发、独立部署
  微应用仓库独立，前后端可独立开发，部署完成后主框架自动完成同步更新
- 增量升级
  在面对各种复杂场景时，我们通常很难对一个已经存在的系统做全量的技术栈升级或重构，而微前端是一种非常好的实施渐进式重构的手段和策略
- 明晰项目模块的边界
- 减少维护代码量的成本 — 基于高内聚低耦合的原则

<!-- more -->



## 微前端在组织架构的意义

> Micro Frontends背后的想法是将网站或Web应用视为独立团队拥有的功能组合。 每个团队都有一个独特的业务或任务领域，做他们关注和专注的事情。团队是跨职能的，从数据库到用户界面开发端到端的功能。（[micro-frontends.org](https://link.zhihu.com/?target=https%3A//micro-frontends.org/)）

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200924152934174.png" alt="image-20200924152934174" style="zoom: 60%;" />

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200924153001498.png" alt="image-20200924153001498" style="zoom: 33%;" />



## Iframe为什么不行

- 刷新页面无法维持路由
- 前进后退按钮无效
- 无法与主应用实时通信
- 数据无法共享比如cookie

## npm包实现的微前端有哪些弊端

- 加大了宿主的体积，增加了宿主的编译打包时间
- 在打包中如果出现error会终止整个应用的打包
- 在运行中有引起全局崩溃的风险
- CSS无法做到样式隔离
- 没有JS的安全沙箱机制
- 发布不灵活，发布步骤多，宿主需要频繁更新package.json
- 版本太多，杂乱不易管理
- 无法独立发布运维（可以独立运行，但无法跟主应用集成）
- 无法跨技术栈，本质还是代码的复制粘贴

## Single-SPA

- 支持跨技术栈
- 子应用独立部署运维
- 按需加载子应用

## Qiankun

- 基于Single-SPA
- 样式隔离  确保微应用之间样式互相不干扰
- JS沙箱  确保微应用之间 全局变量/事件 不冲突
- 资源预加载  在浏览器空闲时间预加载未打开的微应用资源，加速微应用打开速度

## 微前端框架需要解决的问题

- 如何在主应用上加载子应用
- 如何做到JS的安全沙箱
- 如何做到CSS样式隔离
- 如何做到路由保持及子应用根据路由按需加载
- 主应用如何与子应用通信
- 如何预加载子应用

## 协议接入

父子应用间必须要有约定好的对接方式，通信方式，所有的子应用都要遵守这个规则来导出自己。

- 子应用必须导出成一个UMD形式的js入口文件，然后里面需要包含三个生命周期函数
  - bootstrap 用于加载资源时使用
  - mount  核心 用于子应用如何载入
  - unmount  当子应用被卸载时调用
- 独立部署  例如部署在一个nginx容器中，需要有一个HTML来加载导出的UMD
- 主应用通过访问子应用部署的入口文件，将子应用载入自身的DOM节点中
- 子应用要解决跨域问题
- 主应用和子应用通过传递props来通信

![img](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/lifecycle.fb2af586.png)



## 路由劫持

微前端框架的路由劫持相较其他路由框架的路由劫持，最大的区别就是他要保证他的劫持方法优先执行

```javascript
export const routingEventsListeningTo = ["hashchange", "popstate"];

function urlReroute() {
  // process change route logic
}

const capturedEventListeners = {
  hashchange: [],
  popstate: [],
};

window.addEventListener("hashchange", urlReroute);
window.addEventListener("popstate", urlReroute);

const originalAddEventListener = window.addEventListener;
const originalRemoveEventListener = window.removeEventListener;

// 用户自己的路由事件会被覆盖，所以必须把之前的事件方法重新执行
window.addEventListener = function (eventName, fn) {
  if (
    routingEventsListeningTo.indexOf(eventName) > 0 &&
    !capturedEventListeners[eventName].some((l) => l == fn)
  ) {
    capturedEventListeners[eventName].push(fn);
    return;
  }
  return originalAddEventListener.apply(this, arguments);
};
window.removeEventListener = function (eventName, fn) {
  if (routingEventsListeningTo.indexOf(eventName) > 0) {
    capturedEventListeners[eventName] = capturedEventListeners[
      eventName
    ].filter((l) => l !== fn);
    return;
  }
  return originalRemoveEventListener.apply(this, arguments);
};

function patchedUpdateState(updateState, methodName) {
  return function () {
    const urlBefore = window.location.href;
    updateState.apply(this, arguments);
    const urlAfter = window.location.href;

    if (urlBefore !== urlAfter) {
      urlReroute(new PopStateEvent("popstate"));
    }
  };
}

window.history.pushState = patchedUpdateState(
  window.history.pushState,
  "pushState"
);
window.history.replaceState = patchedUpdateState(
  window.history.replaceState,
  "replaceState"
);

// 在子应用加载完毕后调用此方法，执行拦截的逻辑（保证子应用加载完后执行）
export function callCapturedEventListeners(eventArguments) {
  if (eventArguments) {
    const eventType = eventArguments[0].type;
    if (routingEventsListeningTo.indexOf(eventType) >= 0) {
      capturedEventListeners[eventType].forEach((listener) => {
        listener.apply(this, eventArguments);
      });
    }
  }
}
```



## JS沙箱

![image-20200924155949626](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200924155949626.png)

### 快照沙箱

1. 激活时将当前window属性进行快照处理

2. 失活时用快照中的内容和当前window属性比对

3. 如果属性发生变化保存到`modifyPropsMap`中，并用快照还原window属性

4. 在次激活时，再次进行快照，并用上次修改的结果还原window

缺点是无法支持多实例同时存在

```javascript
class SnapshotSandbox {
  constructor(target) {
    this.proxy = target;
    this.modifyPropsMap = {}; // 修改了那些属性
    this.active();
  }
  active() {
    this.targetSnapshot = {}; // window对象的快照
    for (const prop in this.proxy) {
      if (this.proxy.hasOwnProperty(prop)) {
        // 将target上的属性进行拍照
        this.targetSnapshot[prop] = this.proxy[prop];
      }
    }
    Reflect.ownKeys(this.modifyPropsMap).forEach((p) => {
        this.proxy[p] = this.modifyPropsMap[p];
    });
  }
  inactive() {
    for (const prop in this.proxy) {
      // diff 差异
      if (this.proxy.hasOwnProperty(prop)) {
        // 将上次拍照的结果和本次target属性做对比
        if (this.proxy[prop] !== this.targetSnapshot[prop]) {
          // 保存修改后的结果
          this.modifyPropsMap[prop] = this.proxy[prop];
          // 还原target
          this.proxy[prop] = this.targetSnapshot[prop];
        }
      }
    }
  }
}
```

### Proxy沙箱

每个应用都创建一个proxy来代理window，好处是每个应用都是相对独立，不需要直接更改全局window属性

```javascript
class ProxySandbox {
  constructor(target) {
    const rawTarget = target;
    const fakeTarget = {};
    const proxy = new Proxy(fakeTarget, {
      set(t, p, value) {
        t[p] = value;
        return true;
      },
      get(t, p) {
        return t[p] || rawTarget[p];
      },
    });
    this.proxy = proxy;
  }
}
```

## 样式隔离

- `BEM`(Block Element Modifier) 约定项目前缀
- `CSS-Modules` 打包时生成不冲突的选择器名
- `css-in-js`
- scoped css 利用属性选择器来做隔离

### shadow dom

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200924165010933.png" alt="image-20200924165010933" style="zoom:80%;" />

```html
<style>
  p {
    color: green;
  }
  #same-id {
    font-size: 24px;
  }
</style>

<div id="shadow"></div>
<p id="same-id">我不是shadow dom</p>

<script>
  let shadowDom = shadow.attachShadow({ mode: "open" });

  let pElement = document.createElement("p");
  pElement.id = 'same-id'
  pElement.innerHTML = "我是shadow dom";

  let styleElement = document.createElement("style");
  styleElement.textContent = `p { color: blue } #same-id { font-size: 36px }`;
  shadowDom.appendChild(pElement);
  shadowDom.appendChild(styleElement);
</script>
```

## 资源预加载

核心方法： `requestIdleCallback`

```javascript
function prefetch(entry: Entry, opts?: ImportEntryOpts): void {
  if (!navigator.onLine || isSlowNetwork) {
    // Don't prefetch if in a slow network or offline
    return;
  }

  requestIdleCallback(async () => {
    const { getExternalScripts, getExternalStyleSheets } = await importEntry(entry, opts);
    requestIdleCallback(getExternalStyleSheets);
    requestIdleCallback(getExternalScripts);
  });
}
```



## Qiankun微前端的不足

- 暂时无法复用common模块
- 依赖会被重复打包，导致加载速度不如以前（目前的解决方法是利用`prefetchApps`api，在主应用加载时做预加载）

## What’s next？

- SSR？
- Webpack 5 Module Federation?
- common模块cdn化？
- 标品化 & 二开？
- dice 主应用faas化？

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200925104337246.png" alt="image-20200925104337246" style="zoom:67%;" />

## 参考文档

[了解什么是微前端](https://zhuanlan.zhihu.com/p/82965940)

[micro-frontends](https://micro-frontends.org/)

[说说JS中的沙箱](https://juejin.im/post/6844903954074058760)

[微前端能给前端应用带来什么](https://www.atatech.org//articles/181494/?flag_data_from=mail_daily_headline&uid=573797)