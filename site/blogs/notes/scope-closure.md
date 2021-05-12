---
title: 【笔记】- 作用域链与闭包
date: 2021-05-10
tags:
 - ES6
categories:
 - JavaScript
 - 笔记


---

## 作用域链

什么是作用域链，在 JavaScript 里面，函数、块、模块都可以形成作用域（一个存放变量的独立空间），他们之间可以相互嵌套，作用域之间会形成引用关系，这条链叫做作用域链。

## 静态作用域链

就是可以通过分析代码直接得到关系结果的链条，比如下面这段代码，站在`func3`的位置，如果要查找一个变量，它的查找顺序是固定的，先从自身找，然后是`func2`，最后是`func`。 而这一中关系就成为作用域链

```javascript
  function func() {
    const guang = 'guang';
    function func2() {
      const ssh = 'ssh';
      {
        function func3 () {
          const suzhe = 'suzhe';
        }
      }
    }
  }
```

JavaScript有一个特性就是可以return函数，如下这种情况，当func被执行完成后，得到f2，此时外层的func出栈所以作用域应该销毁，但是内层的函数f2，还在引用外层的变量，那么func的作用域到底要不要销毁呢？

```javascript
function func () {
  const a = 1;
  return function () {
    console.log(a);
  }
}
const f2 = func();
```

## 闭包

此时就要闭包出场了

### 首先考虑父作用域要不要销毁？

答案是肯定的，假设父作用域上有100w个变量，而子函数只引用了一个，那如果不销毁，立即会出现内存问题

### 销毁后，子函数怎么保留父作用域的引用？

销毁父作用域后，把用到的变量包起来，打包给子函数，放到一个属性上。这就是闭包的机制。即function的[[Scope]]

![image.png](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/88178215cc7d4e76a77df1add6de120e~tplv-k3u1fbpfcp-watermark.image)

**闭包是返回子函数的时候扫描函数内的标识符引用，把用到的本作用域的变量打成 Closure 包，放到 [[Scopes]] 里。**没用的就被销毁了。并且按照函数的嵌套层级，一层层叠加，第0层是离自己最近的作用域函数，最后一位是window或者global

## 动态作用域链

为什么说我们要避免使用`eval`，如下情况，如果用eval，js解析器是没法知道子函数到底引用了外面哪些变量，为了不遗漏，只能把整个作用域链都保留下来，即父作用域没有被销毁，随之产生内存问题

![image.png](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/143b186936554141aa84525a708c7eea~tplv-k3u1fbpfcp-watermark.image)

## 总结

闭包是在函数创建的时候，让函数打包带走的根据函数内的外部引用来过滤作用域链剩下的链。它是在函数创建的时候生成的作用域链的子集，是打包的外部环境。evel 因为没法分析内容，所以直接调用会把整个作用域打包（所以尽量不要用 eval，容易在闭包保存过多的无用变量），而不直接调用则没有闭包。

过滤规则：

1. 全局作用域不会被过滤掉，一定包含。所以在何处调用函数都能访问到。
2. 其余作用域会根据是否内部有变量被当前函数所引用而过滤掉一些。不是每个返回的子函数都会生成闭包。（虽然我返回了函数，但是函数没引用，这也不是闭包）
3. 被引用的作用域也会过滤掉没有被引用的 binding （变量声明）。只把用到的变量打个包。

## 参考

[JavaScript 的静态作用域链与“动态”闭包链](https://juejin.cn/post/6957913856488243237)