---
title: 不定期更新的Chrome小技巧
date: 2020-05-22
tags:
 - Chrome
categories:
 - 工具
sidebar: false
---

Chrome作为最重要的开发工具之一，多积累一些小技巧，努力提升调试的开发效率

<!-- more -->

#### **重新发起`xhr`请求**

当调试比较复杂的form post请求时，后端总是不通，可以用这个重新发起请求来直接测试接口结果

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/1722a93a510e2d22.gif" alt="img" style="zoom: 33%;" />

#### **编辑页面上的任何文本**

```javascript
document.body.contentEditable="true"
// 或者
document.designMode = 'on'
```

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/1722a93a55292857.gif" alt="img" style="zoom:50%;" />

#### 模拟慢网速和慢处理器的方法

![image-20200522190405410](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200522190405410.png)

#### 巨长的结构体如何复制到剪切板

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/1722a93aa2c22452.gif" alt="img" style="zoom:33%;" />

#### 如何快速得测试自适应

<img src="https://user-gold-cdn.xitu.io/2020/5/19/1722a93b7e64c956?imageslim" alt="img" style="zoom:50%;" />

#### 直观打出数组对象

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/1722a93b9db53e5b.png" alt="img" style="zoom: 50%;" />

#### network的filter

可以支持很多条件参数，比如 

- larger-than 
- status-code 
- mixed-content:all 
- scheme:http 
- domain

把 HTML 元素做为 js 变量，选中元素右键，选择 Store as global ，就可以在 js 控制台直接写 js 操作 dom 了

console.dir 可以把上面Store as global 变成变量的dom元素的属性都打印出来