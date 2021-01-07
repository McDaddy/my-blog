---
title: webpack 5新特性与优化总结
date: 2021-01-05
tags:
 - webpack
categories:
 - 工具

---

> webpack 5发布也有一段时间了，借助FDP标品化的机会也同时升级了webpack，这里简单介绍下webpack 5的一些主要新特性，以及在升级过程中遇到坑。最后再总结下webpack打包的优化总结

<!-- more -->

## webpack 5的主要新特性

### webpack5不再内置node模块

也就是移除了node.js的`polyfill`，当编译那些node才有的模块时就会报错

![image-20201201151902608](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20201201151902608.png)

解决方法：主动安装相应的polyfill，同时在webpack配置中添加`fallback`

```javascript
// npm i path-browserify -D
// webpack.config.js
resolve: {
	fallback: {
		path: require.resolve('path-browserify'),
	},
},
```

### webpack对node_modules里面的代码强制要带尾缀

![image-20201201160611199](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20201201160611199.png)

解决方法： 安装`@babel/runtime`最新版，同时在解析代码tsx/jsx的rule中配置`fullySpecified`为false

```javascript
{
  test: /\.(tsx?|jsx?)$/,
    include: [
      resolve('app'),
    ],
    use: [
      {
        loader: 'ts-loader',
        options: {},
      },
    ],
    resolve: {
      fullySpecified: false,
    },
},
```

### 持久化缓存

默认自动开启，默认类型为memory，建议手动改成fieSystem [Cache 文档](https://webpack.js.org/configuration/other-options/#cache)

这个功能直接取代了HardSourceWebpackPlugin和cache-loader，在开发体验上为革命性升级

```javascript
cache: {
  type: 'filesystem',
},
```



### Tree Shaking

webpack 5 自带强大的`tree-shaking`功能，杀手级功能

![tee-shaking](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/tee-shaking.png)

在webpack 4中4个function都会被打入最终的包中，而在webpack 5中只会保留`function1`，此功能仅在`mode`为`production`时默认打开。可以通过下面的方式关闭

```javascript
 optimization: {
    usedExports:false,
    providedExports: false,
 }
```



###  chunkIds的优化

在webpack 4中在`development`模式下默认，非入口chunk的文件名是`chunkFilename: 'scripts/[id].js’`，这个id是webpack自动生成的，以自然数累加，即1、2、3…的文件命名方式输出，如果删除某些文件就会导致缓存失效

![image-20201230110402195](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20201230110402195.png)

在webpack 5中加入了chunkId的优化，可以又使用者自己决定id是什么，默认是一个用文件路径拼出来的文件名，在调试代码时非常直观好用。

![image-20210105191126776](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210105191126776.png)

| 可选值        | 含义                          | 示例           |
| :------------ | :---------------------------- | :------------- |
| natural       | 按使用顺序的数字ID            | 1              |
| named         | 方便调试的高可读性id 默认选项 | src_demo_js.js |
| deterministic | 根据模块名称生成简短的hash值  | 915            |
| size          | 根据模块大小生成的数字id      | 0              |



### 资源模块

webpack 5在module -> rules中新引入了一个type属性，用来表示模块类型，它允许使用资源文件（图片、字体等）时无需配置额外的loader

- `raw-loader` => `asset/source` 导出资源的源代码
- `file-loader` => `asset/resource` 发送一个单独的文件并导出 URL
- `url-loader` => `asset/inline` 导出一个资源的 data URI
- type = asset 时可以在`asset/resource`和`asset/inline`间自由切换

```javascript
{
  test: /\.svg$/,
    include: [
      resolve('node_modules/@terminus/nusi'),
    ],
    type: 'asset',
    parser: {
      dataUrlCondition: {
      	maxSize: 8 * 1024, // 8kb
    	},
    },
},
{
  test: /\.(png|jpe?g|gif)$/i,
    include: [
      resolve('node_modules/@terminus/nusi'),
    ],
      type: 'asset/resource',
},
```

### URIs

- webpack 5 支持在请求中处理协议

```javascript
import data from "data:text/javascript,export default 'title'";
console.log(data);
```



### Top Level Await

这是目前还在stage 3的`ECMAScript`提案[top level await](https://github.com/tc39/proposal-top-level-await)，但是webpack 5已经可以实验性得去支持它了

```javascript
// 打开方法在webpack配置中加入如下片段
experiments: {
  topLevelAwait: true,
},
```

对我们来说它解决了什么问题？ —> 可以自由得去分割代码块了

之前我们做异步代码加载一般都是放在路由级别的，如果不用`React.Suspense`的话甚至还要自己包一层所谓的`DynamicComponent` HOC

```javascript
const CommonComp = React.lazy(() => import("./custom-common-comp"));
return (
  <div>
    <Suspense fallback="loading">
    	<CommonComp />
    </Suspense>
  </div>
);
```

有了`top level await`之后， await可以直接写在模块的顶部，同样可以做到`split chunk`的作用。但使用起来更简单，但如果此组件加载很慢，那么引用此的父组件的加载也会被阻塞。

```javascript
const { Comp } = await import("./custom-large-comp");
return (
  <div>
  	<Comp />
  </div>
);
```

### 更严格的格式和更友好的提示

webpack 5 总体而言配置的随意性更小，同时也提供了更好的错误提示，举个例子

`devtool: 'cheap-module-eval-source-map’`这个配置在webpack 4是没问题的，但是在webpack 5就被强制要求按顺序来书写成`eval-cheap-module-source-map`，否则就会有以下的提示

![image-20201230170543081](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20201230170543081.png)

### 无法使用cnpm

[Github issue链接](https://github.com/cnpm/cnpm/issues/335)

### 模块联邦

内容太多不在此展开

### 官方hooks的更新

![image-20210107095842532](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210107095842532.png)

如果对plugin感兴趣可以了解一下 [官方文档](https://webpack.js.org/api/compiler-hooks/)

## webpack打包优化

### thread-loader替换happypack

`happypack`是一个长达两年没有更新的包了，作者也表示不会继续维护，而`thread-loader`是webpack官方推荐的多线程打包插件，建议替换

![image-20201201164951750](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20201201164951750.png)

![image-20201201170209009](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20201201170209009.png)

具体使用方法参考  [thread-loader](https://www.npmjs.com/package/thread-loader)

唯一要注意的坑就是，它不是永远放在所有loader的最后一位，当遇到`MiniCssExtractPlugin`时，必须要把`MiniCssExtractPlugin`放在它的后面否则会报错

```javascript
{
	test: /\.(css)$/,
	use: [
		...(isProd ? [MiniCssExtractPlugin.loader] : []),
    'thread-loader',
    ...(isProd ? [] : ['style-loader']),
    'css-loader',
	],
},
```

![image-20201201164307493](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20201201164307493.png)

![image-20201208164014361](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20201208164014361.png)



### 包体积的优化

![image-20210107113844770](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210107113844770.png)

这是FDP在此次调整前的包体积情况，一个独立的vendor chunk大小约12.27MB，而这个chunk是每次初始化页面都必须加载的，因此会非常影响我们页面的性能。这里我们就要考虑如果合理得去分割我们的代码，然后延迟加载。首先明确哪些情况是会分割代码的

- 主入口文件，如果SPA就是一个，MPA就是多个
- 异步加载的模块，即`dynamic import`
- `split chunk`

此时我们的`optimization`配置基本就是默认的

```javascript
optimization: {
  splitChunks: {
    chunks: 'all', //默认作用于异步chunk，值为all/initial/async， all=initial+async
    minSize: 30000, //默认值是30kb,代码块的最小尺寸
    minChunks: 1, //被多少模块共享,在分割之前模块的被引用次数
    maxAsyncRequests: 5, //限制异步模块内部的并行最大请求数的，说白了你可以理解为是每个import()它里面的最大并行请求数量
    maxInitialRequests: 5, //限制入口的拆分数量
    name: false,
    cacheGroups: { //设置缓存组用来抽取满足不同规则的chunk
      vendors: {
        test: /[\\/]node_modules[\\/]/,
          reuseExistingChunk: true,
            priority: -10,
      },
    },
  },
},
```

#### 放进common的代码要考虑包引用的问题

图上`antvG6`这个包占据了1.1MB的空间，但是我知道在整个代码中只有两个页面是用到了G6的，如果任何页面加载都载入它就太浪费性能了。 查找原因为什么这个依赖没有被打在异步加载模块的vendor中？最终发现原来是一个引用了G6的方法被提取到了`common`模块下，而common是一开始就要被加载的，所以G6也在初始化时随之被加载。移除此方法后，G6独立成包。

#### 适当添加cache group

图中可见 `echarts/lib`占据了1.16MB的空间，虽然它是组件库的一部分，如果组件库初始化加载它也不可避免要被加载，但是我们可以通过添加cache group，把它从一个大vendor中抽取出来，这样虽然仍然要加载，但是在http2多路复用的加持下，相当于100MB的文件，分成10个10MB的文件同时下载，合理利用带宽，提高加载效率

```javascript
cacheGroups: {
  vendors: {
    test: /[\\/]node_modules[\\/]/,
      reuseExistingChunk: true,
        priority: -10,
  },
  eCharts: {
    test: /[\\/]node_modules[\\/]echarts\/lib/,
      reuseExistingChunk: true,
       name: 'eCharts',
       priority: -5,
    },
},
```

#### 去除无效资源文件

moment的locale包占据445KB。事实上我们只需要中英的语言包，剩下的都可以去掉，这里用到`ContextReplacementPlugin` [文档地址](https://webpack.js.org/plugins/context-replacement-plugin/)

```javascript
new webpack.ContextReplacementPlugin(
  // eslint-disable-next-line
  /moment[\\\/]locale$/,
  /(zh-cn)|es/
),
```

#### ts-import-plugin

`babel-import-plugin`的`ts-loader`版，用来将一些不是以ESM输出的库，引用其具体的文件来作为导入（因为非ESM的导出是无法做tree shaking的）  [ts-import-plugin](https://www.npmjs.com/package/ts-import-plugin)

```javascript
// before
import { Button } from '@terminus/nusi';

// webpack config
{
  test: /\.(jsx|tsx|js|ts)$/,
    loader: 'ts-loader',
    options: {
        transpileOnly: true,
          getCustomTransformers: () => ({
            before: [ tsImportPluginFactory([
              {
                libraryName: '@terminus/nusi',
                libraryDirectory: 'es',
              })]
            ]
          }),
          compilerOptions: {
             module: 'es2015'
          }
      },
     exclude: /node_modules/
}

// after
import Button from '@terminus/nusi/es/Button';
```

使用中有一个坑，谭老师在两年前就踩过了，就是默认把`getCustomTransformers`这个配置写在webpack文件中会和`happypack`或`thread-loader`起冲突，必须把配置独立成一个文件出去。

但实际上nusi确实已经是以ESM的形式导出并非commonJS，那么为什么还无法被tree-shaking掉呢？

#### sideEffects

- 函数副作用指当调用函数时，除了返回函数值之外，还产生了附加的影响,例如修改全局变量
- 严格的函数式语言要求函数必须无副作用

sideEffects是配合tree-shaking的利器。如果能够确保自己的代码与三方库是无副作用的，那么就应该在package.json中主动设置，告诉打包工具，哪些内容是有副作用的，哪些没有。

一般情况下，我们都要保留引入的样式文件，这样样式才不会被tree-shaking掉

```json
"sideEffects": [
    "dist/*",
    "es/**/style/*",
    "lib/**/style/*",
    "*.less"
 ],
```



![image-20210106234242533](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210106234242533.png)

#### 实际效果

在生产上提速不太明显，即使11MB的文件经过`Gzip`也能压缩在2MB~3MB左右，在正常网速下也能在1秒内下载完成，所以总来说提速不足半秒。如果是在`fast 3G`的网速下，未优化载入使用了18秒，优化后载入10秒

在本地开发环境下提速稍微明显一些，因为本地代码都是未压缩的，从40MB到10M还是有明显的体感的

## 包的调整

- 需要强制升级的包

1. webpack
2. webpack-cli
3. html-webpack-plugin
4. webpack-merge
5. copy-webpack-plugin (需要改配置结构)

- 退休的包

1. hard-source-webpack-plugin
2. cache-loader
3. happypack
4. esbuild-webpack-plugin (有坑)
5. url-loader
6. file-loader
7. @types/webpack 由webpack自己本身输出了
8. @types/webpack-env

[官方升级指南](https://webpack.js.org/migrate/5/)

[阔别两年，webpack 5 正式发布了！](https://juejin.cn/post/6882663278712094727)