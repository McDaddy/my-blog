---
title: React vs Vue 异同总结
date: 2020-06-01
tags:
 - React
categories:
 - React

---

最近开始学习Vue，个人感觉Vue需要记的概念更多，好处是使用`template`这种类似模板的开发方式，比较直观容易被传统前端理解，对于一个React熟练工来说，Vue的概念确实不大友好，比如说`v-for`， 看起来是帮开发者减少了代码量内置了一个实现组件循环的方式，但从理解代码的角度来说还不如React中写一个map循环来得直观。

这里我结合一篇掘金的文章和自己的理解大致总结下两者的异同

<!-- more -->

## 相同点

1. 都有Virtual DOM
2. 都是组件化的开发
3. 都是响应式（对状态的监听 Proxy或Object.defineProperties），单向数据流（自顶向下）

4. 热度高，社区成熟，支持SSR

### 通用流程

vue template/react jsx —> render函数 —> 生成VNode —> 数据变化时，新老VNode diff —> diff 算法对比，局部更新真实的DOM

总结起来还是 `(data) => UI`这个模型



## 不同点

### 核心思想不同

Vue早期定位是尽可能降低前端开发门槛的框架，主要特点是`数据可变，双向数据绑定（依赖收集）等`。 

**数据可变**是指Vue没有像React那样的setState的主动触发数据变化的api，而是由开发者直接修改数据，在`响应式框架`的基础上监听变化触发渲染。

**依赖收集**是指有一个观察者模式的实现， 比如类似`computed`和`watch`的API或者被动得利用`getter/setter`，通过依赖收集，开发者可以主动定义数据变化后的操作或者被动触发组件的重新渲染。

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/data.png" alt="data" style="zoom:50%;" />

React主要推崇函数式的编程（纯组件），`数据不可变`和单向数据流

**函数式编程**的最大好处是其稳定性（无副作用）和可测试性（输入相同，输出一定相同）。所以比较适合大型项目的开发

什么是**副作用**， 就是做了与本身function运算返回值无关的事情，比如修改全局变量，修改传入的参数，甚至console.log，以及ajax异步请求，修改DOM结构等等。

#### API 差异

Vue的API比较多，各种v-xxx的API，需要理解slot、filter等概念

React的API比较少，主要是理解了开发流程，API知道个setState就可以上手开发

#### 社区差异

对于主要的解决方案，如路由和状态管理等，Vue都是有官方解决方案，而React则是基本都是社区提供

#### 响应式的原理不同

Vue：依赖收集，数据可变，Vue自动递归监听data的所有属性，可以直接修改。数据改变时自动找到对应的组件重新渲染

React： 基于状态机，手动触发变化

*状态机*： 又称有限状态自动机，是表示有限个状态以及在这些状态之间的转移和动作等行为的数学模型。

> ```text
> 末状态 = 初状态 + 触发条件
> or
> nextState = oldState + action
> ```

[web 开发中无处不在的状态机](https://zhuanlan.zhihu.com/p/26524390)

#### diff算法不同

这个可以另起一篇来深入了解

#### 事件机制不同

Vue：

- 组件可以自定义事件，父子组件可以通过自定义事件来通信
- 原生事件是标准的web事件

React：

- 组件上无事件，父子组件只能通过props来通信
- 原生事件都是被包装的，所有事件都是冒泡到顶层document监听，然后在这里合成事件下发，所以React事件不是和Web DOM强绑定的



## 参考

[个人理解Vue和React区别](https://juejin.im/post/5ebbd9396fb9a0437b76ecdc)