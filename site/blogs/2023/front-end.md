## 什么是前端？

前端工程师狭义的来说就是指开发Web页面的开发人员。由于现在多数软件都是B/S建构，所以也属于软件工程师的一种。

除此之外，如各类小程序，一些桌面端的应用，以及手机端应用也属于前端的业务范围

iOS和Android平台的原生应用开发人员一般称为移动端或无线端开发工程师，不属于前端的范畴



## 前端的基石

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230712163517657.png" alt="image-20230712163517657" style="zoom:50%;" />

### HTML

HTML是用来组成页面的元素，比如div标签，p标签，img标签等等。当一系列元素组合起来之后，称之为**DOM**（Document Object Model），用来组织整个页面的表现结构。它的语法和写**XML**是一样的

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/1920px-DOM-model.svg.png" alt="dom" style="zoom:33%;" />

### CSS

CSS是用来改变页面元素样式的工具。它的语法都是声明式的，没有针对过程的编程语法。所以可以理解一种配置

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/css-declaration-small.png" alt="CSS p declaration color red" style="zoom: 33%;" />

它的语法主要包括几部分

- 选择器：用来过滤哪个（哪些）页面元素需要应用接下来花括号内的样式属性
- 定义：包括属性名和属性值，除了颜色和各种长度属性，一般属性都有固定的属性值选项



目前已知CSS总共有**228**个属性，但对我们日常而言，常用的应该不超过50个，剩下的要么太冷门，要么用不上。

### JavaScript

是一种解释型或者说即时编译型的编程语言。假如没有js那么我们现在还只能看静态页面，即页面是无法交互的，因为上面提到的HTML和CSS几乎都是纯静态配置，而JS就是让页面*活*起来的关键

JavaScript在1995年由Netscape公司的Brendan Eich，在网景导航者浏览器上首次设计实现而成。因为Netscape与Sun合作，Netscape管理层希望它外观看起来像Java，因此取名为JavaScript。但实际上它和Java的关系就类似雷锋和雷峰塔的关系。



### 总结

HTML决定了页面的内容的基本结构，CSS产生了页面的样式，也可以理解为页面的皮肤，而JS实现了页面的行为，让页面有了灵魂

当然并不是所有的前端页面都是由这三大件构成的，比如一些2D/3D的图表视图是用canvas实现，一些动效的页面使用webgl实现的，甚至有些是用Flash实现的



## 前端是怎么来的？

### 萌芽时期 1990 ~ 1993

#### 大事件

- 1990年第一个Web浏览器问世，但只能展示静态的页面，也就是超文本语言HTML
- 1991年，WWW（World Wide Web）诞生，网页可以通过网络去传递，标志着前端技术的开始

在这个年代，Web仅仅是供科学家间传递信息的，从信息的展示能力来看仅仅比电报强一些。因为还没有JavaScript所以都是纯静态的页面。

当时的页面要么是静态文件要么是后端生成，每次页面操作都需要完整刷新页面，但是当时的网速非常慢，所以让浏览的体验非常差。

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/v2-ed02785797334fa618a9d8abbe0e09aa_1440w.webp" alt="img" style="zoom: 67%;" />

### 前后端合体时期 1994 ~ 2005

#### 大事件

- 1994年网景公司推出了史上第一款商业浏览器，随后微软也推出了竞品IE浏览器
- 同年PHP诞生，PHP能将动态的内容嵌入到HTML中，提升了编写页面的效率与可读性。PHP的界定符、循环语句等的发明，深刻影响了后来的**ASP**、**JSP**，乃致后来的JavaScript前端模板引擎。
- 同年W3C小组（万维网联盟）成立。它是Web技术领域最具权威和影响力的国际中立性技术标准机构
- 1995年JavaScript诞生，近乎上帝七日创造世界那么高效。但也因为工期太短的缘故，导致许多瑕疵，因此一直被正统传序员所嫌弃，直到Ajax的出世，才让人们找到理由忍受它的畸形。早期的浏览器都配有一个选项，用来禁止JavaScript语言运行。

> 早期的JavaScript有非常多的缺陷

1. 没有包管理机制
2. 没有像Java与C++那样的打辅助用的SDK
3. 支持的内置方法非常少，导致很多别的语言可以实现的功能做不到



#### 当时的开发模式

那时的网站开发，采用的是后端 MVC 模式，开发者不区分前后端，统一称为Web开发工程师

- Model（模型层）：提供/保存数据

- Controller（控制层）：数据处理，实现业务逻辑

- View（视图层）：展示数据，提供用户界面

前端只是后端 MVC 的 V，那时候前端的 V 是在服务端渲染的。PHP，ASP，ASP.NET，JSP等都是典型的这样的模式

下面是一个典型的JSP

```html
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>JSP</title>
  </head>
  <body>
    <p>
       今天的日期是: <%= (new java.util.Date()).toLocaleString()%>
    </p>
  </body> 
</html>
```





#### 浏览器大战

##### 第一次浏览器大战 1994 ~ 2002

IE浏览器之所以可以做到与网景浏览器同年发布，是因为它当时就是反编译了网景浏览器，自己魔改了一番，然后就发布的产物。在当时网景在开始时占据了绝对优势的（市占率90%）。当时IE的Bug很多，导致众多开发者不愿意为IE开发网页，所以用了`Navigator.userAgent`简称UA来标识打开网页的浏览器，当发现是IE浏览器时，就提示用户请用网景浏览器打开。结果后来微软甚至需要通过把自己的UA伪装为网景浏览器的方式，欺骗了检测UA的脚本，达到了也能跑网页的目的

最终，第一次浏览器之战以微软胜利，Netscape被美国在线42亿美元收购，而落下帷幕。在2002年IE的市占率达到了92%，达到了至今为止历史上浏览器的最高占有率

那微软后来是怎么赢的？它做了以下几件事

1. 微软把Windows操作系统和IE捆绑销售，因为微软财力雄厚，所以不在乎浏览器的收入只在乎市占率，所以IE就成了免费浏览器
2. 对各大授权出厂预装Windows的主机厂商，强制要求在机器上展示IE的图标，否则对主机厂商做出涨价处罚
3. 联合当时各大网络服务提供商，推出ISP定制版IE，让ISP鼓励用户放弃网景，转投IE
4. 当时的Office全家桶中的FrontPage也是当时制作网页的主流工具之一，微软在其中加入特殊专属标签，导致制作出来的网页无法用网景正常访问
5. IE率先支持了CSS，让开发者觉得IE能做出更好看的页面



这次大战之后还引发了一系列问题：

在大战中，两者在浏览器开发上，为压倒对手，做出了以下两大行为：

1. 把加入新功能的重要性放在修正错误之前。
2. 使用专属格式，不尊重公开标准。

尽管当时有ECMA-262（JavaScript规范文档）与W3C（HTML与CSS的规范文档），微软却没有照规范来实现JavaScript、HTML与CSS，导致前端兼容问题的诞生。所以CSS Hack、浏览器判定、特性侦测，这些技术就应运而生。这也是为什么早期Web从业人员痛恨IE的原因



##### 第二次浏览器大战 2002 ~ 2006

IE浏览器对火狐浏览器

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/Mozilla_dinosaur_head_logo.png" alt="Mozilla" style="zoom: 25%;" />

Mozilla是网景浏览器最初的开发代号，也是其最初的名称，但是考虑到市场取向的问题改名为Netscape。同时Mozilla也是网景员工在1998年成立的一个自由软件社群。在第一次浏览器大战结束后，Mozilla得到了Netscape源代码的授权，并基本此做了彻底重构，在2002年推出了Mozilla 1.0版，随即在开源社区得到普及。在此基础上又衍生了很多派生产品，其中就包括跨平台操作系统**Firefox**

2004年6月，IE爆出严重安全性漏洞，导致用户受到严重攻击，事后美国电脑安全事故协调中心及多家电脑安全公司也建议用户改用更安全的Firefox，以避开此等攻击

2005年，Linux的商业化产品受到市场的采纳，这些Linux发行版的GUI系统都会预装Firefox。加上之前的各种安全问题，IE的市占率跌到了85%，在部分地区甚至80%以下

但还是由于微软在操作系统上的垄断地位，Firefox此后的市占率也仅仅维持在16% - 18%之间。市场开始进入稳定



##### 第三次浏览器大战 2008 ~ 2015

2008年，Google推出Google Chrome浏览器，自此Internet Explorer开始衰落。2013年，Opera放弃自有的Presto渲染引擎，改用Chromium系的Blink渲染引擎。2015年，微软在Windows 10中内置了新开发的Microsoft Edge浏览器并逐步放弃Internet Explorer，但到2020年1月，Microsoft Edge也开始改用基于Chromium开发。



### AJAX时期  2005 ~ 2006 

在此之前，所有的页面都是通过Web工程师在服务端组织好数据和模版，然后发送完整的HTML给浏览器做渲染。如果页面要获取新的数据那就必须重新走一遍这个服务端的流程。针对当时的网速和设备性能，这个过程就非常的低效，所以当时人们就在思考如何局部得刷新页面内容或者拉取数据。

直到2005 年2月，杰西·詹姆士·贾瑞特（**Jesse** **James** **Garrett**）发表了一篇名为《Ajax：一种Web应用程序开发的新方法》的文章后，Ajax被挖掘出，大家才开始重视起这技术的应用。

在 2005 年，Google 通过其 Google Suggest 使 AJAX 变得流行起来。

2006年W3C发布了它的国际标准。

AJAX全称Asynchronous Java And XML：异步的 Java 和 XML。简单的说，就是在浏览器中利用XMLHttpRequest这个对象，可以直接在浏览器里面发起异步请求

至此，因为可以在页面里独立请求数据，就可以把一些数据的逻辑从后端转移到前端，前后端分离开始有了雏形



### JQuery时期  2006 ~ 2012

2006年JQuery正式发布。对整个前端来说都是划时代的。它主要有以下几个杀手锏

1. 由于浏览器大战，带来了各个浏览器间的不兼容问题，利用JQuery可以抹平这些差异
2. 大大降低了前端的入门门槛
3. 链式的语法风格简单高效，相比原生的浏览器API开发提效明显

以下是JQuery官网的三个介绍案例

```javascript
// DOM Traversal and Manipulation DOM的操作
// Get the <button> element with the class 'continue' and change its HTML to 'Next Step...'
$( "button.continue" ).html( "Next Step..." )

// Event Handling 事件处理
// Show the #banner-message element that is hidden with display:none in its CSS when any button in #button-container is clicked.
var hiddenBox = $( "#banner-message" );
$( "#button-container button" ).on( "click", function( event ) {
  hiddenBox.show();
});
// 数据获取
$.ajax({
  url: "/api/getWeather",
  data: {
    zipcode: 97201
  },
  success: function( result ) {
    $( "#weather-temp" ).html( "<strong>" + result + "</strong> degrees" );
  }
});
```

这个时期涌现了大量的JQuery相关的插件和组件库，这个年代前端技能基本可以和JQuery画上等号。但依然带来了很多问题

1. 由于大家都热衷于堆砌JQuery的插件，导致很容易用力过猛，页面上插入了十几个乃至几十个JQuery插件，由于渲染进程是单线程的，导致了页面因为加载JS而阻塞了渲染，使得页面白屏时间变长
2. 插件开发者的水平良莠不齐，导致了各种全局变量污染问题



从这个时期开始，前端开始逐渐从Web工程师中独立出来，成为了一个新的工种。



### Node时期 2008 ~

#### 大事件

- 2008年，谷歌发布**V8引擎**，V8是一个开源的JavaScript引擎，而JavaScript引擎可以理解为用来运行JavaScript的运行时平台，它负责对代码的编译转换，即代码到机器码的过程。

V8的出现对前端的改变的空前的，主要归功于它的几个杀手级特性

1. 之前js的运行效率一直都被诟病，但是V8的运行效率利用`JIT`等技术，将运行效率提升了数十倍
2. V8引擎还可以独立运行，可以嵌入到其他任何C++程序中，使在服务端运行JS成为可能

有了V8之后，JavaScript终于可以走出浏览器，在服务端也占有一席之地

- 2009年，基于V8引擎，诞生了**Nodejs**，即服务器端运行JS的运行环境

- 2015年，ECMAScript推出第六个版本（第五个版本发布时间是2009年），简称**ES6**。目前的JavaScript语法和API基本都是基于这个版本的，在这个版本中推出了很多影响整个行业发展的更新，比如
  - 异步解决方案`Promise`
  - 模块管理方案`ES Module`
  - `class`的官方实现
  - 代理`Proxy`的加入，这是很多现代前端框架的基础



#### 前端工程化

在Node.js出现之前，前端是没有自己的独立的工程化体系的，比如说

- 写了一个独立功能的代码模块，怎么像jar包一样发布到公共仓库供其他开发者复用，同时自己也能直接把他人贡献包运用到自己的项目中？
- 代码写完后，怎么编译成低版本语法的js，然后怎么把多个文件串联起来，最后怎么压缩代码？
- 代码写完后，怎么知道自己写的代码有没有语法错误，有没有代码风格的问题？如何检查
- 写完代码后怎么做单元测试，集成测试？
- 前端除了依托nginx或者别的静态Web服务器，有没有可能通过执行自身来做线上部署

关于这些问题，社区基于Nodejs给出了一系列井喷式的解决方案，目前主流的包括

- 包管理工具：npm、yarn、pnpm
- 源码编译：Babel、tsc
- 打包工具：webpack、rollup、vite
- 代码校验工具：ESLint
- 单元测试/集成测试：Jest、Cypress、testing-library
- Web服务器：Express、Koa、Nestjs



在这个时期，前端的各种基建发展百花齐放，蓬勃发展，是前端技术更迭最快的时期



### 三大框架割据时期 2015 ~

所谓前端的三个框架或者说三驾马车指的是

- React：2013年由Facebook开源发布
- Vue：2014年由美籍华人尤雨溪创造发布
- Angular：2009年由谷歌发布

这些框架相较于JQuery，这几个框架都一些共同的特点

1. 数据驱动模型：从原始的DOM行为驱动改为了数据状态驱动，而中间那些DOM的行为都被框架所代理了
2. SPA：即单页应用，前端页面只需要一个入口，无须刷新页面就能浏览整个应用的所有页面
3. 组件化：即将页面拆分成多个独立的组件进行开发，提高了代码的可维护性和复用性。
4. 虚拟DOM：即在内存中建构一个虚拟的DOM数据结构，把可能的变化在内存中推演好，最后一次性更新UI，减少DOM的操作频次，提高效率

以下是一段简单的React [Demo](https://codesandbox.io/s/react-counter-example-ihrly?file=/src/App.js:0-446)

```react
import React, { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount(count + 1);
  };
  const handleReset = () => {
    setCount(0);
  };

  return (
    <div className="App">
      <h1>You've clicked the button {count} times.</h1>
      <button onClick={handleClick}>Click me!</button>
      <button onClick={handleReset}>Reset</button>
    </div>
  );
}
```

从本质来讲，这些框架的核心就是让开发者的心智集中到数据逻辑的转化，而不是如何去操作DOM。带来的好处可以总结为

- 多：带来了一系列繁荣的生态，开发者不需要再造很多的轮子，大多数的解决方案都可以找到相关的开源库
- 快：框架是开箱即用的，可以快速复用沉淀抽象出来的组件，开发效率本质提升
- 好：利用虚拟DOM等技术，使得页面性能更好
- 省：节省了开发者做浏览器兼容的心智



![image-20230717115618478](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230717115618478.png)

截止当前，React依然是前端框架的领导者。



#### Typescript的崛起

js本质上还是一门动态语言，现在假设我们设定一个对象结构体为

```typescript
interface DataObject {
  a: {
    b: string;
  };
  c: number;
}
```

那么在JavaScript中，如果如下写，所有的语句在编译阶段都不会报错

```javascript
// 假设data就是这个类型
data.a.b.d.e; // 访问不存在的属性
data.a.filter(x => !!x) // 访问不存在的方法
data.a.b.toFixed(); // string类型去访问number的方法
```

这样虽然可以让前端代码非常自由，但是也造成了极大的质量隐患。

在2014年微软发布了Typescript。它是一个JavaScript的超集，它最大的作用就是为JavaScript提供了强类型化的解决方案。此时再回到上面的代码，每一行都会被编译器报错。那么这样我们在编写js的体验就会无限接近于各种静态语言。

目前不论是主流的前端框架还是工具都是以ts为事实的开发标准的





## 前端FAQ

### 什么是跨域？

这是在浏览器环境特有的名词，指的是在访问一个`协议+域名+端口`的组合页面时，页面通过xhr访问了另一个组合的资源。这是一种浏览器对目标资源的保护行为，简单理解就是在A站点不应该去访问B站点的资源，B站点会有被入侵的风险。但实际情况是我们经常需要在页面中访问三方的资源，这时候如何跨域就成了问题。主要解决方法有两类

1. 在服务端设立白名单，也称CORS，即在返回的Header里加入`Access-Control-Allow-Origin: *`或者具体IP地址
2. 使用反向代理，这也是我们前端在本地开发环境用的最多的手段，即开启一个本地proxy服务，页面上访问的仍然是同源的资源，但是实际上已经通过nginx或者node服务代理到了实际的目标地址



### 什么是组件库？

我们日常使用的页面组件其实类型是非常固定的，如果每个开发者都从HTML原生Tag开始写页面，那效率就太低了。所以我们就会把高频的组件逻辑抽出来，封装成一个个通用组件，这种组件的特征就是没有任何业务逻辑，属于底层展示组件。然后各个厂商会添加上自己特色的设计元素，就形成了各种 `xxDesign`组件库，在国内业界最有名的存在是蚂蚁推出的[Ant Design](https://ant.design/components/overview-cn/)

使用组件库主要有几个好处

1. 降低了前端开发**项目**的入手门槛，同时提高了简单业务的开发效率
2. 提高了代码的质量，屏蔽了所有底层组件可能出现的bug，降低维护成本
3. 统一团队和产品的视觉风格

但有没有坏处呢？ 在极端情况下还是有的

1. 一旦团队需要切换组件库，那成本代价会很大
2. 组件库的质量需要其团队的强有力支撑，而现实中经常会出现烂尾的工程



### 为什么前端要求API先行和实时协同？

如上对Typescript的描述，其实现在的前端代码也是强类型化的，但是即使前端这么定义，事实如何返回还是由后端来决定的，总体来讲前端是处在一个**被动**的角色。

如果后端不定义结构或者随意改动结构，就是引起前端代码的**不协同**。



### 什么是微前端？

在很长的一段时间里，前端都是一个个聚石塔应用，即一个前端工程对应着N个后端微服务。

在2018年，业界开始推出各种微前端解决方案，目的就是能让前端按模块独立部署，最后统一在一个SPA上面呈现

业界主流的方案包括： qiankun、module federation、Garfish等



### 什么是跨端？

一般有两种含义

1. 2017年开始，国内开始流行小程序，但衍生出了需要小程序的开发工具。 与此同时也造成了一个成本问题，即同样的页面内容，我想要同时支持微信小程序、支付宝小程序、PC端页面、手机端浏览器等等。所以就衍生出了相应的解决方案，目前业界主流的方案是京东推出的Taro
2. Flutter/React Native



### 什么是大前端？

又称为Full Stack for Frontend。要求前端开发人员不仅要关注视图层的开发，还需要关注数据层、业务逻辑层等多个方面。

- 前端基建的开发，包括脚手架、编译工具、打包工具、解决方案等
- 开发桌面端应用，利用Electron等技术
- 游戏开发，利用Unity等技术
- 后端开发，包括但不限于Web应用
- 开发机器学习应用程序，利用TensorFlow.js等技术
- 跨端
- 3D渲染，利用webgl等技术，实现定制化的渲染需求



如果还想了解什么，欢迎补充