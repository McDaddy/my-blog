---
title: 【笔记】- React DOM Diff总结
date: 2021-02-16
tags:
 - React
categories:
 - 笔记


---

DOM diff的核心就是新旧`virtual dom`的属性对比，通过在内存中做数据对比而非直接操作DOM，提升了渲染的效率，直到最后对比完成再统一更新DOM。而diff算法就是如何高效得完成这个内存数据结构的对比。 如果没有diff算法对比完所有节点将花费O(n3)的复杂度。

<!-- more -->

## 前置知识

`vdom` - `virtual dom`即虚拟dom节点，其中包括几个主要属性

1. `type` -  表示节点类型，主要分三种，1. 纯文字节点  2. 原生tag 如`div`  3. 自定义的组件， 其中又分函数组件和类组件
2. `props` - 表示传入的props
3. `children` - 表示此节点的子节点集合

`renderVdom` - 指的是执行过`render`或函数组件函数返回的vdom，这个vdom和上面的区别是，它指代一个自定义组件执行完渲染函数之后的vdom

## 前置方法

`findDOM` - 通过vdom来找到当前渲染的真实dom中对应于这个vdom的真实dom节点

`createDOM` - 通过传入一个vdom和父真实节点，创建出一个真实的dom节点

## 流程总结

1. 从根节点开始，传入一个`compare`函数，接受4个参数，分别是父挂载点的dom（`parentDOM`），旧的`vdom`，新的`vdom`以及旧节点的下一个兄弟DOM节点`nextDOM`（真实可能不存在），而这个函数将被递归执行

2. 考虑新旧对比节点的**5**种情况
   1. 新旧节点都为空，啥都不需要做
   2. 新为空，旧不为空，表示此节点需要被移除，通过`findDOM`找到此节点的真实dom，然后调用`parent.removeChild`来删除这个节点，同时调用节点的`componentWillUnmount`
   3. 新不为空，旧为空，表示此节点是新增的，通过`createDOM`来创建真实的dom节点，如果`nextDOM`存在，调用`parent.insertBefore`来插入到`nextDOM`之前，否则，调用`parentDOM.appendChild`来添加这个子节点。同时调用新节点的`componentDidMount`
   4. 两者都不为空，但是`type`不同，即节点需要被替换，通过findDOM找到老的真实dom， 通过`createDOM`创建出新的节点。`parentDOM.replaceChild`替换节点，分别调用新旧节点的`componentDidMount`和`componentWillUnmount`
   5. 两者都不为空，且type相同，开始对比`props`和`children`
   
3. 在`type`相同的前提下，根据type不同类型，更新`props`分**3**种情况
   1. 如果是纯文本节点，直接替换`DOM.textContent`
   2. 原生`tag`， 更新props，也分**3**种情况
      1. `style`属性的更新，需要**逐一**更新到`dom.style`属性上
      2. `on`开头的事件属性，如 `onClick`，将事件注册到`document`上，做`合成事件`
      3. 普通属性，直接赋值
   3. 自定义组件，分**2**种情况
      1. 类组件
         1. 复用老vdom的`class instance`，不要重新创建。
         2. 调用`componentWillReceiveProps`
         3. 触发`classInstance`的`updater`的`emitUpdate`方法 （决定到底是批量更新还是立即更新）
         4. 执行`getDerivedStateFromProps`，通过`nextProps`得到新的`state`
         5. 执行更新 先执行`shouldComponentUpdate`
         6. 如果返回true， 执行`componentWillUpdate`
         7. 执行自定义的`render`方法，返回新的`renderVdom`
         8. 执行`getSnapshotBeforeUpdate`，计算一个更新前dom的计算结果，将来传给`componentDidUpdate`
         9. 将老的`renderVdom`和新的`renderVdom`做对比，此处递归返回流程的第一步
         10. 执行`componentDidUpdate`
      2. 函数组件
         1. 函数组件没有实例，重新执行函数得到新的`renderVdom`
         2. 将老的`renderVdom`和新的`renderVdom`做对比，此处递归返回流程的第一步
   
4. 对比`children`   [精读《DOM diff 原理详解》](https://juejin.cn/post/6947856296771223589)
   1. 如果就一个儿子，那么就直接将这个独子走一遍上面的流程
   
   2. 是一个列表，需要进行队列diff对比，核心是尽量得复用原有的节点，不额外销毁和新建节点
   
      1. 列表的每一项都需要一个key，否则这一步就不存在了
      2. React采用的是**仅右移策略**，即对元素发生的位置变化，只会将其移动到右边，那么右边移完了，其他位置也就有序了。
      3. Vue会采用一种双指针法
         1. 先从头部遍历，跳过未变化的点
         2. 从尾部开是遍历，跳过未变化的点，这个过程结束后，剩下的就是变化的点，如果首尾重合就是没有变化的列表
         3. 此时如果Old列表重合了，New没有，则是中间插入了新元素
         4. 如果Old没有重合，New重合了，就是删除了元素
         5. 此时剩下的都是变化的点，如Old为[c,d,e,f], New为[e,d,c,h]
         6. 创建一个Old的Map { c: 0, d: 1, e: 2, f: 3 } 后面的数字是index
         7. 遍历New, 如果Old中有New中没有，就删除。反之，如果Old中没有，New有，就标记新增
         8. 如果新旧都有，就取出Old中的index，得到一个新的Map { e:2, d: 1, c: 0, f: 999 }， 这样就知道了哪些点是可以复用的，接下来要做的就是移动位置
         9. 如何做到高效移动？找到一个**最长升序子序列**作为基准不动，剩下的元素按顺序插入这个列表，这样可以做到最少的插入次数
   
      

