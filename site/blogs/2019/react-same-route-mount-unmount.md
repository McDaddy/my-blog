---
title: React在条件渲染下切换生命周期的问题
date: 2020-04-27
tags:
 - React Router
categories:
 - React
sidebar: false
---

这是一个老生常谈但总是容易忽略的问题，在两种场景下：

- 当多个相同路由使用的是同一个组件，当这些路由相互间切换时，默认情况下，*react-router* 会重用这个组件，也就是说不会卸载, 但当某些特殊情况，比如Component加了Key时，还是会触发卸载和重新加载。
- 在同一父组件下，条件渲染两个或同一个公用一个公共属性(store值)的子组件。

如果此时在组件的unmount生命周期中, 调用了一个不能立即完成的方法， 那么上一个组件的unmount是无法保证在下一个组件的mount前执行。

对于这点React做出了解释， 在v16中，事件是有优先级的，显然mount事件是优先于unmount事件的，所以unmount在mount后执行就可以理解了。

遇到这种情况一般都是为了清除或重置公共变量，两个策略来解决：

1. 把unmount的内容移到mount中。
2. 为每个组件单独设置一份属性，可以通过id区分

![Alt text](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/life1.png)

![Alt text](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/life2.png)