## 前端性能指标

相对于功能性的实现，web性能这一块就我们日常工作中比较容易被忽略的一部分。就这部分而言，除了一些大厂明星级应用，一般而言不会由产品方主动去要求前端做到什么程度，一般只要不是卡得很明显就不会有问题，所以前端性能的提升主要就还是依赖我们前端的自律性和责任感。

那么什么是好的web性能呢？用哪些指标去衡量一个前端应用性能的优劣？其中哪些又是核心的指标？接下来就一一展开

### 什么是前端性能

#### 客观性能

从发出请求开始，到下载、解析和执行所有资源以及最终绘制的整个过程的时间度量。这个就是所熟悉的各种前端性能指标的集合。

#### 感知性能

基于加载时间和页面响应性的一个主观指标，衡量一个网站在用户看来有多快，即当网站加载到足以让用户相信它已经加载完毕并且可交互的时候。比如菊花和进度条都是有效提升感知性能的手段

#### 性能指标

2010 年 8 月，[W3C 成立了 Web 性能工作组](https://link.juejin.cn/?target=https%3A%2F%2Fwww.w3.org%2Fblog%2Fnews%2Farchives%2F2370)，由来自 Google 和 Microsoft 的工程师担任主席，目标是制定衡量 Web 应用性能的方法和 API。



### 主要的前端性能指标

![image-20211004175529449](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20211004175529449.png)

#### 加载相关

##### Time to First Byte（TTFB）

浏览器从请求页面开始到接收第一字节的时间，这个时间段内包括 DNS 查找、TCP 连接和 SSL 连接。

```javascript
responseStart - fetchStart
```

##### DOMContentLoaded（DCL）

DOMContentLoaded 事件触发的时间。

当 **HTML **文档被完全加载和解析完成之后，这里包含**当页面引用的所有 js 同步代码执行完毕**，DOMContentLoaded事件被触发，而无需等待样式表、图像等资源加载完成。

```javascript
domContentLoadedEventEnd - fetchStart
```

### Load（L）

onLoad 事件触发的时间。页面所有资源都加载完毕后，包含外链的css和图片，已经js执行中需要异步加载的资源，onLoad 事件才被触发。

```javascript
loadEventStart - fetchStart
```

![image-20211004195002350](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20211004195002350.png)

#### 内容呈现相关

随着我们越来越多得采用SPA来实现web app，往往我们的页面在onLoad触发时，并没有完成最终的渲染，所以就需要更多内容渲染相关的指标来衡量性能

##### First Paint（FP）

从开始加载到浏览器**首次绘制像素**到屏幕上的时间，也就是页面在屏幕上首次发生视觉变化的时间。但此变化可能是简单的背景色更新或不引人注意的内容，它并不表示页面内容完整性。

```javascript
const paint = performance.getEntriesByType('paint');
const FP = paint[0].startTime;
```

##### First Contentful Paint（FCP）

浏览器首次绘制来自 DOM 的内容的时间，内容必须是文本、图片（包含背景图）、非白色的 canvas 或 SVG，也包括带有正在加载中的 Web 字体的文本。但仅仅代表是开始渲染有意义的内容，并不代表是对用户有用的内容

![image-20211005003911695](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20211005003911695.png)

##### First Meaningful Paint（FMP）

页面的**主要内容绘制到屏幕上的时间**，这是一个更好的衡量用户感知加载体验的指标，但仍然不理想。

在 Lighthouse 6.0 中已不推荐使用 FMP，建议使用 [Largest Contentful Paint](https://link.juejin.cn/?target=https%3A%2F%2Fweb.dev%2Flargest-contentful-paint%2F) 代替。



##### Largest Contentful Paint（LCP）

**可视区域中最大的内容元素呈现**到屏幕上的时间（在`viewport`中最大的页面元素加载的时间），用以估算页面的主要内容对用户可见时间。

什么是Largest Content呢？就是页面可是区域内绘制面积最大的元素。如果延伸到了屏幕外，就会被截取。

LCP只关注

- `<img>` 元素
- `<image>`元素内的`<svg>`元素
- `<video>` 元素
- 通过 `url()` 函数加载背景图片的元素
- 包含文本节点或其他内联文本元素子级的块级元素。

页面在加载过程中，是线性的，元素是一个一个渲染到屏幕上的，而不是一瞬间全渲染到屏幕上，所以“渲染面积”最大的元素随时在发生变化。

如果元素被删除，LCP算法将不再考虑该元素，如果被删除的元素刚好是 “绘制面积” 最大的元素，则使用新的 “绘制面积” 最大的元素创建一个新的性能条目。

该过程将持续到用户第一次滚动页面或第一次用户输入（鼠标点击，键盘按键等），也就是说，一旦用户与页面开始产生交互，则停止报告新的性能指标。

![img](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/1724c42874f9c308~tplv-t2oaga2asx-watermark.awebp)

##### Speed Index（SI）

这是一个表示页面可视区域中内容的填充速度的指标，可以通过计算页面可见区域内容显示的平均时间来衡量。最后的值越小约好



![image.png](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/8813e03bd1f840fead3cd3a051e55f96~tplv-k3u1fbpfcp-watermark.awebp)



#### 交互响应性相关

##### Time to Interactive（TTI）

表示网页第一次 **完全达到可交互状态** 的时间点，浏览器已经可以持续性的响应用户的输入。完全达到可交互状态的时间点是在最后一个长任务（Long Task）完成的时间, 并且在随后的 5 秒内网络和主线程是空闲的。

何为长任务？ 执行超过50ms的都称为长任务

![image.png](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/872e939badf7440ca609104e197372ad~tplv-k3u1fbpfcp-watermark.awebp)

```javascript
const ttiPolyfill = require('tti-polyfill');
ttiPolyfill.getFirstConsistentlyInteractive().then((tti) => {
  window.perfData.push({
    'tti': tti
  });
});
```

##### First Input Delay（FID）

从用户第一次与页面交互（例如单击链接、点击按钮等）到浏览器实际能够响应该交互的时间。

![image.png](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/e074373859c340caa11e8e5eeb36fd98~tplv-k3u1fbpfcp-watermark.awebp)



#####  Total Blocking Time（TBT）

TBT计算的是页面总计阻塞用户输入的时长，如鼠标点击，键盘输入等。

它的计算方法是，收集所有FCP到TTI之间所有的长任务，加总它们每个任务超过50ms的部分，比如，有两个长任务，一个70ms，一个120ms，那么TBT = (70 -50) + (120 - 50) = 90ms

##### Cumulative Layout Shift（CLS）

累积布局偏移 (CLS) 是测量[视觉稳定性](https://web.dev/user-centric-performance-metrics/#types-of-metrics)的一个以用户为中心的重要指标，因为该项指标有助于量化用户经历意外布局偏移的频率，较低的 CLS 有助于确保一个页面是[令人愉悦的](https://web.dev/user-centric-performance-metrics/#questions)

![Kapture 2021-10-05 at 11.39.35](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/Kapture 2021-10-05 at 11.39.35.gif)

如何计算：

为了计算布局的偏移值，浏览器会查看两个渲染帧之间的视口大小和视口中不稳定元素的移动。布局偏移分是该移动的两个指标的乘积:影响分数和距离分数。

```javascript
layout shift score = impact fraction * distance fraction
```

**影响分数**

前一帧和当前帧的所有不稳定元素的可见区域的并集（占视口总面积的一部分）是当前帧的影响分数。

![img](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/1724c428eecf24a9~tplv-t2oaga2asx-watermark.awebp)

在上图中，有一个元素在一帧中占据了视口的一半。然后，在下一帧中，元素下移视口高度的`25％`。红色的虚线矩形表示两个帧中元素的可见区域的并集，在这种情况下，其为总视口的`75％`，因此其影响分数为 `0.75`。

**距离分数**

布局偏移值方程的另一部分测量不稳定元素相对于视口移动的距离。距离分数是任何不稳定元素在框架中移动的最大距离(水平或垂直)除以视口的最大尺寸(宽度或高度，以较大的为准)。

![img](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/1724c428e9f78bd8~tplv-t2oaga2asx-watermark.awebp)

在上面的例子中，最大的视口尺寸是高度，并且不稳定元素移动了视口高度的`25%`，这使得距离分数为`0.25`。

因此，在此示例中，影响分数为`0.75`，距离分数为`0.25`，因此版式位移分数为`0.75 * 0.25 = 0.1875`。



### Core Web Vitals

`Core Web Vitals` 是应用于所有 `Web` 页面的 `Web Vitals` 的子集，每个 `Core Web Vitals` 代表用户体验的一个不同方面，在该领域是可衡量的，并反映了以用户为中心的关键结果的真实体验。

![img](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/1724c42870b1752d~tplv-t2oaga2asx-watermark.awebp)



### 参考文档：

[前端性能优化指南[7]--Web 性能指标](https://juejin.cn/post/6844904153869713416)

[2021 年 Web 核心性能指标是什么？谷歌工程师告诉你，FMP 过时啦！](https://qdmana.com/2021/04/20210402152246947m.html)

[Cumulative Layout Shift 累积布局偏移 (CLS)](https://web.dev/cls/)

[以用户为中心的性能指标](https://web.dev/user-centric-performance-metrics/)

[解读新一代 Web 性能体验和质量指标](https://juejin.cn/post/6844904168591736846)