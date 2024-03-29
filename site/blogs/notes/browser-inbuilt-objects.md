---
title: 【笔记】- 浏览器内置对象
date: 2020-05-12
tags:
 - ES6
 - HTML
categories:
 - JavaScript
 - 笔记

---

## 浏览器内置对象

### 一图说明各个环境的内置对象

其中浏览器遵循w3c规范，而JSCore遵循ECMAScript规范

如ES Module就是JSCore的内容，所以它可以看做是环境无关的JS规范本身内容，而像Common JS、AMD等模块管理都是凌驾于JS基础模块之上的各种实现。

<!-- more -->

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200512174120649.png" alt="image-20200512174120649" style="zoom:67%;" />



### **setTimeout** 和 **setInterval**

setInterval有丢帧的可能性，**根本原因**是一个定时器有且只有一个实例可以被加入到队列之中，当func3想加入时因为已经有func2在排队了，所以func3直接被忽略了

![image-20200512174750882](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200512174750882.png)

所以应该用setTImeout去模拟setInterval

![image-20200512191140718](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200512191140718.png)

### 交互相关API

`alert`、`confirm`、`prompt`这些API会阻塞JS主线程，需要谨慎使用

### **location**

一图说明location各部分意义，最常用到

- pathname 得到url路径名，**不带**query
- search 得到query，**注意**这个是带*问号*的

![image-20200512191528217](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200512191528217.png)

### document

#### 选择器：注意返回多个结果的不是数组而是类数组 Array Like

1. getElementById
2. getElementsByClassName
3. getElementsByTagName
4. querySelector  里面传的是一个选择器，就像css选择器 document.querySelector('.div’) //匹配第一个class名为div的元素
5. querySelectorAll

利用`console.dir`可以打出dom结构的属性

#### 创建元素

`createElement`可以创建tag元素，如果一次插入多个元素就要用`createDocumentFragment`来做到先拼接后一次性插入，**以此减少页面的重排**

```javascript
var fruits = ['Apple', 'Orange', 'Banana', 'Melon'];
var fragment = document.createDocumentFragment();
fruits.forEach(fruit => {
const li = document.createElement('li');
li.innerHTML = fruit;
fragment.appendChild(li);
});
document.body.appendChild(fragment);
```

#### 属性

images: 返回所有页面上的图片
anchors: 返回所有页面上的锚点
links： 返回所有页面上的a标签

### **Element**

就是指各个元素，主要属性`tagName`指代tag类型，可用于代理，主要方法：getAttribute/setAttribute

## 事件

为一个dom元素定义一个事件，三种方式

```javascript
// 1. 直接用属性来定义 缺点：视图和逻辑耦合
<p onclick="showAlert()">点击后弹出 alert </p>

// 2. 用js取出dom元素之后设属性 缺点：只能设一个事件
document.getElementsByTagName('p')[0].onclick = function() {
alert('hello world');
}
// 取消事件只需要设置 onclick 属性为 null 即可
document.getElementsByTagName('p')[0].onclick = null;

// 3. DOM2 API
// 第三个参数表示是否在捕获阶段执行, 但是IE不支持
document.getElementsByTagName('p')[0].addEventListener('click', onClickFunc, true);
// 取消事件，使⽤ removeEventListener 即可, 移除时元素的引用必须不变
document.getElementsByTagName('p')[0].removeEventListener('click',
onClickFunc);

```

### 事件捕获及冒泡

DOM2 事件规范规定，⼀个标准的事件流分为三个阶段。⾸先是⾃上⽽下的「事件捕获」状态，然后是到达真正触发事件的元素，最后再从这个元素回到顶部的「事件冒泡」。

![image-20200512194510876](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200512194510876.png)

### 事件对象

主要属性：

- target：触发事件的元素本身
- **currentTarget**：绑定事件的元素本身

比如在parent上绑定了事件，是点击点child触发的，那么target是child，currentTarget是parent

主要方法：

- stopPropagation：取消进一步的**捕获**或冒泡，也就是说即使事件是在捕获阶段触发的也可以用这个来取消后续
- stopImmediatePropagation：如果一个元素同个事件被绑定多个回调，那么其中一个回调调用了stopImmediatePropagation之后，之后注册的回调都不会执行

#### 一个兼容IE的事件模型

```javascript
var addEvent = function(element, eventType, handler) {
  if (element.addEventListener) {
		element.addEventListener(eventType, handler, false);
 	} else if (element.attachEvent) {
		element.attachEvent('on' + eventType, handler);
 	} else {
		element['on' + eventType] = handler;
 	}
}

var removeEvent = function(element, eventType, handler) {
	if (element.removeEventListener) {
		element.removeEventListener(eventType, handler, false);
 	} else if (element.detachEvent) {
		element.detachEvent('on' + eventType, handler);
 	} else {
		element['on' + eventType] = null;
 	}
}

var getEvent = function(event) {
	return event ? event : window.event; 
}

var getTarget = function(event) {
  return event.target || event.srcElement; 
}

var preventDefault = function(event) {
	if (event.preventDefault) {
		event.preventDefault();
 	} else {
		event.returnValue = false;
 	}
}

var stopPropagation = function(event) {
	if (event.stopPropation) {
		event.stopPropation();
 	} else {
		event.cancelBubble = true;
 	}
}
```

### **fetch API**

在 ES6 之后，浏览器端新增了⼀个 fetch api， 他有以下的⼏个特点：

- fetch api 返回⼀个 promise 的结果
- 默认不带 cookie，需要使⽤配置 credentials: "include”
- 当⽹络故障时或请求被阻⽌时，才会标记为 reject。**否则即使返回码是 500**，也会 resolve 这个promise
- 没有超时