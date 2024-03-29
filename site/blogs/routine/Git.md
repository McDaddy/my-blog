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

场景3：commit被本地drop了，通过`git checkout -b xxx ref-sha` 就可以恢复到被删除的commit

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

## 将代码推送到不同的源

```sh
git push -u origin hotfix/release-1.0 // 在推送时强制指向新的源
```

## 强制刷新远程分支列表

```shell
git remote update prod --prune
```

## 查看远程源列表

```shell
git remote -v
```

## 多次rebase主分支时，总是遇到要resolve相同冲突的情况

通过配置rerere， 它就会记住同一个冲突的处理方式

```shell
git config --global rerere.enabled 1
```

### 合并多个commit

```shell
git rebase -i HEAD~2 // 合并最近两个commit
git rebase -i develop // 合并从develop到现在所有的commit

// 会出现编辑框，只保留一个commit，剩下的都标成s即squash
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

## git config

```shell
git config -e 可以直接编辑git的local配置
git config -l 列出所有git配置
```

## 查看所有local分支的源

```shell
git branch -vv
```

## 清理已经在源上删除了的本地分支

通过`git fetch -p && git branch -vv` 可以看到哪些分支的orgin已经是gone了

![image-20210812200803517](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210812200803517.png)

```shell
git fetch -p && for branch in $(git for-each-ref --format '%(refname) %(upstream:track)' refs/heads | awk '$2 == "[gone]" {sub("refs/heads/", "", $1); print $1}'); do git branch -D $branch; done
```

## 如何查看被删除或者被重命名的文件历史

```shell
// 查找出所有文件，从中过滤出所有被删除文件，再过滤出大概的名字，这样就能找到被删除前的路径信息
git log --diff-filter=D --summary | grep delete | grep <file-path-name>
// 可以列出所有文件历史，即使是已经删除的
git log --all --full-history -- <file-path-name>
// 如果文件中间被重命名了，加上follow参数，可以一直追溯到最源头
git log --all --follow --full-history -- <file-path-name>
```

## 如何把A源的分支推到B源

有的时候我们会直接checkout了remote的分支，写完代码后发现推不上去，因为有权限控制。

事实上，我们本意是checkout一个remote分支，然后作为一个本地分支去改代码，此时可以

```shell
git push -u origin // 推到origin同名的branch
git push -u origin // 推到origin指定名称的branch
```

## 如何在一台机器上同时管理gitlab和github的账号

**.gitconfig**

在个人账号的根目录创建一个`.gitconfig`文件

配置user和email作为全局使用

添加一个`includeIf`的配置，下面表示当git工程在`~/work/github-repo/`下面时，需要去找`~/.gitconfig_github_work`这个配置文件

```
[user]
	email = chenweitao.mcdaddy@bytedance.com
	name = chenweitao
[includeIf "gitdir:~/work/github-repo/"]
    path = ~/.gitconfig_github_work
```

然后在`~/.gitconfig_github_work`里也配置下用户信息，这样就可以在不同的路径下用不同的账号拉代码commit代码

```
[user]
    name = McDaddy
    email = mcdaddychen@126.com
```

**ssh**

一般情况下我们都要配置ssh来做免登录，那么怎么同时给两个域名设置ssh呢

核心在于`~/.ssh/config`，为不同的host配置不同的`IdentityFile`即可

```
Host github
HostName github.com
User mcdaddychen@126.com
PreferredAuthentications publickey
IdentityFile ~/.ssh/id_ed25519_github

Host gitlab
HostName gitlab.org
User chenweitao.mcdaddy@gitlab.com
PreferredAuthentications publickey
IdentityFile ~/.ssh/id_ed25519_gitlab
```

## 如何在GitHub上删除敏感信息

- 首先我们要通过`git rebase -i HEAD~x`来本地Drop掉相关的commit，然后强推，这样在分支中就找不到敏感信息了。但是如果有人保留了历史的commit url那还是可以拿到当时的commit的，比如`https://github.com/McDaddy/my-blog/blob/40e15dd93d1964de/site/blogs/routine/Git.md`所以清除还是不彻底的
- 此时需要请求GitHub官方帮助，[官方support](https://support.github.com/contact?tags=docs-generic)中输入`remove cached views`通过弹出的机器人交互，输入要删除的资源链接，然后它会创建一个Ticket去删除，具体执行可能需要12小时到2天，之后这个资源就彻底消失了

