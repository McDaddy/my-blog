---
title: 【笔记】- JavaScript基础
date: 2020-05-13
tags:
 - ES6
 - HTML
categories:
 - JavaScript
 - 笔记
---

## 执⾏上下⽂

当函数执⾏时，会创建⼀个称为执⾏上下⽂（execution contex）的环境，分为创建和执⾏2个阶段

<!-- more -->

### 创建阶段

创建阶段，指函数被调⽤但**还未执⾏**任何代码时，在这个时候就出现了变量提升，此时创建了⼀个拥有3个属性的对象：

```javascript
// 这是一个隐式不存在的变量
executionContext = { 
  scopeChain: {}, // 创建作⽤域链（scope chain） 
  variableObject: {}, // 初始化变量、函数、形参 
  this: {} // 指定this 
}
```

### 代码执⾏阶段

代码执⾏阶段主要的⼯作是：1、分配变量、函数的引⽤，赋值。2、执⾏代码。

```javascript
// ⼀段这样的代码 
function demo(num) { 
  var name = 'kuimo'; 
  var getData = function getData() {}; 
  function c() {} 
}
demo(100);

// 创建阶段⼤致这样，被调用但没执行，所以num这个参数存在，在这个阶段就出现了【变量提升(Hoisting)】 
executionContext = { 
  scopeChain: { ... }, 
  variableObject: {
    arguments: { // 创建了参数对象 
      0: 100, length: 1 
    },
    num: 100, // 创建形参名称，赋值/或创建引⽤拷⻉ 
    c: pointer to function c() // 有内部函数声明的话，创建引⽤指向函数体 
    name: undefined, // 有内部声明变量a，初始化为undefined 
    getData: undefined // 有内部声明变量b，初始化为undefined 
  },
  this: { ... } 
}
  
// 代码执⾏阶段，在这个阶段主要是赋值并执⾏代码 
executionContext = { 
  scopeChain: { ... }, 
  variableObject: { 
    arguments: { 0: 100, length: 1 },
    num: 100, 
    c: pointer to function c(),
    name: 'kuimo', // 分配变量，赋值 
    getData: pointer to function getData() // 分配函数的引⽤，赋值 
  },
  this: { ... } 
}
```

## 作用域

JavaScript中只有全局作用域和函数作用域，在**ES6中加入了块级作用域**

作⽤域是在函数执⾏上下⽂**创建**时定义好的，**不是**函数执⾏时定义的。**总结起来**就是会不会向外找，往哪儿找都是定义函数的时候决定的，不是运行时决定的。更形象一点说js都是`词法`作用域

```javascript
var myname = 'window'
function a () { 
  var myname = 'a'
  return function b() { 
    var myname = 'b'; // 如果同时去掉这句和上面两句myname的赋值，下面的log就会报错
    console.log(myname); // b 
  } 
}
var b = a(); 
function c() { 
  var myname = 'c'; // 这个myname属于func c的函数作用域
  b(); // b在这里是一个已经被定义好的函数，他的作用域属于a，所以作用域链如果在b、a和window都找不到myname的定义那么就会报错
}
c(); 
```

## 作⽤域链

当⼀个块或函数嵌套在另⼀个块或函数中时，就发⽣了作⽤域的嵌套。在当前函数中如果js引擎⽆法找到某个变量，就会往上⼀级嵌套的作⽤域中去寻找，直到找到该变量或抵达全局作⽤域，这样的链式关系就称为作⽤域链(Scope Chain) 。具体见上了栗子

## 闭包

官方解释：闭包是指有权访问另外⼀个函数作⽤域中的变量的函数.可以理解为(能够读取其他函数内部变量的函数) 

主要用于私有化变量、缓存变量和柯里化函数

```javascript
function outer() { 
  var top = xxxx; 
  function inner() {
    // inner可以读到outer的变量
    xxx.innerHTML = top; 
  } 
}
```

## this

主要5种场景，其中前三种最为常见

1. 函数直接调⽤时, 也就是找不到调用方的时候

   ```javascript
   function myfunc() { 
   	console.log(this) // this是widow 
   }
   var a = 1; 
   myfunc();
   ```

2. 函数被别⼈调⽤时，一般来说就是找到.

   ```javascript
   function myfunc() { 
   	console.log(this) // this是对象a 
   }
   var a = { myfunc: myfunc };
   a.myfunc();
   ```

3. new⼀个实例时

   ```javascript
   function Person(name) { 
   	this.name = name; 
   	console.log(this); // this是指实例p 
   }
   var p = new Person('kuimo');
   ```

4. apply、call、bind

   ```javascript
   function getColor(color) { 
   	this.color = color; 
     console.log(this); 
   }
   function Car(name, color){ 
     this.name = name; // this指的是实例car 
     getColor.call(this, color); // 这⾥的this从原本的getColor，变成了car实例
   }
   var car = new Car('卡⻋', '绿⾊');
   ```

5. 箭头函数 指向包裹这个箭头函数的函数体的this

![image-20200513112134884](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200513112134884.png)

易错点

```javascript
// This 相关
// 1.
function show () { 
  console.log('this:', this); // 此时show虽然在obj下被调用，但是真的被调用的时候
}
var obj = {
  show: function () { 
    show(); 
  } 
};
obj.show();

// 2.
var obj = { 
  show: function () { 
    console.log('this:', this); // 此时的this就是这个function new出来的实例
  } 
};
var newobj = new obj.show();
// 效果等同于 var newobj = new (obj.show)();

// 3.
var obj1 = { name: 'obj1' }
var obj2 = { 
  name: 'obj2',
  show: function () { 
    console.log('this:', this); 
  } 
};
var newobj = new (obj2.show.bind(obj1))(); // 输出 show {}, 无论怎么bind，new的时候的this还是指向本体实例
obj2.show.bind(obj1)(); // 输出obj1

// 4.
var obj = { 
  show: function () { 
    console.log('this:', this); 
  } 
};
var elem = document.getElementById('book-search-results'); 
elem.addEventListener('click', obj.show); // 绑定事件的元素，也就是elem
elem.addEventListener('click', obj.show.bind(obj)); // obj
elem.addEventListener('click', function () { 
  obj.show();  // obj
});
elem.addEventListener('click', () => obj.show()); // obj

// 5.
const obj = {
  a: 1,
  next: () => {
    console.log(this); // 此时在浏览器输出window，在node输出global {}, 箭头函数的this找的是它上一层的函数，注意是函数， 如果是对象包着它，那么它就会继续向上找函数，直到找到顶层
  }
}
obj.next();
```

