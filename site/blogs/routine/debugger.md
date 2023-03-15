---
title: 调试知识点总结
date: 2023-03-14
tags:
 - debug
categories:
 - 工具

---

《前端调试通关秘籍》掘金小册的阅读总结

<!-- more -->

## 调试方式

**Chrome  DevTool Source面板调试**

目前最常见普遍的调试方法，在Source面板中找到对应资源直接打断点

**vscode编辑器调试**

通过Vscode启动一个debugger进程，可以在编辑器中直接调试，**做到边写边调试**



## 调试原理

### Chrome DevTool

分为backend和frontend两部分

- backend 和 Chrome 集成，负责把 Chrome 的网页运行时状态通过调试协议暴露出来。
- frontend 是独立的，负责对接调试协议，做 UI 的展示和交互

两者之间的调试协议叫做 Chrome DevTools Protocol，简称 **CDP**。

简单的理解就是，

backend是对接JS运行时（v8/node.js/Chromium）的工具，把调试的API暴露出来

frontend主要就是UI展示，通过CDP去调用backend提供的调试接口

![image-20230314211025884](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230314211025884.png)

### vscode debugger

相比Chrome DevTool多了一层Debug Adapter Protocal

![image-20230314212136211](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230314212136211.png)

因为vscode不是针对js一种语言的工具，所以它需要适配多种语言，不同语言有自己不同的adapter

![image-20230314212319786](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230314212319786.png)

## 调试方法与配置

**调试网页**

- 第一步，启动本地服务，比如`http://localhost:3000`
- 第二步，创建launch.json启动文件

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}"
    }
  ]
}
```

- 第三步，点击启动，此时会启动一个新的chrome实例来运行网页（为啥vscode能启动chrome，因为vscode用了CDP协议）



## 配置

### request

之前已经知道调试的原理就是调试界面（frontend）与运行时runtime（backend）通信，两者通过ws通信

request表示连接backend的方式：

**launch**表示我新启一个backend（调试模式的浏览器），同时把我的frontend（vscode的调试界面）连接上去

**attach**表示之前已经启动了一个debugger模式的浏览器（backend）了，我就不需要重新启动一个backend了，直接连接上去就行了

一般ws debugger的默认端口都是9222

以下命令可以启动一个调试模式的浏览器

```
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=你自己创建的某个目录
```



### userDataDir

是Chrome保存用户数据的目录，包括浏览记录、cookie、书签、插件等。默认的路径在`~/Library/Application\ Support/Google/Chrome`。这个目录有个限制就是只能被一个Chrome实例访问，所以它会被我们默认启动的那个Chrome所使用，所以此时直接启动一个新的Chrome实例去debugger的话，就会报错说无法attach到浏览器

为了规避这个问题，我们可以设置`userDataDir: true`，这样vscode会创建一个临时文件夹来作为用户目录，但这样有个问题，就是无法存储登录状态，即每次launch调试，都需要去重新登录（因为没有cookie）

所以更好的解决方法是设置`userDataDir: "/Users/me/work/dataDir"`设置一个固定的目录地址，这样就可以解决上面的问题了



### runtimeArgs

是一个数组参数，用来指定启动调试的参数

`--auto-open-devtools-for-tabs` ： 打开浏览器页面后自动打开DevTool

`--incognito`：用无痕模式来调试

 `--user-data-dir` ： 同设置userDataDir



### sourceMapPathOverrides

目前的调试工具都是默认开启sourcemap的，打个比方，在浏览器运行的是bundle.js，在它的文件末尾有sourcemap的链接，那么就会把代码映射到源码上

sourceMapPathOverrides的作用就是找到sourcemap指定的文件地址到vscode workspace下真实路径的映射

![image-20230315152048280](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230315152048280.png)

但有的时候，vscode调试时sourcemap在本地文件路径可能找不到对应的文件，这个时候的源代码就只能是只读的了，因为可能这些路径是特殊的，比如`webpack://`开头的路径，如果没有映射就会找不到文件

![image-20230315153309708](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230315153309708.png)

sourceMapPathOverrides默认是以下的三个配置，workspaceFolder就是项目的根目录

![image-20230315154521010](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230315154521010.png)



### resolveSourceMapLocations

用来做sourcemap映射的配置，默认值为

```json
{
	"resolveSourceMapLocations": [
		"${workspaceFolder}/**",
    "!**/node_modules/**"
	]
}
```

这里会默认把node_modules给排除掉，就是为了避免三方包影响调试，但如果需要去调试三方包，那就需要把这行去掉



## sourcemap原理

一个sourcemap文件的格式大致如下

```javascript
{
　　　　version : 3,
　　　　file: "out.js",
　　　　sourceRoot : "",
　　　　sources: ["foo.js", "bar.js"],
　　　　names: ["a", "b"],
　　　　mappings: "AAgBC,SAAQ,CAAEA;AAAEA",
      sourcesContent: ['const a = 1; console.log(a)', 'const b = 2; console.log(b)']
}
```

- version：sourcemap 的版本，一般为 3
- file：编译后的文件名
- sourceRoot：源码根目录
- names：转换前的变量名
- sources：源码文件名 因为一个bundle可能是多个源文件的集合，所以是数组，下面的sourcesContent一样
- sourcesContent：每个 sources 对应的源码的内容
- mappings：一个个位置映射

说白了，sourcemap就是编译前的源码和编译后的bundle间的映射表，在mappings字段里，就包含了转换前的列和编译后的列的信息，同时也包含变量名的映射

一般只需要在bundle的末尾加上这样一段，就可以让调试工具支持sourcemap的解析

```
//# sourceMappingURL=/path/to/source.js.map
```



## webpack的sourcemap配置

### eval

eval是用来动态执行js代码的，但eval是无法打断点的。浏览器为了解决这个问题，支持通过在eval代码的最后添加一点`//#sourceURL=xxx`就可以把xxx加到sources里面去，然后就可以打断点了，如果把webpack的devtool设置为`eval`

源代码：

![image-20230315173835039](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230315173835039.png)

编译后的代码：

![image-20230315173910478](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230315173910478.png)

这个代码都被eval所包裹，最后添加了一个`//# sourceURL=webpack://webpack-test/./src/index.js`

此时用浏览器打开就可以直接打断点调试了，可以看到sources里面有一个webpack-test（工程名）的夹子，里面就是被编译后的内容

![image-20230315174059556](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230315174059556.png)

可以发现用了eval会按模块进行包裹（不仅仅是自己的代码，还有node_modules中的代码）

所以eval在webpack中的主要意义是为了简化sourcemap的处理，可以以模块为单位来做映射，而不是整个bundle

eval的好处就是快，它不需要去生成sourcemap文件，但这样也有个问题，就是无法和源码关联，毕竟我们一般想要调试的都是源码

### eval-source-map

此时就需要开启sourcemap。把devtool设置成`eval-source-map`。结果编译后的bundle，主要区别是多了一个sourceMappingURL

![image-20230315175245674](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230315175245674.png)

里面的内容看起来就是一串base64编码的字符串。我们把它解码一下发现，内容其实就是上面说的sourcemap结构体，只是它不是一个外链的map文件。

![image-20230315175413841](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230315175413841.png)

此时我们再去浏览器调试，发现断点就能停在源码的位置上了，右下角可以看到当前的源码是从index.js映射过来的，点击链接看到的就是上面的编译后代码（编译后代码+sourcemap）。

![image-20230315175601807](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230315175601807.png)

### sourcemap

如果把devtool配置成source-map

得到编译后的代码就不会被eval包裹了，最后会有一个外链的sourceMappingURL

![image-20230315180447788](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230315180447788.png)

同时我们会得到一个巨大的bundle.js.map文件，里面包含所有代码（自己的和node_modules）的映射

这里我们就能感受到和eval-source-map的**区别**，这里的sourcemap是bundle级别的，而eval-source-map是模块级别的

在此基础上，我们还可以设置成`hidden-source-map`，区别就是移除了最后那行sourceMappingURL，用于在生产环境自行关联调试

还有`inline-source-map`，就是把sourceMappingURL变成base64编码字符串

### cheap

cheap可以让sourcemap生成速度更快，因为source-map是精确到列，而cheap只精确到行，一般来说已经够用了

### module

在webpack中一个模块可能被多个loader处理，过程中会产生多个sourcemap，在默认情况下只会关联最后一步的代码

![image-20230315193547375](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230315193547375.png)

设置了module之后，就能从最后的bundle直接关联到源码



## 调试Node.js

一般情况下可以用vscode自带的功能F5进行调试

vscode调试Node.js的通用模板

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "launch program",
      "program": "${workspaceFolder}/src/a.js",
      "console": "integratedTerminal",
      "args": ["aa"],
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

- skipFiles: 跳过哪些文件，即单步不会进入的源码范围，`<node_internal>/**`是node的内部文件
- program: 要调试的代码路径
- args: 就是启动node的参数，即`process.argv`，这里的aa是第三位参数，整个process.argv是`['/usr/local/bin/node', '/Users/repo/src/a.js', 'aa']`



## 调试npm script

主要是用来调试各种命令启动中的过程，比如看vite是如何启动的，webpack是怎么编译的

下面是通用模板

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "launch via NPM",
      "runtimeArgs": ["dev"],
      "runtimeExecutable": "pnpm",
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

- runtimeExecutable： 可以指定npm/pnpm/yarn，理论上可以是系统path里能找到的任何能执行的程序
- runtimeArgs:  具体要调试的命令
- console: 可以通过integratedTerminal 把打印的日志放在自带的terminal而不是debugger console

- cwd：指定在哪个目录执行， 默认是workspaceFolder
- env:  可以添加`process.env`
- envFile: 同上，但内容是文件



