---
title: 可交互CLI实战
date: 2020-05-24
tags:
 - Node
categories:
 - 前端工程化
---

在我工作的项目里，经常需要本地打包工程，之前的方案是`npm script`调用一个写好的shell脚本，但后来由于需求的变化，打包需要注入一定的条件，当然这点是可以通过给shell脚本加参数实现的。 为了更好的本地体验我决定把shell脚本用node重写一遍，并且加入可交互的实现。

<!-- more -->

实现中几个得到的新概念：

1. 在`.js`文件的头上加上`#!/usr/bin/env node`就可以告知CLI我是要用node来运行这个脚本。这样就不需要在`npm script`上用`"release": "node ./tools/script.js"`，而是直接`"release": "./tools/script.js"`
2. `inquirer`是一个用于node CLI做可交互提示的库，可以用它实现很多酷炫的CLI交互效果
3. 通过`require('../package.json’)`可以直接拿到当前项目包括版本在内的全部信息
4. `child_process` 是node自带的执行子线程的API，这次用到的`execSync`就是同步执行，当然它也有异步执行API
5. 在`execSync`的第二个参数option需要加入`{ stdio: 'inherit’ }`是为了将执行命令中的全部输出流都原封不动得传递给父线程，也就是主线程，否则我们是没法看到子线程的log的

以下就是具体实现的代码

```javascript
#!/usr/bin/env node
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */

const inquirer = require('inquirer');
const child_process = require('child_process');
const moment = require('moment');
const pJson = require('../package.json');

const { execSync } = child_process;

const GET_BRANCH_CMD = "git branch | awk '/\\*/ { print $2; }'";
const START_DOCKER_CMD = 'open --background -a Docker';
const GET_SHA_CMD = 'git rev-parse --short HEAD';
const CLEAR_CMD = 'rm -rf ./.happypack && rm -rf ./.terser-cache && rm -rf ./public/*';
const BUILD_DICE = 'npm run build_dice';
const BUILD_ALL = 'npm run build';

const getCurrentBranch = async () => {
  const branch = await execSync(GET_BRANCH_CMD);
  return branch.toString();
};

const prepare = async () => {
  const branch = await getCurrentBranch();
  console.log('当前分支', branch);
  if (!branch.startsWith('release')) {
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'continueBuild',
        message: '当前分支不是release分支，是否继续打包？',
        default: '否',
        choices: ['是', '否'],
      },
    ]);
    if (answer.continueBuild === '否') {
      return Promise.reject(new Error('非release分支, 主动退出!'));
    }
  }
};

const bundlePackage = async () => {
  try {
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'requireGts',
        message: '是否需要打包gts',
        default: '是',
        choices: ['是', '否'],
      },
    ]);
    const { requireGts } = answer;
    await prepare();

    console.log('启动docker');
    execSync(START_DOCKER_CMD);

    console.log('清除本地缓存...');
    execSync(CLEAR_CMD);

    const date = moment().format('YYYYMMDD');
    const shortSha = await execSync(GET_SHA_CMD);
    // GET_SHA_CMD 结果有个回车需要去掉
    const sha = shortSha.toString().replace(/\n/, '');
    const mainVersion = pJson.version.slice(0, -2);
    // 3.14-20200520-182737976
    const version = `${mainVersion}-${date}-${sha}`;
    console.log('开始打包版本：', version);

    if (requireGts === '否') {
      console.log('开始单独打包dice镜像');
      execSync(BUILD_DICE, { stdio: 'inherit' });
    } else {
      console.log('开始打包dice与gts镜像');
      execSync(BUILD_ALL, { stdio: 'inherit' });
    }
    console.log('打包完成!');
    console.log('构建并推送镜像...');
    const image = `registry.cn-hangzhou.aliyuncs.com/terminus/dice-ui:${version}`;
    execSync(`docker build -f local_Dockerfile -t ${image} . || exit 1`, { stdio: 'inherit' });
    execSync(`docker push ${image} || exit 1`, { stdio: 'inherit' });
  } catch (error) {
    console.log('打包中断退出, 由于:', error.message);
  }
};

bundlePackage();

```

效果如图

![CFFFB1FC-2E88-498D-A611-CD81F4AA835A](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/CFFFB1FC-2E88-498D-A611-CD81F4AA835A.gif)

![image-20200524190818916](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200524190818916.png)