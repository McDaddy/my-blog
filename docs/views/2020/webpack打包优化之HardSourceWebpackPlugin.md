---
title: webpack打包优化之HardSourceWebpackPlugin
date: 2020-05-01
tags:
 - webpack
categories:
 - 前端工程化
---

由于最近一直在两个工程间切换开发，同时起两个node电脑扛不住，经常性重新编译耗时太大，这里尝试*HardSourceWebpackPlugin*，结果得到惊人结果

- 这是未优化时的耗时，稳定在1分10s到30s不等 测试时间的工具是`speed-measure-webpack-plugin`

[![JvI1YD.png](https://s1.ax1x.com/2020/05/02/JvI1YD.png)](https://imgchr.com/i/JvI1YD)

官方文档说明，这个插件必须跑两次才有效果

![JvoEAf.png](https://s1.ax1x.com/2020/05/02/JvoEAf.png)

配置非常简单

```javascript
const HardSourceWebpackPlugin = require('hard-source-webpack-plugin');
    
// ...

new HardSourceWebpackPlugin(),
new HardSourceWebpackPlugin.ExcludeModulePlugin([
    {
    // HardSource works with mini-css-extract-plugin but due to how
    // mini-css emits assets, assets are not emitted on repeated builds with
    // mini-css and hard-source together. Ignoring the mini-css loader
    // modules, but not the other css loader modules, excludes the modules
    // that mini-css needs rebuilt to output assets every time.
    test: /mini-css-extract-plugin[\\/]dist[\\/]loader/,
    },
]),
```

首次编译时间，快4分钟，比正常时还慢一倍多。

![JvorE6.png](https://s1.ax1x.com/2020/05/02/JvorE6.png)

停止后二次编译， 就是见证奇迹了，10.46秒完成，实际体感没这么夸张大约在25s左右.

![JvofKA.png](https://s1.ax1x.com/2020/05/02/JvofKA.png)

可以看到HardSourceWebpackPlugin在我们硬盘上占用了非常大的空间，来实现这种空间换时间的优化

![JvoT58.png](https://s1.ax1x.com/2020/05/02/JvoT58.png)

相比之下，此前广泛使用的dll大法已经在18年就被React和Vue官方下架了。虽然原理上都是提前编译存入硬盘，但显然HardSourceWebpackPlugin的使用更简单效果更好，甚至这个插件已经成为webpack v5 alpha的自带功能。

![Jvob8g.png](https://s1.ax1x.com/2020/05/02/Jvob8g.png)

![JvozV0.png](https://s1.ax1x.com/2020/05/02/JvozV0.png)

经过一天左右的试用，还是有一些踩坑点：

1. HardSourceWebpackPlugin的性能提升目前对热更新经过测试好像没有特别明显的提升，更意外的是首次热更新(仅仅初次编译完成后的第一次文件改动)速度会比正常状态慢上几秒

2. 任意webpack配置的改动，会重新build cache
3. 任何package.json的任何版本改动也会导致重新build cache, 即使只是改了自身的版本号而不是依赖的版本号
4. 默认情况下即使没有任何改动，应该每2天就会把cache强制过期，这点还没测试到
5. 偶现错误重新build cache，百度说是sass-loader引起的，和这个plugin无关，暂时无解.
![JvTeVx.png](https://s1.ax1x.com/2020/05/02/JvTeVx.png)