---
title: 不定期更新的Git经验库
date: 2020-05-15
tags:
 - Git
categories:
 - 工具
---

Git一直用了很多年了，但是大多数情况只是使用图形化操作，坏处就是一旦碰到什么问题就无从下手，今年开始强迫自己放下图形工具，将日常的操作用CLI来一一完成，也从中积累一些经验。

<!-- more -->

### Git log

git log有很多命令参数，主要有

```shell
git log --stat  # 会显示出每个commit增删的文件和增删的代码量
git log --pretty=oneline # 格式化将所有commit信息放在一行，只包括commitId和message
git log --graph # 展示图形 树状图
git log --author="John" # 指定看某人的commit
git log --abbrev-commit # 使用缩略版的commitId（7位）
git log --pretty=format:'' # 自定义输出内容
```

所以我们可以用`git log --graph --pretty=format:'%h %s %ad' --date=format:'%Y-%m-%d %H:%M`这个命令来查看整个commit过程的简略树状图

![image-20200515151920006](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200515151920006.png)

> HEAD -> master 表示当前本地master分支指向的commit
> origin/master 表示远程master分支目前指向的commit
> feature/test 表示本地feature/test分支的指向