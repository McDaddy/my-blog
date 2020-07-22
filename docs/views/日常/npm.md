---
title: npm知识点总结
date: 2020-06-09
tags:
 - npm
categories:
 - 工具

---

npm就是前端的maven，可以说是怎么都绕不开的工具了，这里总结下各种npm相关的知识点

<!-- more -->

## 依赖配置

#### peerDependencies

```
  // 表示宿主必须要安装大于等于16的react， 否则会打印warning
  "peerDependencies": {
    "react": ">=16.0.0",
    "react-dom": ">=16.0.0"
  }
```

## 依赖版本管理

```json
"dependencies": {
  "signale": "1.4.0",
  "figlet": "*",
  "react": "16.x",
  "table": "~5.4.6",
  "yargs": "^14.0.0"
}
```

 `^`表示次版本和补丁版本最新 
 `~`表示补丁版本最新
   \* 表示任意版本
 16.x 表示只匹配主版本 \>=16.0.0 <17.0.0
 16.3.x 表示匹配主版本和次版本`>=16.3.0 <16.4.0`
 在0.0.x的版本时，^和~都没有用，只当成是固定版本
 在0.y.z时，^和~表现相同，只会更新z



## npm install的流程

![img](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/16f0eef327ccaba5.png)





## 如何更新npm

```shell
npm install -g npm
```

## 如何更新node版本

1. 清除npm缓存：npm cache clean -f 
2. 安装n模块：npm install -g n 
3. 升级node.js到最新稳定版：n stable



## 如何查看历史版本

```shell
npm view @terminus/dice-cdp versions
```

## 定期更新依赖

使用`npm outdated`列出需要更新的包，红色表示急需升级

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200610103851151.png" alt="image-20200610103851151" style="zoom:80%;" />

## script执行顺序

&表示并行执行，&&表示串行执行

```shell
$ npm run script1.js & npm run script2.js // 并行
$ npm run script1.js && npm run script2.js // 串行
```



## 发布相关

```shell
npm whoami 确定当前用户 
npm view package-name 查看某包的具体信息（当前版本/管理人/相关依赖） 
npm config get registry 得到当前源 
npm login –registry=[https://registry.npm.terminus.io](https://registry.npm.terminus.io/) 登陆到公司源 
npm publish 发布 
npm info 包名 查看包状态 
npm owner ls 查看包维护者 
npm owner add zhangxj 添加包维护者
# 如果要发布带scope的包需要在首次发布时加入--access public
npm publish --access public # publish @kuimo/test-app

npm link #在module模块的package.json目录下执行，可能将这个模块链到全局
npm link @terminus/dice-cdp #在宿主上执行，将刚才链到全局的包又链到了自己的node_modules，这样就可以直接在module上直接修改代码来调试，而不需要在node_modules里面改代码，容易丢失编辑的代码
```

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200713154052351.png" alt="image-20200713154052351"  />![image-20200713154428365](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200713154428365.png)

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200713154052351.png" alt="image-20200713154052351"  />![image-20200713154428365](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200713154428365.png)



 ```json
// package.json 可以配置发布到那个源 
"publishConfig": {
    "registry": "https://registry.npmjs.org/"
 },
 ```



## 如何重装node_modules

```shell
rm -rf node_modules
rm package-lock.json
npm cache clear --force
npm i
```



## 如果一个项目中重复引用同一个包的不同版本

在webpack中使用alias来统一指向唯一版本

```
'@terminus/nusi': path.join(__dirname, 'node_modules/@terminus/nusi')
```



## 参考

[前端工程化 - 剖析npm的包管理机制](https://juejin.im/post/5df789066fb9a0161f30580c)

