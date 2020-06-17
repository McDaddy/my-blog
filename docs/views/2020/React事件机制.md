---
title: React事件机制总结
date: 2020-06-03
tags:
 - React
categories:
 - React

---

前一篇写到了Vue和React的差异问题，其中一点关于React的事件机制。

> 原生事件都是被包装的，所有事件都是冒泡到顶层document监听，然后在这里合成事件下发

这段也是触及到了我这个React熟练工的盲区了。 今天决定仔细探究下这个问题。

<!-- more -->

## 原生事件 vs 合成事件

```react
...
const btn = document.getElementById('native-btn');
btn.addEventListener('click', (e) => {
  // e.stopPropagation();
  console.log('原生click');
}, false);

const onClick = () => {
  console.log('合成click');
};

...
<button onClick={onClick}>普通按钮</button>
<button id="native-btn" onClick={onClick}>原生按钮</button>
```

定义两个button，第一个使用`onClick`属性，第二个在用了`onClick`的同时用原生的`addEventListener`方法绑定了一个click回调函数。

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200603153208791.png" alt="image-20200603153208791" style="zoom:80%;" />

查看第一个button元素，能看到click事件被注册在`document/html/body/button`上。

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200603153400634.png" alt="image-20200603153400634" style="zoom:80%;" />

查看第二个button元素，发现和第一个的区别是button本身被注册了两个click事件，一个是react自动加的，另一个是我们手动加的。



点击第二个button，得到输出

```
原生click
合成click
```

说明原生的事件是在合成事件前执行的，原因是原生的事件是在**目标阶段**执行的，也就是当捕获结束、冒泡之前（假设元素就是事件的currentTarget）的执行阶段，而合成事件是绑定在document的，所以比如需要冒泡到顶部才会执行。如果把`e.stopPropagation()`放开，得到的结果那就只有原生click被执行。

为了验证合成事件是注册在document， 我通过dev tool把普通按钮的document click绑定remove了。 结果就是点击无效了。反之如果只保留document的事件移除剩下的事件点击依然有效。

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200603154851209.png" alt="image-20200603154851209" style="zoom:80%;" />



## React做了什么

1. 每个合成事件里都有一个`nativeEvent`， 这个就是被包装的原生的事件。

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200603160018044.png" alt="image-20200603160018044" style="zoom:80%;" />

2. 通过再上面的截图可以看到button元素除了有click事件，还被绑定了一系列的事件，如`keyup/keydown`等。假设这是一个`input`，原生元素需要失焦才会触发onchange， 而在react中只注册一个onChange事件也可以在每次键盘输入时触发。
3. React在注册事件时做了浏览器兼容处理。

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200603160658534.png" alt="image-20200603160658534" style="zoom:67%;" />

## 事件注册

大致分为两步

- 事件注册 - 组件挂载阶段，根据组件内的声明的事件类型 onclick，onchange 等，给 document 上添加事件 addEventListener，并指定统一的事件处理程序 `dispatchEvent`。

- 事件存储 - 就是把 react 组件内的所有事件统一的存放到一个对象里，缓存起来，为了在触发事件的时候可以查找到对应的方法去执行。

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200603161554936.png" alt="image-20200603161554936" style="zoom:80%;" />

![image-20200603161956173](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200603161956173.png)

```javascript
// 存储之后在listenerBank的结构，就是所有同类型事件都放在一起，通过nodeId去查找
{
    onClick:{
        nodeid1:()=>{...}
        nodeid2:()=>{...}
    },
    onChange:{
        nodeid3:()=>{...}
        nodeid4:()=>{...}
    }
}
```



## 事件执行

1. 进入统一的事件分发函数(dispatchEvent)

2. 结合原生事件找到当前节点对应的ReactDOMComponent对象

3. 开始`事件的合成`

   3.1 根据当前事件类型生成指定的合成对象

   3.2 封装原生事件

   3.3 查找当前元素以及他所有父级， 如果同一类型事件在父子层级都定义了，那么React这里会模拟一个冒泡的过程，把所有回调都放在队列里，按冒泡的顺序先执行子再执行父

   3.4 在`listenerBank`查找事件回调并合成到 `event queue`(合成事件结束)

4. 批量处理合成事件内的回调事件（事件触发完成 end）


![image-20200603162228545](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200603162228545.png)



## 意义

1. 解决IE的兼容问题，抹平浏览器的行为差异
2. 减少内存消耗，提升性能，一种事件只在document上注册一次

## 参考

[【长文慎入】一文吃透 react 事件机制原理](https://juejin.im/post/5d7678b06fb9a06b2b47a03c)

[【React深入】React事件机制](https://juejin.im/post/5c7df2e7f265da2d8a55d49d)

