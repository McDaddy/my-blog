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

babel内置的解析引擎叫**Babylon**

目前主流用的Babel是版本7或者8

## @babel/core

babel的核心工作流程分为3个阶段：

- 解析（parsing）由`@babel/parser` 完成，里面就是用了Babylon这个解析引擎，把代码转成ast

- 转换（transforming）

- 生成（generating）由`@babel/generator`完成，将ast重新变回源代码

`@babel/core`是babel的核心包，包含了上面说的两个子包。它自身不带任何转换功能，它的转换功能是依托插件实现的，所以如果仅仅拿@babel/core来处理代码，那么输入和输出是基本一样的。

