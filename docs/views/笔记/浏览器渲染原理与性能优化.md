---
title: 【笔记】- 浏览器渲染原理与性能优化总结
date: 2020-12-27
tags:
 - 浏览器
 - 优化
categories:
 - 笔记


---

## 进程与线程

- 进程包含线程，进程是操作系统资源分配的基本单位
- 线程由进程管理
- 为了提升浏览器的稳定性和安全性，浏览器采用的是多进程模型

### 浏览器中的五个进程

![img](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/browser.7559b8c7.png)

- 浏览器进程： 负责主界面显示、用户交互、子进程管理，提供存储等。
- 渲染进程： 每个tab卡都是单独的渲染进程，核心用于渲染页面。
- 网络进程： 主要处理网络资源加载(`HTML`、`CSS`,、`JS`等)
- GPU进程： `3d`绘制,提高性能
- 插件进程： 负责插件运行的进程



## 从输入URL到浏览器显示页面发生了什么?

如果输入的是关键字那么会调用默认的搜索引擎，否则如果是合法url，则开始以下步骤

粗略得讲总共4步，可以说是浏览器几个进程之间的互相协作过程，进程间通信用IPC：

1. 做url的地址导航，并准备渲染进程
2. 在网络进程中发送请求，相应后的结果交给渲染进程处理
3. 解析页面（HTML），并加载需要的资源
4. 渲染页面，展示结果

网络的七（四）层模型： （物 数） （网ip）（传tcp 安全可靠 分段传输/udp 会丢包速度快不需要握手）  （会 表 应）

### URL请求过程

1. 查找强缓存，是否过期
2. 查看域名是否被解析过，有的话直接从浏览器缓存拿，否则进行DNS解析（基于UDP），将域名转成IP，并增加端口号
3. 如果是`HTTPS`，那要做`SSL`的协商
4. 利用IP地址做寻址请求，同一域名下请求数不能超过6个
5. 与服务器做TCP连接，即三次握手
6. 发送HTTP请求（请求行，请求头，请求体）
7. 利用TCP协议将大文件拆成数据包进行有序传输，可以做到丢包重传，服务器收到后按照序号重排数据包 （增加`TCP`头部，`IP`头部）
8. 服务器响应结果（响应行，响应头，响应体）
9. 返回状态码为301、302时，浏览器会进行重定向操作。（重新进行导航）
10. 返回304则查找缓存。（服务端可以设置强制缓存）
11. `HTTP 1.1`中支持`keep-alive`属性,TCP链接不会立即关闭，后续请求可以省去建立链接时间。

#### 如何看network timing

![img](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/jd.f840386b.png)

- `Queuing`: 请求发送前会根据优先级进行排队，同时每个域名最多处理6个TCP链接，超过的就会进行排队，并且分配磁盘空间时也会消耗一定时间。
- `Stalled` :请求发出前的等待时间（处理代理，链接复用）
- `DNS lookup` :查找`DNS`的时间
- `initial Connection` :建立TCP链接时间
- `SSL`: `SSL`握手时间（`SSL`协商）
- `Request Sent` :请求发送时间（可忽略）
- `Waiting`(`TTFB`) :等待响应的时间，等待返回首个字符的时间
- `Content Dowloaded` :用于下载响应的时间

### HTTP的发展历程

- HTTP/0.9：没有请求头和请求体，服务器返回也没有头信息，只是为了传输HTML存在
- HTTP/1.0: 增加了请求头和响应头，实现了除HTML之外的多类型数据传输
- HTTP/1.1: 默认开启了持久链接（keep-alive），在一个TCP链接上可以传输多个HTTP请求。每个域名可以最多维护6个TCP持久链接，即采用**管线化**的方式来并发请求，但是服务器接收请求还是按顺序处理返回的，这就会造成队头阻塞问题。支持了数据分开传输，引入了客户端cookie机制。
- HTTP/2.0 用一个TCP链接来发送数据，一个域名一个TCP链接，即多路复用（原理为二进制分帧）。 头部压缩减少体积，服务器可以主动推送给客户端
- HTTP/3.0 解决了TCP的队头阻塞问题，QUIC协议，采用UDP

### 为什么css放在header里，js要放在底部？

css如果放在底部，那么有可能会**发生重绘**，因为当html渲染时，渲染从上到下，边解析边渲染（没有样式的前提下），在还没解析到css部分的时候就已经把之前的dom部分渲染好了，此时再加载css，就会对dom进行二次渲染。相反，如果把css放在头部，当渲染dom时，是必须要等待样式加载完毕才会渲染，所以说css的资源加载**不会阻塞**HTML的解析，但是**会阻塞**dom的渲染

JavaScript**会阻塞**HTML的解析，也**会阻塞**dom的渲染，如果把js放在文件的头部或中间，就会把整个渲染过程割裂开，当解析到js部分时就必须先执行js，然后再执行后续的解析。 同时css的加载**会阻塞**js的执行，因为js要保证能够操作页面样式时才开始执行。js为什么会阻塞dom渲染，因为js也是可以操作dom的，如果页面渲染和js并行，那么js就有可能操作到不符合预期的dom了

总结为下图，主流程就是下图的第一行，浏览器会预解析HTML文件，看里面有没有css和js的外链，然后并发去请求，当返回后，dom的渲染依赖js的执行完毕，而js的执行开始依赖于css的解析完毕

![img](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/browerrender.jpg)

### 渲染流程

![img](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/timg.5bac37a6.jpg)

1. 浏览器无法直接使用HTML，需要将HTML转化成DOM树。（document）
2. 浏览器无法解析纯文本的CSS样式，需要对CSS进行解析,解析成styleSheets。CSSOM（document.styleSeets）
3. 计算出DOM树中每个节点的具体样式（Attachment）
4. 创建渲染（布局）树，将DOM树中可见节点，添加到布局树中。并计算节点渲染到页面的坐标位置。（layout）
5. 通过布局树，进行分层 （根据定位属性、透明属性、transform属性、clip属性等）生产图层树
6. 将不同图层进行绘制，转交给合成线程处理。最终生产页面，并显示到浏览器上 (Painting,Display)

## Perfomance API

![img](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/timing-overview.7e63b017.png)

| 关键时间节点 | 描述                                     | 含义                                                         |
| ------------ | ---------------------------------------- | ------------------------------------------------------------ |
| `TTFB`       | `time to first byte`(首字节时间)         | 从请求到数据返回第一个字节所消耗时间                         |
| `TTI`        | `Time to Interactive`(可交互时间)        | DOM树构建完毕，代表可以绑定事件                              |
| `DCL`        | `DOMContentLoaded` (事件耗时)            | 当 HTML 文档被完全加载和解析完成之后，`DOMContentLoaded` 事件被触发 |
| `L`          | `onLoad` (事件耗时)                      | 当依赖的资源全部加载完毕之后才会触发                         |
| `FP`         | `First Paint`（首次绘制)                 | 第一个像素点绘制到屏幕的时间                                 |
| `FCP`        | `First Contentful Paint`(首次内容绘制)   | 首次绘制任何文本，图像，非空白节点的时间                     |
| `FMP`        | `First Meaningful paint`(首次有意义绘制) | 首次有意义绘制是页面可用性的量度标准                         |
| `LCP`        | `Largest Contentful Paint`(最大内容渲染) | 在`viewport`中最大的页面元素加载的时间                       |
| `FID`        | `First Input Delay`(首次输入延迟)        | 用户首次和页面交互(单击链接，点击按钮等)到页面响应交互的时间 |

```javascript
// 如何计算
<script>
    window.onload = function () {
        let ele = document.createElement('h1');
        ele.innerHTML = 'zf';
        document.body.appendChild(ele)
    }
    setTimeout(() => {
        const {
            fetchStart,
            requestStart,
            responseStart,
            domInteractive,
            domContentLoadedEventEnd,
            loadEventStart
        } = performance.timing;

        let TTFB = responseStart - requestStart; // ttfb
        let TTI = domInteractive - fetchStart; // tti
        let DCL = domContentLoadedEventEnd - fetchStart // dcl
        let L = loadEventStart - fetchStart;
        console.log(TTFB, TTI, DCL, L)

        const paint = performance.getEntriesByType('paint');
        const FP = paint[0].startTime;
        const FCP = paint[1].startTime; // 2s~4s
    }, 2000);

    let FMP;
    new PerformanceObserver((entryList, observer) => {
        let entries = entryList.getEntries();
        FMP = entries[0];
        observer.disconnect();
        console.log(FMP)
    }).observe({ entryTypes: ['element'] });

    let LCP;
    new PerformanceObserver((entryList, observer) => {
        let entries = entryList.getEntries();
        LCP = entries[entries.length - 1];
        observer.disconnect();
        console.log(LCP); // 2.5s-4s
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    let FID;
    new PerformanceObserver((entryList, observer) => {
        let firstInput = entryList.getEntries()[0];
        if (firstInput) {
            FID = firstInput.processingStart - firstInput.startTime;
            observer.disconnect();
            console.log(FID)
        }
    }).observe({ type: 'first-input', buffered: true });
</script>
```

## 网络优化

- 减少HTTP请求数，合并`JS`、`CSS`,合理内嵌`CSS`、`JS`，所谓合理就是不能全部内联，那样就无法做资源缓存了
- 设置服务端缓存，（强缓存、协商缓存）
- 减少重定向，重定向要重新走一遍请求流程
- 使用`dns-prefetch`，做DNS预解析
- 域名分片技术，将资源放到不同域名下，这样就可以绕过一个域名6个链接的限制
- 采用CDN加速
- `gzip`压缩优化，主要针对html，js，css，一般不包含图片，因为图片已经压缩了，可能压缩后更大
- 加载数据优先级： preload（预先加载当前页需要的资源），prefetch（提前加载将来可能用来的资源）

## 关键路径渲染

![img](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/rerender.da317d33.png)

- 重排 Reflow：元素几何变化，以及获取位置相关信息（因为要获取位置信息要先计算出元素位置，就会走到重排）
- 重绘 Repaint： 样式改变但不改变文档流的位置
- 强制同步布局问题，即**JavaScript强制将计算样式和布局操作提前到当前的任务中**，一般就是指一段js在操作完dom之后，同时在获取dom的位置信息，按照上图的流程，本来布局应该发生在js执行完成之后，但是在js没有执行完成的情况下就开始获取dom的信息，那么不得不把布局提前到js这个步骤来实现，这样相当于一次操作发生了两次布局
- 布局抖动（layout thrashing）问题，即反复触发同步布局，解决的原则就是读写dom要分离，不要出现在一段函数中
- 减少重绘回流的方法
  - 脱离文档流，即不影响周围的元素布局
  - 渲染时给元素加宽高，就不用每次渲染重复计算上下文的布局
  - 尽量用css3动画，因为是单独图层渲染利用GPU加速，只做图层复合

## 静态文件优化

### 图片优化

#### 图片格式

- jpg：颜色丰富，不支持透明度，不适合做图标（会有边缘锯齿）
- png：适合纯色、透明，适合做图标。因为是无损保存体积较大不适合做色彩丰富的图片
- gif：做动画，不支持半透明，不适合色彩丰富
- webp：优选，兼容性有限制
- svg：相比jpg体积更小，但是渲染成本高，适合小切色彩单一的图片

#### 图片优化

- 避免空src的图片，空src也会发送请求

- 减小图片尺寸，减少流量

- 设置alt，提升体验

- 图片懒加载 `loading:lazy`，只有进入到可视区域才会加载

  ```html
  <img loading="lazy" src="./images/1.jpg" width="300" height="450" />
  ```

- 定好图片的宽高，就不用让浏览器计算

- 采用base64减少请求

### CSS优化

- 不要选择器嵌套过深，因为浏览器要一层层做匹配
- css资源要做外链，可以利用缓存
- 减少使用@import，因为@import是串行加载

### JS优化

- 通过async、defer异步加载文件，两者都是异步加载，async是js资源加载完毕立刻执行，defer是等html解析完成后再执行，如果使用async要确保它是不操作dom的
  ![image-20201228234024706](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20201228234024706.png)
- 减少dom操作，或者应用在虚拟dom
- webworker做复杂操作
- IntersectionObserver做虚拟滚动，延迟加载
- requestAnimationFrame、requestIdleCallback
  ![img](http://www.zhufengpeixun.com/jg-vue/assets/img/frame.99c33aee.png)
- 使用事件委托，较少事件绑定数

### 优化策略

- SSR
- 预渲染
- PWA