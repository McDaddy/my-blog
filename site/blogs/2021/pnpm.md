---
title: PNPM实战体验
date: 2021-05-26
tags:
 - pnpm
categories:
 - 前端工程化
---

## PNPM是什么

根据其官方的描述

> Fast, disk space efficient package manager

主要两个关键词，快和磁盘高效，同时它是一个基于node的包管理工具

## 前端包管理的困境是什么

- 速度 - 每次【clone仓库/同事改了包依赖/更新包版本】后都要做一遍`npm i`，即便是在有缓存的情况下，速度依然堪忧，一个如erda-ui这种体量的`monorepos`工程几乎需要10分钟来做初始化
- 巨型的`node_modules` - 你是否已经对前端本地工程文件夹动不动上G的空间占用习以为常了？我们知道这些库我下载过，但是没办法还是需要在node_modules里再安一遍，实在是资源浪费
- npm的嵌套黑洞 - 这个后面再展开

## 为什么选择PNPM

这里就要拿出我们非常熟悉的也是最主流的`npm`和`yarn`两个同行来做对比了。从速度和磁盘效率两个维度做对比

### 速度

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/alotta-files.svg" alt="Graph of the alotta-files results" style="zoom: 50%;" />

上图的结果来自于 [benchmarks-of-javascript-package-managers](https://github.com/pnpm/benchmarks-of-javascript-package-managers)

发现不管在何种预设条件下，pnpm的安装速度都是大大优于`npm`/ `yarn`以及`yarn`的`PnP`安装模式。总体而言至少快2~3倍以上

### 空间

熟悉Java开发的同学应该都知道`Maven`，我们每个Java工程都有大量的依赖，但是**并不会**下载到工程目录本身来，而是下载到一个统一的用户目录下，然后做动态链接。而这个思想在pnpm上也得到了完美的体现

- 在默认设置下，所有pnpm下载的包都会被存放到`~/.pnpm-store`这个文件夹
- 类似`Maven`，pnpm会依据版本来存放，目录类似 `.../react/16.14.0`和`.../react/17.0.2`，当项目需要react@17.0.2的版本时，就会在这里找匹配，如果找到了并且校验通过就不需要再下载了
- 采用**硬链接**的方法与具体项目的node_modules做关联，打个比方我本地有100个项目都用到了react 16.4，这份react的库文件只会在硬盘上存在一份，而这100个项目的node_modules都会从上面讲的pnpm store中硬链出来。不会占用额外的空间。
- 硬链接的使用会使工程文件夹的体积看起来依然庞大，比如一个库大小为1MB，在pnpm store中占了1MB，当观察工程的node_modules发现也是占1M，但实际上他们的空间是同一份，并不会产生额外的空间消耗
- 存在pnpm store中的文件并不是按照我们熟悉目录结构存储的，而是类似下图的结构，看起来就像存成了一堆乱码文件
  ![image-20210526171654269](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210526171654269.png)

这些看起来名字稀奇古怪的文件，其实就是我们依赖包的文件，可以通过一个工程中的依赖文件来证明，用pnpm安装react@16.4.0，其中有个index.js文件，我们通过命令可以搜索到，在.`pnpm-store`中有一个`inode`相同的文件（硬链接）

![image-20210526172308903](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210526172308903.png)

![image-20210526172753556](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210526172753556.png)

这样做的目的是以文件为单元，最大化减少重复文件，假设一个库有100个文件，更新版本后改了一个文件，此时并不会重新写100个文件进系统，而是复用前面重复的99个文件，然后只写一个新文件进去，从而达到磁盘的最大利用。而文件名其实就是文件内容的哈希值，只要内容不变这个值就不会变，假设更新后index.js内容没变，但是被改名为app.js，在这种情况下是不会创建新文件的，是需要改下对应的metadata信息即可

- 由于pnpm并不是把依赖直接安装在工程目录的，即使删了出工程仓库，重新安装依赖可以直接从.pnpm-store取，做到数秒内完成

## 传统包管理工具的缺陷

速度和空间上的优势只是解决了易用性的问题，只能说是一个`enhancement`，那么接下来说的甚至可以称之为`bug fix`

### 嵌套黑洞

熟悉npm包管理的同学应该都多少了解过**npm的嵌套黑洞**

```
node_modules
└─ pkg1
   ├─ index.js
   ├─ package.json
   └─ node_modules
   		└─ lodash@4.17.21
      └─ pkg2
         ├─ index.js
         └─ package.json
         └─ node_modules
         		└─ lodash@4.17.21
         		└─ pkg3
         		└─ ...

```

在npm3以前，npm就会按照这个结构进行安装，缺点很明显

1. 重复的lodash无法复用，空间浪费
2. 目录结构可能无限深，甚至可能超过操作系统路径的上限
3. 有些包比如React(17以前)，它是需要单例的，如果两块代码引了不同版本的React就会报错

所以在3.x之后引入了**扁平化依赖**这个策略，即把嵌套中的依赖拍平，放到顶层来，这就是我们目前最熟悉的node_modules

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210526160920520.png" alt="image-20210526160920520" style="zoom: 50%;" />

产生的后果就是，我的项目明明只写了十几个依赖，结果目录里有几百个文件夹。

当然这确实解决了包重复安装的问题，同时引出了新的问题

1. 扁平化算法的**复杂性**很高，耗时较长。
2. 目录结构不稳定

如下的两个包依赖了同一个包的不同版本

![img](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/211c86c7838b48bead2a4ee7faee25b1~tplv-k3u1fbpfcp-watermark.image)

那么最终安装的结果是

![img](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b2368d74f8b341f0b1b545198683af59~tplv-k3u1fbpfcp-watermark.image)

还是

![img](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/198d6c12f0e045ce8c0867b44b3aaeb1~tplv-k3u1fbpfcp-watermark.image)

答案是都有可能。取决于 foo 和 bar 在 `package.json`中的位置，如果 foo 声明在前面，那么就是前面的结构，否则是后面的结构。

为了规避这样的问题，才出现了我们熟悉的`lock`文件（这个经常能把vscode卡死的东西）

### 代码安全

假设我们的代码没有主动依赖lodash，但依赖的包A依赖了B，那么就相当于我们的项目间接依赖了B。此时我们在代码中是可以直接引用B的代码的，且不会运行报错。此时看起来一切都没有问题

假如某天升级包A，它移除了B的依赖，这就导致了我们的代码失败，又或者A升级了B的版本，用了不兼容当前的API，结果也是代码运行失败。

### 解决方案

那么pnpm是怎样解决这些问题的呢？

```
node_modules
└─ pkg1
   ├─ index.js
   ├─ package.json
   └─ node_modules
   		└─ lodash@4.17.21
      └─ pkg2
         ├─ index.js
         └─ package.json
         └─ node_modules
         		└─ lodash@4.17.21
         		└─ pkg3
         		└─ ...
```

回到这个依赖关系，经过pnpm的安装之后，我们所能看到的依赖包有且仅有pkg1，直接屏蔽了后面的依赖嵌套。`node_modules`中的文件夹会严格与`package.json`中定义的依赖一致，如下图所示

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210526164033143.png" alt="image-20210526164033143" style="zoom: 67%;" />

此时肯定要好奇，只有顶层的依赖，那么依赖的依赖去哪里了，这里以`ora@5.4.0`这个包为例，从它的`package.json`可以看出它是有很多依赖的

![image-20210526165538947](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210526165538947.png)

注意到每个夹子的右边都有一个跳转的图标，其实这是一个`软链接`。实际是链接到了工程根目录的`node_modules`中的`.pnpm`文件夹

![image-20210526165621604](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210526165621604.png)

当我们来到这个链接文件夹，发现`ora`下面还有一个`node_modules`，同时这里面就是`ora`的依赖的软链接

![image-20210526170022981](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210526170022981.png)

总结一下，pnpm就是完整保留了整个依赖关系的树形结构，不需要任何的算法，只需要逐个分析，然后在这个依赖关系文件夹中建立**符号链接**，所以这个结构一定是稳定的，不会因为`package.json`中的定义发生改变。同时，因为我们只能在代码中因为node_modules中的顶层依赖，所以就不会出现此前的间接依赖问题，从而解决了代码安全的问题。

## Monorepo

目前中大型项目或多或少都在采用Monorepo的形式做开发，可以做到代码的高效复用，`lerna` + `pnpm`的组合也是monorepo的最佳实践之一。

```
pnpm i pkgA -r  #可以同时给所有模块添加pkgA的依赖
pnpm i pkgA --filter @erda-ui/core  #也可以通过filter给指定模块添加依赖
```

