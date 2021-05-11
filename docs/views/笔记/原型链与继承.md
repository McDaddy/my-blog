---
title: 【笔记】- 原型链与继承
date: 2020-05-13
tags:
 - ES6
categories:
 - JavaScript
 - 笔记

---

## 创造对象的方式

1. 每次创造一个新空对象，然后往里面加属性，或者利用工厂。这种方式的问题是最后得到的对象没法判断它的类型，得到的类型永远是Object

   ```javascript
   const Player = new Object();
   Player.color = "white";
   Player.start = function () {
    console.log("white下棋");
   };
   // 工厂
   function createObject() {
    const Player = new Object();
    Player.color = "white";
    Player.start = function () {
    		console.log("white下棋");
   	};
   	return Player; 
   }
   ```

   <!-- more -->

2. 构造函数/实例

   通过 this 添加的属性和⽅法总是指向当前对象的，所以在实例化的时候，通过 this 添加的属性和⽅法都会在内存中复制⼀份，这样就会**造成内存的浪费**。好处是对象间是隔离的，不会因为修改属性互相影响

   ```javascript
   function Player(color) {
    this.color = color;
    this.start = function () {
     console.log(color + "下棋");
    };
   }
   const whitePlayer = new Player("white");
   const blackPlayer = new Player("black");
   ```

3. 原型

   好处是**只在内存中创建⼀次**，实例化的对象都会指向这个 prototype 对象。

   ```javascript
   function Player(color) {
    this.color = color; 
   }
   Player.prototype.start = function () {
    console.log(color + "下棋");
   };
   const whitePlayer = new Player("white");
   const blackPlayer = new Player("black");
```
   
   

## 原型及原型链

原型prototype就是一个对象所以可以一次赋值

```javascript
Player.prototype = {
 start: function () {
 		console.log("下棋");
	},
 	revert: function () {
 		console.log("悔棋");
	},
};
```

如何获取原型

```javascript
function Player(color) {
this.color = color; }
Player.prototype.start = function () {
 console.log(color + "下棋");
};
const whitePlayer = new Player("white");
const blackPlayer = new Player("black");
console.log(blackPlayer.__proto__); // Player {}
console.log(Object.getPrototypeOf(blackPlayer)); // Player {}，可以通过
Object.getPrototypeOf来获取__proto__
console.log(Player.prototype); // Player {}
console.log(Player.__proto__); // [Function]
```

原型链的流程图

![image-20200513152840370](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200513152840370.png)

## new 关键字

new的主要步骤， 假设要实现 `new Player()`

1. 创建一个空对象
2. 新对象的\_\_proto\_\_指向Player的prototype
3. 执行构造函数，将this指向新对象
4. 如果构造函数没有显示返回则返回this
   如果构造函数有显示返回，但返回的类型是基本类型如string、number等，那还是返回this
   如果构造函数返回的是一个对象，那就返回这个对象

#### 手写一个new

```javascript
function objectFactory() {
	let obj = new Object(); // 1. 创建一个空对象
	let Constructor = [].shift.call(arguments); // 取出第一个参数，也就是构造函数，同时arguments也被移除了一位
 	obj.__proto__ = Constructor.prototype; // 2. 新对象的__proto__指向Player的prototype
	let ret = Constructor.apply(obj, arguments); // 执行构造函数，把obj通过apply绑定到构造函数中，如果构造函数中有类似this.xx = xx的情况，这个this就是obj
	return typeof ret === "object" ? ret : obj; // 如果ret对象就返回ret，否则返回obj
}
```



## 继承

#### 原型链继承

```javascript
function Parent() {
	this.name = "parentName";
  this.obj = { a: 1 };
}
Parent.prototype.getName = function () {
 console.log(this.name);
};
function Child() {}
// Parent的实例同时包含实例属性⽅法和原型属性⽅法，所以把new Parent()赋值给Child.prototype。
// 如果仅仅Child.prototype = Parent.prototype，那么Child只能调⽤getName，⽆法调⽤.name
// 当Child.prototype = new Parent()后， 如果new Child()得到⼀个实例对象child，那么
// child.__proto__ === Child.prototype;
// Child.prototype.__proto__ === Parent.prototype
// 也就意味着在访问child对象的属性时，如果在child上找不到，就会去Child.prototype去找，如果还找不到，就会去Parent.prototype中去找，从⽽实现了继承。
Child.prototype = new Parent();
// 因为constructor属性是包含在prototype⾥的，上⾯重新赋值了prototype，所以会导致Child的constructor指向[Function: Parent]，有的时候使⽤child1.constructor判断类型的时候就会出问题
// 为了保证类型正确，我们需要将Child.prototype.constructor 指向他原本的构造函数Child
Child.prototype.constructor = Child;
var child1 = new Child();
child1.getName(); // parentName

// 问题：
// 1. 如果Parent的属性是对象属性，那么所有的child的原型都指向同一个new Parent()，如果某个child改了obj，那么其他child也会被影响
// 2. 创建child无法给Parent传参
```

#### 构造函数继承

为了解决上面的问题1，思路就是如何把可能通用的属性在各个子上都复制一遍

```javascript
function Parent(name, actions) {
	this.actions = actions;
	this.name = name; 
  this.eat = function () {}
}
function Child(id, name, actions) {
 Parent.call(this, name); // 如果想直接传多个参数, 可以Parent.apply(this, Array.from(arguments).slice(1));
	this.id = id; 
}
const child1 = new Child(1, "c1", ["eat"]);
const child2 = new Child(2, "c2", ["sing", "jump", "rap"]);
console.log(child1.name); // { actions: [ 'eat' ], name: 'c1', id: 1 }
console.log(child2.name); // { actions: [ 'sing', 'jump', 'rap' ], name: 'c2', id: 2 }
```

缺点： Parent的方法必须定义在父的构造函数中，每次new Child都要额外为方法开辟一块内存，但事实上方法是不需要对象间隔离的

#### 组合继承

```javascript
function Parent(name, actions) {
  this.name = name;
  this.actions = actions; 
}
Parent.prototype.eat = function () {
 console.log(`${this.name} - eat`);
};
function Child(id) {
  Parent.apply(this, Array.from(arguments).slice(1));
	this.id = id; 
}
Child.prototype = new Parent();
Child.prototype.constructor = Child;
const child1 = new Child(1, "c1", ["hahahahahhah"]);
const child2 = new Child(2, "c2", ["xixixixixixx"]);
child1.eat(); // c1 - eat
child2.eat(); // c2 - eat
console.log(child1.eat === child2.eat); // true
```

问题: 调用了两次构造函数，apply一次，new Parent一次

#### 寄⽣组合式继承

为了解决上面的问题，很明显apply是没法省的，因为要复制属性，那么回到原型链继承的实现，使用`new Parent()`是为了让child拿到属性，但现在属性已经由apply构造函数继承包了，所以可以直接用`Child.prototype = Parent.prototype`。但是这样的话修改直接Child.prototype也会改了Parent，所以用一个Object.create包一层。

```javascript
Child.prototype = Object.create(Parent);
Child.prototype.constructor = Child;

// 模拟一个Object.create
// 本质就是把一个空方法的prototype指向Parent，然后new这个空方法
let TempFunction = function () {};
TempFunction.prototype = Parent.prototype;
Child.prototype = new TempFunction();
```

