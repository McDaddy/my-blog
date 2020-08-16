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



## 加餐

掘金上一道题，尝试解答一下

[一道价值25k的蚂蚁金服异步串行面试题](https://juejin.im/post/6860646761392930830?utm_source=gold_browser_extension)

```javascript
const log = (v) => console.log(v)

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const subFlow = createFlow([() => delay(1000).then(() => log("c"))]);

createFlow([
  () => log("a"),
  () => log("b"),
  subFlow,
  [() => delay(1000).then(() => log("d")), () => log("e")],
]).run(() => {
  console.log("done");
});

// 需要按照 a,b,延迟1秒,c,延迟1秒,d,e, done 的顺序打印

function composeFunctions(args) {
    const composedFuncs = args.reduce((acc, item) => {
        let _item = item
        if (typeof item === 'function') {
            _item = [async () => {
                await item();
            }]
        } else if (item.functions) {
            _item = item.functions;
        }
        return acc.concat(_item)
    }, []);
    return composedFuncs;
}

function createFlow(args) {
    const totalFunctions = composeFunctions(args);
    return {
        functions: totalFunctions,
        run: (func) => {
            const promise = totalFunctions.reduce((acc, item) => acc.then(() => item()), Promise.resolve());
            return promise.then(() => func());
        },
    };
}
```

实现串行执行器的关键是数组的每一个方法都被Promise包裹，接下来就可以通过一个reduce串成一个总的promise然后顺序执行