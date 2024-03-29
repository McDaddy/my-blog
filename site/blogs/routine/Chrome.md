---
title: 不定期更新的Chrome小技巧
date: 2020-05-22
tags:
 - Chrome
categories:
 - 工具
---

Chrome作为最重要的开发工具之一，多积累一些小技巧，努力提升调试的开发效率

<!-- more -->

## **重新发起`xhr`请求**

当调试比较复杂的form post请求时，后端总是不通，可以用这个重新发起请求来直接测试接口结果

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/1722a93a510e2d22.gif" alt="img" style="zoom: 33%;" />

## **编辑页面上的任何文本**

```javascript
document.body.contentEditable="true"
// 或者
document.designMode = 'on'
```

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/1722a93a55292857.gif" alt="img" style="zoom:50%;" />

## 模拟慢网速和慢处理器的方法

![image-20200522190405410](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200522190405410.png)

## 巨长的结构体如何复制到剪切板

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/1722a93aa2c22452.gif" alt="img" style="zoom:33%;" />

## 如何快速得测试自适应

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/1722a93b7e64c956.gif" alt="img" style="zoom:50%;" />

## 直观打出数组对象

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/1722a93b9db53e5b.png" alt="img" style="zoom: 50%;" />

## network的filter

可以支持很多条件参数，比如 

- larger-than 
- status-code 
- mixed-content:all 
- scheme:http 
- domain

把 HTML 元素做为 js 变量，选中元素右键，选择 Store as global ，就可以在 js 控制台直接写 js 操作 dom 了

console.dir 可以把上面Store as global 变成变量的dom元素的属性都打印出来

## 在控制台导入npm包

安装**Console Importer** 

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200630153931822.png" alt="image-20200630153931822" style="zoom:80%;" />

## 快捷键

```shell
#快速切换控制台位置
CMD + Shift + D

document.querySelectorAll('div') === $$('div')
```



## 利用打断点动态打log

![img](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/ninjalog.gif)

## 通过initiator直接跳转到请求触发的代码

![img](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/initiator.gif)


## 如何调试通过hover js动态产生的DOM

先把dev tool切换到Source面板，在这个DOM出现在页面之后，**按下F8**，这样就能停住当前页面所有的js代码执行，这样就阻止了停止hover之后DOM被JS销毁的问题！