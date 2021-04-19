---
title: 模块联邦详解
date: 2021-04-01
tags:
 - Webpack
 - 模块联邦
categories:
 - 前端工程化



---

## 什么是模块联邦

> Code sharing coordinated at runtime   — Zack Jackson

## 想要解决的问题

### 扩展难题

- 中型项目向大型项目扩展时，遇到公共代码难以共享的困境
- 如何让独立部署的应用能集成起来，或反之让大型项目做拆分

### 协作难题

- 多开发团队与项目，如何协同开发和部署
- 更简单的微前端解决方案（低成本的学习曲线）
- 避免无意义的CI步骤（不需要去拉取编译无关的项目）

### 性能难题

- 避免三方库的重复加载
- 按需加载

### 共享难题

- 很难得到共享模块的更新（e.g. common模块修复了一个bug，但你完全不知情，还在持续与这个bug斗争）
- 不同团队既可以用同样技术栈（包括version），也可以自由选择技术栈

<!-- more -->

## 过往的解决方案

### N合1

各个项目可以独立开发，但是无法做到独立部署后集成，当需要做部署时，哪怕只是一行代码的改动，也需要拉取所有用到项目工程的代码，然后统一做CICD，随着项目越做越大，编译部署的速度也变得越来越慢，此时整个项目就是一个巨石项目，耦合性强且难以维护

### Externals

比N合1有更好的编译性能，但所有项目的依赖也因此被锁定在主应用上，无法自由得去定义，非常不灵活

### DLL

同上，各个应用必须依赖于外部的代码定义，集成风险大



## 概念

![image-20210331143419072](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210331143419072.png)

万物皆可共享，不论是组件、页面还是方法逻辑，简单得理解就是能用`import`引用的东西，理论上都可被共享

### Host

 广义得讲只要是引用了别的webpack build expose的内容的webpack构建就是Host

### Remote

被Host所消费（consume）的webpack build

### Bidirectional Hosts（双向Host）

两个webpack build互相为Host

![image-20210331160134849](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210331160134849.png)

### Omnidirectional hosts（全面Host）

所有的webpack build都可被认为是host，同时也是consumer，所有模块可以共享同一份的公共依赖，提供了版本协商机制，可以选取出最佳的版本来被共享，如果某个模块的依赖于其他模块不兼容，可以使用其独立的依赖

![image-20210331160245408](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210331160245408.png)

### 容器

各自独立打包编译，大大提升构建性能，只加载一次的不仅仅是shared的三方库，也包括各个remote暴露的内容

![1608851582909](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/1608851582909.png)



### 全景图

![1608851802459](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/1608851802459.png)



## 如何使用

从实操角度看，模块联邦本身是一个普通的 Webpack 插件 `ModuleFederationPlugin`，插件有几个重要参数：

- `name` 当前应用名称，需要全局唯一。
- `fileName`  表示`remoteEntry`的文件名。可以省略，不写的时候则为`name`.js

- `remotes` 可以将其他项目的 `name` 映射到当前项目中。

- `exposes` 表示导出的模块，只有在此申明的模块才可以作为远程依赖被使用。

- `shared` 比较核心的参数，控制三方库共享的策略

比如设置了`remotes: { app2: "app2@http://localhost:3002/remoteEntry.js" }`，即表示一个部署在这个url的应用暴露了一个容器，我们可以在host的代码中直接引用这个容器expose的组件，exposes: { ‘./Button’: ‘./src/Button’ }

```javascript
// host中引用remote
import RemoteButton from "app2/Button";

// 在remotes的配置中，以下为例，属性名app2是可以自定义的，用于host自己导入时用的名字
// 第二个app2@，必须和remote中取的name一致
// remotes: { app2: "app2@http://localhost:3002/remoteEntry.js" }
```



## 实现流程（一个host对一个remote共享React）

![share scope workflow (2)](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/share scope workflow (2).png)

1. 加载页面，开始加载host的webpack build
2. webpack_require.e("node_modules_xxx_sharing_co-9caf20")
3. webpack_require.f.consumes, 发现这个chunk里有shared library
4. 调用shared library的加载方法， 即loadStrictVersionCheckFallback
5. 执行一个init的柯里化高阶函数， 调用webpack_require.I
6. host注册host的依赖, 注册结果是一个对象，包含一个get方法即拿到对应url，from：从哪个app来，eager：是否紧急
7. 执行initExternal，开始初始化remote
8. 加载remote的remoteEntry.js chunk，然后执行remote的init方法，并传入刚才已经完成host注册的shared scope
9. remote注册自己的依赖到shareScope，此时host和remote的shareScope被合并在了一起，并在结束后一并传会给host
10. loadStrictVersionCheckFallback得到整个shared scope，然后依据host的`required version`运算**`semver`**规则得到合适版本（只是给host用的）
11. 加载remote的异步组件，发现它需要react， 会进入remote的loadStrictVersionCheckFallback，依据remote的`required version`计算得到合适的版本给remote



### 流程总结

以上内容简短总结起来就是，异步加载host和remote的入口文件，收集所有shared依赖，通过semver规则得到最佳版本，然后分别为双方加载依赖。



```
__webpack_require__.f.j  // 异步加载chunk
__webpack_require__.f.consumes  // 加载某个模块时，如果这个模块内需要依赖shared的library，那么就需要这个方法去执行loadXXXVersionCheckFallback， 然后调用__webpack_require__.I去注册shared scope及initExternal
__webpack_require__.I // 用于初始化shared scope，整合host与remote的shared scope
__webpack_require__.f.remotes // 加载某个模块时，如果这个模块内包含remote的expose内容，那么就要执行这个方法，去加载remote的expose
```



## Q & A 

Q：在同样版本的share库，到底是从父还是子，还是任意一个子里面加载？

A：不一定，看package.json中的name，字符串比较谁大就从谁这里取

------

Q：为什么编译入口都要变成异步的？

A：同步就意味着那个shared的library都被编译在了同步代码中，即使用`code split`，也表示它跳过了version check这个步骤，随之就会报**`Uncaught Error: Shared module is not available for eager consumption`**这个错误

------

Q：webpack会把remote的导入编译成什么，怎么在运行时找到它？

A：类似于`externals`，相当于一个占位模块，在运行时载入

------

Q：`eager`代表什么意义？

A：代表这个共享library将被编译成同步代码块，包含在host或remote的entry中，并跳过version check。**但是**不代表它就不能共享代码块了，只是当带有`eager`的模块载入时，无条件使用eager的版本，如果后续的remote载入时发现这个版本是兼容的，依然可以共享代码块

------

Q：`singleton`代表什么意义？

A：代表不论有多少个不同版本，只要确定了初始版本，后面的remote都必须使用这个版本，即使最终会报错

------

Q：requiredVersion代表什么意义？

A：如果不指定就会默认找package.json中的version配置，这里可以手动覆盖之

------

Q：semver规则是怎样的？

A：非常复杂，具体请参考[semver官方](https://semver.org/lang/zh-CN/)。举个例子：

在非`singleton`的情况下：

caseA： 两边的实际版本分别是1.2.3和1.5.0，package.json的设置分别是^1.2.3和^1.5.0

根据semver规则可以理解为，只要版本大于等于1.5.0且小于2.0.0，那么对双方都适用

此时就会选择共享使用高的次版本1.5.0，同理对patch版本号也是如此。 

caseB： 两边实际版本分别是1.2.3和2.0.0，package.json的设置分别是^1.2.3和^2.0.0

根据semver规则，跨主版本被认定为无法兼容，即如果使用2.x的版本对1.x的应用是无法兼容的

此时两边将会各下载一份library依赖。 

如果在`singleton`模式下：

在caseA的情况下，情况和非单例情况相同

在caseB的情况下，会强行共享使用host的版本即1.2.3，但会在控制台打印一句`sxxxxxx`

------

Q：所有的remote expose的内容都会在初始化页面时被加载吗？

A：不是，完全是按需加载

------

Q：一定会在页面初始化时去做版本协商吗？

A：初始化时如果host的entry有依赖至少一个shared libray，那么就会做version check，否则只会在后续按需协商

------

Q：如果不设置shared是不是永远不会共享library？

A：是的

------

Q：一个工程下的代码，如果通过两个host去暴露，会初始化几次？

A：两次，所以一段代码除非特殊情况，只能被一个webpack build去expose

------

Q：引入的组件必须要写成异步引入的语法吗？

A：remote引入的组件既可以是同步，也可以是异步引入

------

Q：shared scope中的library会和别的不共享的module混在一起吗？

A：不会的，只要被设置为共享的library，它都会单独编译成一个chunk，不会像普通的module，如果没有加`split chunk`规则就会混合成一个大的`vendor chunk`



## 参考

[Webpack 5 Module Federation - Zack Jackson - CityJS Conf 2020](https://www.youtube.com/watch?v=-ei6RqZilYI&t=2526s)

[Getting Started With Federated Modules](https://module-federation.github.io/blog/get-started)

