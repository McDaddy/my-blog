---
title: 【笔记】- React Fiber详解
date: 2020-08-16
tags:
 - React Fiber
categories:
 - 笔记

---



### 一帧的生命周期

- 输入事件： 包括阻塞和非阻塞的用户事件，阻塞比如滚动，非阻塞比如点击，键盘输入等
- JavaScript：包括主JS线程和定时器Timers
- 开始帧：响应帧事件，包括resize，scroll，媒体查询等
- requestAnimationFrame
- 布局Layout： 包括计算样式和更新布局
- 绘制Paint
- Idle period空闲阶段：requestIdleCallback

![image-20200816142541863](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200816142541863.png)

因为JS的执行引擎和页面渲染引擎同在一个渲染线程，所以永远是互斥的

如果JS的执行时间过长不释放线程就会引起渲染的卡顿

<!-- more -->

## 什么是Fiber

- 可以通过调度策略合理得分配CPU资源，更快得响应用户事件
- 通过Fiber架构，自己协调的过程是可中断的，适时让出CPU使用权。

### Fiber是一个执行单元

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200816151105595.png" alt="image-20200816151105595" style="zoom:80%;" />

### Fiber是一个数据结构

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200816151335055.png" alt="image-20200816151335055" style="zoom:80%;" />

### requestAnimationFrame

- requestAnimationFrame(callback)的回调函数会在绘制之前执行
- 每次callback的执行时机都是浏览器刷新下一帧渲染周期的起点
- callback中有个timestamp参数，指的是回调被调用的时间点
  - 这个时间是从performance api中来的，是个绝对的时间，从加载页面开始计算的
  - performance.timing.navigationStart 就是加载页面的时间点
  - performance.now就是从页面加载完到现在经历的时间，是一个时间段
  - performance.timing.navigationStart + performance.now 就约等于Date.now()
- 高优先级，每帧都会执行

### requestAnimationCallback

- 低优先级，不空闲就不执行
- 有两种执行情况
  1. 在每次16.7ms的空闲中执行
  2. 当浏览器发现没有什么操作要响应时，会适当延长帧的时间，最大到50ms，也就是每秒20帧，这时候就会出现有40+ms的空闲时间的情况。 原理是人的反应速度一般是100ms， 只要响应小于100ms那么用户的操作比如点击就会看起来是流畅的。 换句话说就是idle这段时间之前的6个阶段都没啥事情要做，那么它就会延长， 如果我们强制写一个requestAnimationFrame那么帧的长度永远是16.7
- 回调函数有两个参数，第一个是deadline，`deadline.timeRemaining() > 0` 或者 `deadline.didTimeout`都能表示时间片有没有到期，如果到期就应该结束函数，重新申请时间片。 第二个参数是个对象，可以传入`{timeout: 1000}`意思是虽然requestIdleCallback的意义是空闲时执行，但不能把这Callback给饿死，如果超过1000ms还没空闲，那就要强制执行。
- 只有Chrome支持，React使用MessageChannel模拟这个效果 

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200816163430369.png" alt="image-20200816163430369" style="zoom:80%;" />



### MessageChannel

每一次postMessage都相当于建立了一个宏任务

```javascript
 let channel = new MessageChannel();
 //channel.port1 channel.port2
 let port1 = channel.port1;
 let port2 = channel.port2;
 port1.onmessage = function(event){
 console.log('port1收到来自port2的数据',event.data);
 }
 port2.onmessage = function(event){
 console.log('port2收到来自port1的数据',event.data);
 }
 port1.postMessage('发送给port2');
 port2.postMessage('发送给port1');
```

### 使用MessageChannel模拟requestIdleCallback

```javascript
const timeGap = 1000 / 60;
const messageChannel = new MessageChannel();
let frameDeadline;
let pendingCallback;
const { port1, port2 } = messageChannel;
let timeRemaining = () => frameDeadline - performance.now();
port2.onmessage = (e) => {
  //如果帧的截止时间已经小于当前时间,说明已经过期了
  let didTimeout = frameDeadline <= performance.now();
  if(didTimeout || timeRemaining()>0){
    if(pendingCallback)
      pendingCallback({didTimeout,timeRemaining});
  }
}
window.requestIdleCallback = function (callback) {
  requestAnimationFrame((rafTime) => {
    //每一帧开始的时间加上16.6就是一帧的截止时间了
    frameDeadline = rafTime + timeGap
    pendingCallback = callback;
    //发消息之后,相当于添加一个宏任务
    port1.postMessage('hello');
  })
}
```

- 核心在于postMessage相当于添加了一个宏任务，当下不会立即执行，而会到了主线程和所有微任务结束之后得到执行。
- 在`requestAnimationFrame`定义好，这个帧结束的时间
- 在`onmessage`中判断是否还有空余时间，然后把timeRemaining传给callback

### Fiber的执行阶段

分为两个阶段，协调reconcilidation和提交阶段commit

- 协调阶段：可以认为是diff阶段，这个阶段是可以中断的，在这个阶段会找出所有节点的变更（新增、修改、删除）等。这些被成为副作用
- 提交阶段：必须同步不能打断，即将上个阶段完成的副作用一次性执行。

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200816233304966.png" alt="image-20200816233304966" style="zoom:80%;" />