---
title: 创建个人VuePress博客步骤
date: 2020-04-25
tags:
 - blog
categories:
 -  vuepress
sidebar: false
---

1. 在本地创建项目，参考[VuePress模板 vuepress-theme-reco](https://vuepress-theme-reco.recoluan.com/)

```
npx @vuepress-reco/theme-cli init my-blog
```
![Alt text](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/1587800414757.png)

2.  安装好依赖之后，使用`npm run dev`命令启动本地模式。 嗯。 零代码实现的效果还是不错的

![Alt text](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/1587800694139.png)

3. 使用`npm run build`命令打包项目， 打包好的文件存放在public文件夹中
4. 将项目加上git管理

![Alt text](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/1587800919026.png)

5. 在个人GitHub上创建新的项目

![Alt text](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/1587801021843.png)
使用命令将本地工程同步到GitHub

```
git remote add origin git@github.com:McDaddy/my-blog.git
git push -u origin master
```

![Alt text](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/1587801141065.png)

6. 使用21yunbox部署博客
[21yunbox](https://www.21yunbox.com/home)

![Alt text](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/1587802318925.png)

![Alt text](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/1587802349738.png)

现在还没个人域名，所以先用这个凑合一下。因为是国内CDN，速度还是杠杠的