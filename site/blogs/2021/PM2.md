---
title: PM2实战体验
date: 2021-04-26
tags:
 - node
categories:
 - 前端工程化
---

## 什么是PM2？

PM2是最常用的`node`进程管理工具之一，它可以提供node.js应用管理，如自动重载、性能监控、负载均衡等。同类工具有Supervisor、Forever等。

## 如何安装

须全局安装

```shell
sudo npm i pm2@latest -g
```

## 如何使用

[官方Quick Start](https://pm2.keymetrics.io/docs/usage/quick-start/)

## 如何使用 erda launch

1. 确保代码下载完毕
2. 执行过根目录的`setup.js`
3. 通过`erda setup`命令注册过想跑的模块
4. 在根目录下，执行`erda launch`

![image-20210423150927814](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210423150927814.png)

此时会列出所有注册过的模块，通过上下键和空格键选择要跑的模块，比如选择`scheduler`

此时会得到如下的显示，整个过程是瞬间完成的。并列出了所有能够被用到的`pm2`命令

![image-20210423160009846](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210423160009846.png)

5. 此时的`launched`仅表示进程被启动了，至于这个具体的编译什么时候完成要通过log具体查看。 输入`pm2 logs scheduler`得到以下结果，会列出`error-log`和`out`的各自最后15行，停留在这个窗口可以得到实时的log输出

![image-20210423160752534](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210423160752534.png)

6. 此时如果想跑剩下两个模块，可以再次执行`erda launch`，此时提示scheduler已经被启动过了，可以继续选择没启动的模块来启动

![image-20210423161347395](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210423161347395.png)

7. 可以通过`pm2 ls`来查看当前所有启动的modules，可以查看每个进程的状态/占用CPU/内存/pid等信息

![image-20210423161953694](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210423161953694.png)

8. 如果此时，你改了你的`webpack`或`package.json`等文件需要重启模块，可以直接使用`pm2 restart xxx`来重启

![image-20210423162233925](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210423162233925.png)

9. 当你需要关停某个模块时，可以使用`pm2 stop xxx`来停止。请注意此时虽然这个module是停止状态，但是在pm2中它依然存在，此时去跑`erda launch`会提示你此模块已经启动过了。如果想恢复它，可以用`pm2 restart xxx`重新拉起

![image-20210423162352915](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210423162352915.png)

10. 当想清理所有的进程时，可以用`pm2 kill`来关闭且删除所有pm2进程。

![image-20210423162704777](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210423162704777.png)

11. 高端操作，`pm2 monitor`，可以用自己的`GitHub`账号去注册上PM2的网站，然后就可以得到这样一个基础版的进程管理dashboard。可以直接在上面看log，重启应用，查看各种状态。

![image-20210423164326069](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210423164326069.png)

