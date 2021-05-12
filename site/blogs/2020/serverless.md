---
title: Serverless实战—博客的Serverless迁移
date: 2020-06-28
tags:
 - Serverless
categories:
 - 前端工程化
---

从今天开始此博客的部署从阿里云ECS服务器迁移到阿里云的函数计算（FC）

在这里简单描述下整个迁移过程

<!-- more -->

## 原部署方法

之前最初为了部署博客，直接想到的就是购买一台云主机来部署我的静态网站，于是第一个想到的就是购买阿里云的ECS服务器，一台1核2G内存的机器即使有新用户优惠也需要102元一年，而且第二年续费的费用会越来越高。

具体的部署方法就是通过启动ECS的nginx服务，然后通过`Transmit`工具，在每次本地编译完成后把打包文件上传到对应的root文件夹，这样就相当于启动了一个简单的静态服务器。然后把ECS的地址挂到对应的域名<u>blog.kuimo.top</u>下。

但实际上，这个博客的访问量还处在一个几乎没有访问量的阶段（手动捂脸）🤦‍♂️， 所以对于一台完整的ECS来说完全是大材小用了。这部分运维的成本完全是不必要的。

## 关于ServerLess

Serverless最大的优势我想就是把运维的粒度降到了函数级别，从以前的按机器收费，转变成了完全按流量收费，而这个收费标准对于访问量不大或者说计算量不大的应用来说是非常诱人的。

![image-20200628005850310](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200628005850310.png)

这个免费额度也是没谁了，感觉可以一直白嫖的既视感。

## 迁移流程

整个迁移流程其实很简单，但中间饶了一些弯路，总的还是花了不少时间来过河

1. 安装Fun [Fun教程](https://help.aliyun.com/document_detail/140283.html?spm=a2c4g.11186623.6.763.563d269cWfMu26)

2. 因为阿里云函数计算是支持从各种已有框架直接迁移，而不必实现它的那套接口标准，所以直接通过 [迁移 Express 到函数计算](https://help.aliyun.com/document_detail/160676.html?spm=a2c4g.11174283.6.750.20685212LYSGW6)，创建一个基于我们比较熟悉的`express`的web应用，然后直接推送到远端

3. 将express demo中没有用的代码去掉，只留下static的部分用来做静态服务器

   ```javascript
   var express = require('express');
   var path = require('path');
   var app = express();
   
   app.use(express.static(path.join(__dirname, 'public')));
   
   module.exports = app;
   ```

4. 书写一个本地发布的脚本，主要流程就是每次要发布时，先执行本地编译打包，然后把结果拷贝到express的public文件夹，最后通过Fun来直接部署发布

   ```javascript
   #!/usr/bin/env node
   
   const child_process = require('child_process');
   
   const { execSync } = child_process;
   
   console.log('清除老文件');
   execSync('rm -rf ./express-test/public', { stdio: 'inherit' });
   
   console.log('开始编译打包');
   execSync('npm run build', { stdio: 'inherit' });
   
   console.log('开始拷贝编译后文件');
   execSync('cp -r public express-test', { stdio: 'inherit' });
   
   console.log('开始发布');
   execSync('fun deploy -y', { stdio: 'inherit' });
   
   console.log('发布完成');
   ```

5. 将自定义域名执行函数计算的地址
   <img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200628011308551.png" alt="image-20200628011308551" style="zoom:50%;" />

这样就基本完成了一个自动发布的全流程，之前走的弯路主要是当时想用NAS来托管我的静态文件内容，弄了半天都没弄成，但这总共几兆的内容对NAS来说也是杀鸡用牛刀了，虽然也是按量计费几乎不怎么用花钱，但现在资源作为函数一部分感觉更加合适。