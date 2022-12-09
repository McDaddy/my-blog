---
title: PNPM实战体验
date: 2021-05-26
tags:
 - pnpm
categories:
 - 前端工程化
---

## 前言

大家好，这里是 Erda 技术团队。我们的前端工程[Erda-UI](https://github.com/erda-project/erda-ui)，自17年诞生，至今已经成长为了一个有近2000代码文件的标准中大型前端项目。如何拆分和管理如此庞大的项目成为了快速迭代生长中必须解决的一个痛点。从前端模块技术架构的角度，过去的一年我们陆续引入了`qiankun`和`module-federation`实现了微前端的架构（此篇今天暂不展开），庞大的项目被分成了一个个职责清晰的模块子项目，彼此维护着自己的依赖/打包/发布等逻辑。 与此同时，`Monorepo`也便成了管理各个子模块的不二选择，今天我就以Monorepo的包管理作为切入点，来聊一下当前包管理所遇到的困难，以及如何去优雅得解决这些问题。

<!-- more -->

## 前端包管理的那些坑

### 缓慢的安装速度

每次【clone仓库/同事改了包依赖/更新包版本】后都要做一遍`npm i`，一个如erda-ui这种体量的`monorepo`工程在如果没有缓存的情况下几乎需要**10分钟**来做依赖初始化，即便是在有缓存的情况下，速度依然堪忧。

### 巨型的node_modules

你是否已经对前端本地工程文件夹动不动上G的空间占用习以为常了？明知道这些库我下载过，但是没办法还是需要在node_modules里再安一遍，实在是资源浪费。同时，空间浪费的另一个原因是npm的安装非常容易造成冗余，如下图所示，libA与libB无法共享一份`libD@1.0.1`，所以它只能冗余得占据我们两份的硬盘空间。

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210613153146992.png" alt="image-20210613153146992" style="zoom:50%;" />

### npm的嵌套黑洞

熟悉npm或yarn包管理的同学应该都多少了解过npm的嵌套黑洞，以下面的包结构为例

```
node_modules
└─ lib1
   ├─ index.js
   ├─ package.json
   └─ node_modules
   		└─ lodash@4.17.21
      └─ lib2
         ├─ index.js
         └─ package.json
         └─ node_modules
         		└─ lodash@4.17.21
         		└─ lib3
         		└─ ...
```

在npm3以前，npm就会按照这个结构进行安装，缺点很明显

1. 重复的`lodash`无法复用，空间浪费
2. 目录结构可能无限深，甚至可能超过操作系统路径的上限
3. 有些包比如React(17以前)，它是需要单例的，如果两块代码引了不同版本的React就会报错

所以在`3.x`之后引入了**扁平化依赖**这个策略，即把嵌套中的依赖拍平，上例中的`lodash`就会被提升到顶层来，做到重复利用。

这就是我们现在所熟悉的node_modules

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210526160920520.png" alt="image-20210526160920520" style="zoom: 50%;" />

但产生的后果就是，我的项目明明只写了十几个依赖，结果node_modules目录里有几百个文件夹，里面的依赖尽是项目开发者不认识的包

当然这确实部分解决了包重复安装的问题（冗余依然存在），同时引出了新的问题

1. 扁平化算法的**复杂性**很高，耗时较长。
2. 目录结构不稳定

如下的两个包依赖了同一个包的不同版本，libA引用libC@1.0.1，libB引用了libC@1.0.2，那么最终安装的结果会是下图的哪种情况呢？

![image-20210617110952247](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210617110952247.png)



答案是**都有可能**。取决于 libA 和 libB 在 `package.json`中的位置，如果 libA 声明在前面，那么就是左边的结构，否则是右边的结构。

为了规避这样的问题，才出现了我们熟悉的`lock`文件（当然它更重要的作用是锁定版本）

### 代码安全

假设我们的工程没有主动依赖libB，但依赖的包libA依赖了libB，那么就相当于我们的项目间接依赖了libB。此时我们在代码中是可以直接引用libB的代码的，且不会运行报错。此时看起来一切都没有问题

假如某天我们升级libA，它移除了libB的依赖，这就会导致我们的代码运行失败，又或者libA升级了libB的版本，用了不兼容当前的API，结果也是代码运行失败。

### Monorepo下的包管理

此前我们团队的Monorepo方案是`lerna` + `yarn workspace`，yarn可以帮助我们把子项目中各种重复且公共的包提升到项目顶层，从而减少安装次数，但问题是如此下来，子项目依赖的安装路径变得无法预测，既可能在自己的node_modules里，也可能被提升到了项目根的node_modules中，这给版本检查和打包都造成了一些困扰。

## 解决方案

那么接下来就要引出今天的主角`PNPM`

### PNPM是什么

根据其官方的描述

> Fast, disk space efficient package manager

主要两个关键词，快和磁盘高效，同时它是一个基于node的包管理工具

### 为什么选择PNPM

这里就要拿出我们非常熟悉的也是最主流的`npm`和`yarn`两个同行来做对比了。从速度和磁盘效率两个维度做对比

### 依赖下载快

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/alotta-files.svg" alt="Graph of the alotta-files results" style="zoom: 50%;" />

上图的结果来自于 [benchmarks-of-javascript-package-managers](https://github.com/pnpm/benchmarks-of-javascript-package-managers)

发现不管在何种预设条件下，pnpm的安装速度都是大大优于`npm`/ `yarn`以及`yarn`的`PnP`安装模式。总体而言至少快2~3倍以上

### 空间占用小

熟悉Java开发的同学应该都知道`Maven`，我们每个Java工程都有大量的依赖，但是**并不会**下载到工程目录本身来，而是下载到一个集中的用户目录下，然后做动态链接。而这个思想在pnpm上也得到了完美的体现

- 在默认设置下，所有pnpm下载的包都会被存放到`~/.pnpm-store`这个文件夹
- 类似`Maven`，pnpm会依据版本来存放，在逻辑上目录类似 `.pnpm-store/.../react/16.14.0`和`.pnpm-store/.../react/17.0.2`，当项目需要react@17.0.2的版本时，就会在这里找匹配，如果找到了并且校验通过就不需要再下载了
- 采用**硬链接**的方法与具体项目的node_modules做关联，打个比方我本地有100个项目都用到了react@16.14.0，这份react的库文件只会在硬盘上存在一份，而这100个项目的node_modules都会从上面讲的pnpm store中硬链出来。不会占用额外的空间。
- 硬链接的使用会使工程文件夹的体积看起来依然庞大，比如一个库大小为1MB，在pnpm store中占了1MB，当观察工程的node_modules发现也是占1M，但实际上他们的空间是同一份，并不会产生额外的空间消耗
- 存在pnpm store中的文件并不是按照我们熟悉目录结构存储的，而是类似下图的结构，看起来就像存成了一堆乱码文件
  ![image-20210526171654269](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210526171654269.png)

这些看起来名字稀奇古怪的文件，其实就是我们依赖包的文件，可以通过一个工程中的依赖文件来证明，用pnpm安装react@16.4.0，其中有个index.js文件，我们通过命令可以搜索到，在.`pnpm-store`中有一个`inode`相同的文件（硬链接）

![image-20210526172308903](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210526172308903.png)

![image-20210526172753556](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210526172753556.png)

这样做的目的是以文件为单元，最大化减少重复文件，假设一个库有100个文件，更新版本后改了一个文件，此时并不会重新写100个文件进系统，而是复用前面重复的99个文件，然后只写一个新文件进去，从而达到磁盘的最大利用。而文件名其实就是文件内容的哈希值，只要内容不变这个值就不会变，假设更新后index.js内容没变，但是被改名为app.js，在这种情况下是不会创建新文件的，是需要改下对应的`metadata`信息即可

- 由于pnpm并不是把依赖直接安装在工程目录的，即使删了出工程仓库，重新安装依赖可以直接从.pnpm-store取，做到数秒内完成

### 规避代码安全问题

pnpm是如何解决上面所述的代码安全问题呢？

```
node_modules
└─ lib1
   ├─ index.js
   ├─ package.json
   └─ node_modules
   		└─ lodash@4.17.21
      └─ lib2
         ├─ index.js
         └─ package.json
         └─ node_modules
         		└─ lodash@4.17.21
         		└─ lib3
         		└─ ...
```

回到这个依赖关系，经过pnpm的安装之后，我们所能看到的工程依赖包有且仅有lib1，直接屏蔽了后面的依赖嵌套。`node_modules`中的文件夹会严格与`package.json`中定义的依赖一致，如下图所示

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210526164033143.png" alt="image-20210526164033143" style="zoom: 67%;" />

好奇的你此时肯定要疑问，只有顶层的依赖，那么依赖的依赖去哪里了，这里以`ora@5.4.0`这个包为例，从它的`package.json`可以看出它是有很多依赖的

![image-20210526165538947](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210526165538947.png)

注意到每个包文件夹的右边都有一个跳转的图标，其实这是一个`软链接`。实际是链接到了工程根目录的`node_modules`中的`.pnpm`文件夹

![image-20210526165621604](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210526165621604.png)

当我们来到这个链接文件夹，发现`ora`下面还有一个`node_modules`，同时这里面就是`ora`的依赖的软链接

![image-20210526170022981](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210526170022981.png)

总结一下，pnpm就是完整保留了整个依赖关系的树形结构，不需要任何的算法，只需要逐个分析，然后在这个依赖关系文件夹中建立**符号链接**，所以这个结构一定是稳定的，不会因为`package.json`中的定义发生改变。同时，因为我们只能在代码中引用node_modules中的顶层依赖，所以就不会出现此前的间接依赖问题，从而彻底解决了代码安全的问题。

### Monorepo

`lerna` + `pnpm`的组合也是目前monorepo的最佳实践之一。

```
# 在工程根目录下
pnpm i pkgA -r  # 可以同时给所有模块添加pkgA的依赖
pnpm i pkgA -w  # 只给根目录添加pkgA的依赖
pnpm i pkgA --filter @erda-ui/core  # 也可以通过filter给指定模块添加依赖

#在子模块根目录下
pnpm i pkgA  # 仅给当前模块添加依赖
```

![image-20210528180630309](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210528180630309.png)

## 实战指南

这里不讲pnpm的基础操作，具体可以翻阅[官方文档](https://pnpm.io/hu/cli/add)，接下来就讲讲我们在实际落地pnpm中可能需要注意的问题

### 配合webpack的问题

1. `resolve.symlinks`这个属性不能设置为false，否则无法通过符号链接找到相应的node_modules
2. `resolve.modules`这个属性不要写死`['node_modules']`，建议去掉这个配置，因为如果这样写webpack就只会限定从这个目录去找node_modules，当在monorepo的情况下，`.pnpm`目录其实会被放在工程根的`node_modules`中，导致无法链接到资源文件，去除这个配置后，webpack会自动去找相应的资源
3. 有时候我们除了需要去编译自己的`src`文件，还需要`include`一些未编译的包资源， 比如下面这段loader配置，会需要额外include一个包

```javascript
{
    test: /\.(tsx?|jsx?)$/,
    include: [
      resolve('src'),
      path.resolve(__dirname, 'node_modules/@terminus/dashboard'),
    ],
    use: ['babel-loader'],
},
```

此时`path.resolve(__dirname, 'node_modules/@terminus/dashboard')`得到的路径其实是符号链接所在的目录，如果编译就会报出无法识别此资源，请添加合适loader的提示。原因出在哪里？ 因为在src中引用到这个包，在webpack编译时，当需要解析`@terminus/dashboard`这个包时，已经通过链接自动寻址到了`.pnmp`下的对应资源，此时发现资源文件还是个ts并不是预期的js，同时查看`include`配置，发现虽然配置了一个目录， 但与当前`babel-loader`正要解析的资源目录不符

```javascript
// 你include的配置
include: [
  '~/work/GitHome/erda-ui/shell/node_modules/@terminus/dashboard'
]
// 实际webpack编译时的资源路径, 当编译这个目录时，我们知道webpack自身是不认识ts，且发现loader的include中并没这个路径的配置，自然要报错了
~/work/GitHome/erda-ui/node_modules/.pnpm/@terminus+dashboard@1.2.2_c08939748a2e52995f06e5a6be8616f9
```

解决方法，利用`fs`模块的`realpathSync`方法替换软链接路径，此方法可以取到软链接后的真实地址。

```javascript
include: [
  fs.realpathSync(resolve('./node_modules/@terminus/dashboard'))
]
```

### package.json

在默认全局配置下，安装包版本后，都会更新在package.json中。除了安装如`latest`这样的tag，此外都和npm的默认行为有所区别，个人认为这样是更符合直觉和预期的，既然输入了一个具体版本，在一般情况下都是为了维持或者回退到某个版本，如果在没有lock文件的情况下他人去安装，就很可能因为**semver**规则而安装上错误的版本。

```shell
# npm
npm i lodash@4.17.21   => "lodash": "^4.17.21"
npm i lodash@latest    => "lodash": "^4.17.21"
npm i lodash@4.17.x    => "lodash": "^4.17.21"

# pnpm
pnpm i lodash@4.17.21   => "lodash": "4.17.21" #注意
pnpm i lodash@latest    => "lodash": "^4.17.21"
pnpm i lodash@4.17.x    => "lodash": "4.17.x" #注意
```

此前在使用yarn/npm做包管理时，时常因为`registry`等原因，即使没有改变依赖，不同的机器跑完`npm i`之后还是会冗余得更新lock文件，而这个问题在使用pnpm之后都能得到完美得解决。配置好`pnpm-workspace.yaml`文件

```yaml
packages:
  # all packages in subdirs of packages
  - core
  - shell
  - scheduler
  - cli
  - modules/market
```

整个Monorepo项目可以保持有且仅有一份lock文件（可以通过配置改），同时在各个`package.json`文件的依赖不改变的情况下，lock可以保持一直不变，非常得符合开发直觉。

### 环境

1. pnpm必须运行在node v12.17以上
2. 由于pnpm需要把包都安装在工程外的用户目录下，也许会出现没有权限安装的情况，两种解决方法
   1.  `sudo pnpm i`  比较暴力，坏处是之后的`pnpm i`操作都要加sudo
   2. `sudo chown -R <your-user-name> ~/.pnpm-store`  推荐这个方法，通过更改文件夹owner彻底解决权限问题

### 缺点

- 普及率还不高，虽然有微软这样的大厂背书，但仍然还没有成为主流
- `pnpx`理论上讲可以替换`npx`，但是架不住执行脚本的内部依然是使用npm的现实，如下图，很多情况下还是免不了npm

![image-20210609152933688](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210609152933688.png)



## 总结

- 从安装速度角度来说，pnpm确实能大幅提升安装效率，以erda-ui初始化为例

![image-20210617113531184](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210617113531184.png)

同时在做CI/CD时也能提供类似`npm ci`的功能，如果package.json内容与lock不匹配将会中断流程

![image-20210607195244020](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210607195244020.png)

- 从空间角度来对比，pnpm可以节省大量的硬盘空间，而且占用的空间还是与其他项目共享空间的硬链接，可以说维护的项目越多节省的空间就越大

|              | npm/yarn | pnpm |
| ------------ | -------- | ---- |
| 项目占据空间 | 3.5G     | 1.1G |

- 从易用性角度来对比

|              | npm/yarn                         | pnpm                                                 |
| ------------ | -------------------------------- | ---------------------------------------------------- |
| lock文件     | lock文件稳定性差                 | 可以维持全局唯一lock文件，且只随依赖变化而变化       |
| 搜索三方模块 | 上百个文件夹平铺，寻找模块很困难 | node_modules顶层只有package.json中维护的包，非常简洁 |
| monorepo     | 依赖安装的位置不稳定             | 依赖安装结构稳定                                     |

综上所述，如果你的项目也遇到了类似的包管理难题，不妨尝试下pnpm，这也许就是你寻找的答案！

## 参考

[Monorepo 的这些坑，我们帮你踩过了！](https://juejin.cn/post/6972139870231724045)

[关于现代包管理器的深度思考——为什么现在我更推荐 pnpm 而不是 npm/yarn?](https://juejin.cn/post/6932046455733485575)



## 加餐

### hoist行为

- 默认情况下，我们的业务代码是不能访问非直接依赖的vendor包的，因为那些包都在`node_modules/.pnpm/node_modules/xx` 里面，正常的寻址规则是找不到的
- vendor包和vendor包之间，其实是可以无视这个hoist行为的，即A包依赖B包，但是A的dependency里面并没有B，如果C包依赖了B包，那么A是可以直接访问因为C而引入的B包的

```
; All packages are hoisted to node_modules/.pnpm/node_modules
hoist-pattern[]=*

; All types are hoisted to the root in order to make TypeScript happy
public-hoist-pattern[]=*types*

; All ESLint-related packages are hoisted to the root as well
public-hoist-pattern[]=*eslint*
```

- 默认情况下，所有的三方包都会被hoist到`./pnpm/node_modules`
- 所有的type定义包都会被提升到root去，这是为了不出现ts编译错误
- 同时放了一些后门，比如eslint相关的包，即使app不直接依赖也会被提升到顶层



### 依赖修复方案

**overrides**

假设A包依赖B@1.2.0， 这个版本的B是有bug的，但是你又不想升级A（某些特性不需要），或者A包根本就没有处理这个问题

此时，可以通过overrides来强制指定B包的版本，那么所有的B包都会根据配置的来

```json
{
  "pnpm": {
    "overrides": {
      "B": "1.0.0",
    }
  }
}

// 也可以更细粒度的控制 只有A依赖的B要被覆盖
{
  "pnpm": {
    "overrides": {
      "A@1>B": "1.0.0",
    }
  }
}
```

还有种情况，上面讲所有的type定义都会提升到顶层，如果项目里既有@type/react@16 又有@type/react@18， 此时编译器就会错乱发现同个对象有两种定义，此时也可以用overrides去统一type的版本

```json
{
  "pnpm": {
    "overrides": {
      "@type/react": "18.0.0",
    }
  }
}
```

 **packageExtensions**

强行指定具体某个包的依赖

```json
{
  "pnpm": {
    "packageExtensions": {
      "webpack-cli": {
        "peerDependencies": {
          "ts-node": "*"
        }
      },
    }
  }
}
```

 **.pnpmfile.cjs**

通过代码来指定版本，用来修复上面两种情况无法精确控制的场景

```javascript
function readPackage(pkg, context) {
  if (pkg.name === 'A' && pkg.version.startsWith('1.')) {
    pkg.dependencies = {
      ...pkg.dependencies,
      B: '15.0.0'
    }
  }
  if (pkg.name === 'webpack-cli') {
    pkg.peerDependencies = {
      ..pkg.peerDependencies,
      "ts-node": "*"
    }
  }
  
  return pkg
}

module.exports = {
  hooks: {
    readPackage
  }
}
```

 **npm alias**

这个就比较有用了，如果某个包packageA的版本有bug，而且也没被维护者处理，传统的做法是自己fork一个仓库，用自己的名字发一个包来替代原有的包，同时还要配置webpack的alias和tsconfig的path

```json
{
  "dependencies": {
     "@kuimo/packageA": "^1.0.1"
  }
}
```

可以使用npm alias直接指向自己的包


```json
{
  "dependencies": {
     "packageA": "npm:@kuimo/packageA@1.0.1"
  }
}
```

