---
title: 前端压力测试
date: 2021-08-19
tags:
 - 测试
categories:
 - 前端工程化

---

# 如何做前端SPA网站的压力测试

## Why

由于近期将`erda`前端的web服务器由`nginx`替换成了`nestjs`写的node server，在保证功能不变的情况下，众所周知node单线程的特性，相比nginx的C，适合高IO但CPU低密集型的场景，如果node代码中有阻塞进程的逻辑存在那将可能造成整个网站无法正常访问。所以用高并发的压力测试来检验node server的性能在真正上线前就显得尤为必要。

## 工具

这里选用[JMeter](https://jmeter.apache.org/) ，主要原因是它功能全面同时又是免费的，相较**LoadRunner**等老牌压测工具更易获得

## 安装

我这里是直接使用`homebrew`直接安装

```shell
brew install jmeter
```

安装前置条件是机器必须已经安装了`Java 8`，通过在terminal直接敲`jmeter`即可启动，以下是一些安装使用过程中工具本身的坑

1. 启动后在我的机器上出现报错，产生的影响是`test plan`无法保存。附上[解决方案](https://github.com/Homebrew/homebrew-core/issues/66953#issuecomment-888302527)，如果碰到的话如此操作即可解决

![image-20210817102413840](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210817102413840.png)

2. 无法粘贴内容到jmeter中，只能手敲，非常痛苦。解决方案是换一个主题，换成**System**主题即可解决

![enter image description here](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/dwWp3.png)

## 配置

我们的目标是测试打开一个erda页面，从输入链接到页面渲染完成，这个完整过程中，服务器所要承受的所有请求的集合。因为我们的网站是SPA的，即在加载HTML过程中，通过执行scripts，会同步加载海量的资源文件，同时还会调用一些后端API。 所以简单地请求一个页面路由地址肯定是不够的

我这边参考[官方教程](https://jmeter.apache.org/usermanual/jmeter_proxy_step_by_step.html)，来做一个测试脚本录制

- 通过模板创建一个测试计划，这样就会有一个默认的录制脚本测试计划被创建好了

![image-20210819102537771](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210819102537771.png)

- 在默认HTTP Request配置中确认要测试的协议和域名

![image-20210819103021251](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210819103021251.png)

- 开启录制

这步就比较复杂了，jmeter在录制时会启动一个代理服务器，默认开在8888端口，即你想要测试访问的网站，会经由这个8888的服务器来做一层代理。所以首先第一步是要在浏览器中指明这个代理，官方推荐Firefox，我这边也跟随官方，将代理配置成如下图

![image-20210819103727865](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210819103727865.png)

此时点击脚本录制的开始按钮

![image-20210819103944327](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210819103944327.png)

会弹出一个关于证书提示框，大致意思就是会自动生成一个7天有效的CA证书，如果没有这个证书，那么请求就会被浏览器因为安全策略拦截，即无法继续录制

![image-20210819104008452](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210819104008452.png)

这个生成的文件会在`/usr/local/Cellar/jmeter/5.4.1/libexec/bin `这个目录下找到

![image-20210819104420556](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210819104420556.png)

然后就是按照文档，把这个证书导入到Firefox中

![image-20210817111139840](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210817111139840.png)

此时再点击开始录制按钮，在火狐访问https://erda.hkci.terminus.io/erda，就可以正常访问了，至此准备工作基本完毕

## 录制

我这次就以个人仪表盘页面作为测试的目标页面，通过从输入链接到最后页面可交互，总共需要发起160个请求

![image-20210819105352530](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210819105352530.png)

按Stop结束录制，此时点击到`View Result Tree`，发现被捕捉到的仅有20个左右的请求，且都是非静态文件的请求，这里查阅了下官方，大致意思就是官方认为静态文件是没太大必要测试的，只有那些有逻辑的后端处理才有必要压测。但是鉴于我们这次的升级改造主要功能依然是一个静态服务器，所以静态文件的测试还是不能省略

![image-20210819105504796](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210819105504796.png)

解决方法是来到`Request Filtering` tab，将下面这个pattern去掉

![image-20210819110349839](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210819110349839.png)

此时再录制一遍，就是得到所有的Request了。至此录制工作就结束了，接下来就可以通过并发这些请求来模拟服务器的压力测试了。

## 测试

点击启动按钮开始测试

![image-20210819111100657](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210819111100657.png)

结束后，点击查看结果，发现除了静态文件外，其他请求都失败了，原因是录制脚本是我们是有登陆的状态的，而在测试时是无状态的，后端请求都会返回401

![image-20210819111321952](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210819111321952.png)

我这里的解决方法比较简单粗暴，官方有更科学的登陆操作步骤，我这里就不做了。

在最初模板中生成的Cookie Manager中粘贴自己的cookie

![image-20210819112132693](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210819112132693.png)

此时再跑一次，所有的请求就应该全部返回200了

- 现在开始正式测试，配置为200个线程模拟200个用户并发，重复10次

![image-20210819112440519](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210819112440519.png)

- 在开始前再添加一个`Test Summary`，以便做结果统计

![](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210819112701226.png)



## 结果

最后我跑了200 * 1的请求，因为200 * 10会把自己电脑跑死，结果如下

![image-20210819133700568](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210819133700568.png)

会有0.13%的错误发生。检查了下server的log并没有错误日志，暂时断定是网关这里报的错。

最后查看下容器监控，在200的并发下，

- CPU： 保持在20%以下
- 内存： 浮动大约从平时的50M提升到100M，但还是在警戒以下
- 磁盘： 会有两个波峰，但总体稳定
- 网络：如预期增长，峰值达到1M/s

![image-20210819134011287](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210819134011287.png)

## 总结

在简单的压力测试下，目前的单节点node server基本可以抗下200的并发量，可以考虑正常上线