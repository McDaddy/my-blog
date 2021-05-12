---
title: 生产环境调试
date: 2020-12-01
tags:
 - webpack
categories:
 - 前端工程化
---

当我们在生产环境上出现崩溃级别的错误时，我们往往只能看到如下这种编译压缩之后的代码。直接点进去即使format之后也很难准确得判断这个问题到底出现在哪个源文件或者哪个函数中，只能靠上下文的一些关键字来搜索代码。虽然我们也可以连接VPN直接调试代码，但那样是有合规风险的。 这里提供一个调试生产环境代码的思路。

![image-20201201115502830](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20201201115502830.png)

![image-20201201115613233](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20201201115613233.png)

## 开启sourcemap

我们知道在生产环境中是不能把sourcemap暴露出去的。但是我们可以选择开启`hidden-source-map`将sourcemap文件保留在本地，这样当出现问题时就可以直接用来调试。

![image-20201201135841589](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20201201135841589.png)

## 起一个sourcemap的静态服务

打包编译完成后可以把map文件都放在一个文件夹下，然后起一个http静态服务器，使其可被访问。推荐两种快速起server的方法，一种是用`http-server`这个三方包，第二种是用Python命令`python -m SimpleHTTPServer 8081`可以达到同样效果。

![image-20201201134124574](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20201201134124574.png)

## 添加sourcemap

在Chrome的source tab，非format的源码上右键选择`Add source map…`，在弹出的框中写入对应chunk的map地址url， 如：`http://127.0.0.1:8081/c0e7bee9c96bfaaf1f41.chunk.js.map`

![image-20201201134048910](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20201201134048910.png)

此时source里面就会多一个webpack的文件夹（跟本地一样）然后就可以直接在生产环境调试了。

![image-20201201134408962](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20201201134408962.png)