---
title: 一道面试题 — 如何遍历找出当前文件夹下的所有js文件
date: 2020-07-27
sidebar: false
tags:
 - 面试
categories:
 - NodeJS

---

要求：写一个方法，找出指定路径下所有JS文件，结果用一个promise返回一个数组

```
const findJs = (uri:string) => promise<string[]>
```

<!-- more -->

```javascript
const fs = require('fs');
const path = require('path');

const promisify = (noneSyncFunc) => {
    return (...args) => {
        return new Promise((resolve, reject) => {
            noneSyncFunc(...args, (err, result) => {
                if (err) {
                    reject(err);
                }
                resolve(result);
            })
        });
    }
}

const findJs = (pathArg) => {
    return new Promise(async (resolve, reject) => {
        const syncReadDir = promisify(fs.readdir);
        const children =  await syncReadDir(pathArg, { withFileTypes: true });
        const retPathArray = [];
        for (const c of children) {
            if (c.isDirectory()) {
                const subRet = await findJs(path.resolve(pathArg, c.name));
                retPathArray.push(...subRet);
            } else if(c.name.endsWith('.js')) {
                retPathArray.push(path.resolve(pathArg, c.name));
            }
        }
        resolve(retPathArray);
    })
}

findJs(path.resolve(__dirname, '../..', 'src')).then((result) => {
    console.log("result", result)
});
```

**注意点：**

1. fs用来读取文件夹内容的api是readdir， 当传入参数`withFileTypes: true`时，返回的结果是一个`fs.Dirent`类型，这个类型可以用来判断是不是个子文件夹
2. 在遍历的递归调用中，**不能使用** `forEach`来遍历，因为forEach里传的函数，即使是async/await，它也是不会等待的，而是直接同步执行结束
3. 可以用一个promisify来包装一下node原生用Callback回调实现的方法