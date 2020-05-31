---
title: 嵌套组件 - 隐藏显示引起 Hooks 报错问题
date: 2020-05-28
tags:
 - React Fiber
categories:
 - React
sidebar: false
---

问题背景： 当在一个用了hook的父组件里面嵌套多个带hook的子组件时， 如果子组件会根据条件隐藏显示，且使用函数的渲染子组件方式就会发生如下错误。

<!-- more -->

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/1588161949960-6defff68-6991-4a3a-ba4e-ddf1e8615cc1.png" alt="img" style="zoom:50%;" />![img](https://intranetproxy.alipay.com/skylark/lark/0/2020/png/170125/1588161964698-7887c08b-592e-459e-90cc-6d87a68b464b.png#alt=undefined)

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/1588161964698-7887c08b-592e-459e-90cc-6d87a68b464b.png" alt="img" style="zoom:50%;" />

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/1588161989961-0278ea3a-3335-45ff-a7d4-cb273c20b9a9.png" alt="img" style="zoom:50%;" />

这个问题的原因是当使用函数方式渲染子组件是， 就相当于把子组件的函数内容control c + v在父组件内，因为React Hooks是严格要求类型和顺序一致的，所以当切换子组件时，子组件内部的hook就相当于改变了父组件的hooks顺序和类型。

##### 解决方法

使用Component的渲染方法，因为当用组件形式渲染时，hooks会被限制在组件instance范围内而不会跑出来污染父组件

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/1588162012694-c414d994-beef-43f2-b052-ed0d7ad4fc24.png" alt="img" style="zoom:50%;" />

[参考](https://kentcdodds.com/blog/dont-call-a-react-function-component)