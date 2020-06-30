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

## git log

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

## Git 文件大小写问题

Git默认文件名和文件夹名是不区分大小写的，如果`README.md` —> `readme.md`是不会提示有变化的， 需要主动设置config

```shell
git config core.ignorecase false
```

但是如果直接改了大小写然后push， 结果就是远程git上会有两份同名大小写的文件。这个就真的很头疼。 百度到这个分步改名法。实测有效

 ```shell
$ git mv ./Docs ./docs.bak
$ git add .
$ git commit -m "改名（第 1/2 步）"

$ git mv ./docs.bak/ ./docs
$ git add .
$ git commit -m "改名（第 2/2 步）"

$ git push
 ```

## git log vs git reflog

`git log`是显示当前分支的历史记录的，但如果有reset操作的话是看不到的。

`git reflog` 可以看到**本地**所有对**HEAD**操作的历史记录，即使是reset， 此外reflog的内容更多，包括切换分支等操作都会被记录下来，但是那些不影响HEAD的操作就不会被记录，比如stash操作

场景1：在branch A上commit代码，然后切到branch B要cherry pick, 打开git log是看不到branch A的commit的，通过git reflog就可以看到。

场景2： 分支被reset回滚了，看git log是看不到那些已经被回滚的commit的，这时候只能git reflog来查看完整的commit记录

## git pull

```shell
git pull = git fetch + git merge
git pull --rebase = git fetch + git rebase
```



## 查找commit来自哪个分支

```shell
git branch --contains <commit-id>
```



## 撤回本地已经commit但是没有push的提交

```shell
# 找到要回滚的地方，一般就是HEAD~1
git reflog 
# --soft 结束之后已经commit的代码会回到stage
# --hard 结束之后已经commit的代码会消失
git reset --soft [<commit-id>/HEAD~n>]
```



## 修改分支名

```shell
git branch -m <oldbranch> <newbranch>
```

## 清除本地untracked的files

```shell
git clean -n # 列出所有要移除的files
git clean -f # 移除
```



## 删除分支

```shell
// delete branch locally
git branch -d localBranchName

// delete branch remotely
git push origin --delete remoteBranchName
git push prod --delete feature/remove-ws
```

## 同步远程github仓库代码

```shell
git fetch upstream && git reset --hard upstream/master && git push -f
```

## 强制刷新远程分支列表

```shell
git remote update prod --prune
```

## 多次rebase主分支时，总是遇到要resolve相同冲突的情况

通过配置rerere， 它就会记住同一个冲突的处理方式

```shell
git config --global rerere.enabled 1
```

## 查看HEAD位置

```shell
cat .git/HEAD
git symbolic-ref HEAD
```

## 移动Branch到指定的commit & 移动HEAD

```shell
git branch -f master commit-sha
git checkout HEAD^ # 往后移动一个commit
git checkout HEAD~4 # 往后移动4个commit
```

