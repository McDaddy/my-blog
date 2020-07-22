---
title: API service层的集中管理优化实战
date: 2020-07-22
categories:
 - 前端工程化

---

## 背景

由于后续新需求陆续接入，我所开发的一个大模块将会被应用到各种不同的宿主环境中，而各个环境的后端都是独立环境部署的，为了区分宿主环境可能会有不同的api前缀，比如在客户A是`api/cdp/*`，在客户B是`api/fdp/*`，同时即使在同一环境下，相同功能可能会被应用到不同的模块中，在A模块中`api/cdp/reco`，在B模块中同样的组件就要调用`api/ddp/reco`。

这种情况对大量的api接口管理来说就显得非常捉急，急需一种方案能够适配需求的变动，动态管理api

<!-- more -->

## 现状

以下是目前service层的典型实现

```javascript
import agent from 'agent';

export const getScenarioList = (query: RECO.GetScenarioRequest) => {
  return agent.get('/api/cdp/reco/scenario')
    .query(query)
    .then((response: any) => response.body);
};

export const startScenario = ({ id }: {id: number }) => {
  return agent.post(`/api/cdp/reco/scenario/${id}/start`)
    .then((response: any) => response.body);
};

...
```

主要有几个问题：

1. 无法动态管理api的url
2. 冗余代码太多，类似`then((response: any) => response.body)`这段代码在项目中有几百次的重复
3. 经常容易只写了入参的类型，漏写返回的typescript类型



## 思考与改进

根据上面的问题，几个改进的方向：

1. url可配置化，动态的url参数可作为函数的参数传入配置来生成api
2. 对http库做二次封装，避免冗余代码
3. typescript增强

```javascript
// apiCreator.ts
import { set, get, isEmpty } from 'lodash';
import { compile } from 'path-to-regexp';
import agent from '../../agent';
import { downloadFile } from './index';

interface CallParams {
  $pathParams?: Obj;
  $options?: { isDownload?: boolean };
}

type CallType = CallParams & {
  [k: string]: string;
};

// 抽取出传入api名称的http method
const extraMethod = (apiName: string) => {
  const methods = ['get', 'post', 'put', 'delete'];
  const regexResult = /[a-z]+/.exec(apiName);
  const method = get(regexResult, 0);
  return methods.includes(method || '') ? method : 'get';
};

// 通过path-to-regexp来给带参数的路径填入实际的值
const generatePath = (path: string, pathParams?: Obj) => {
  const toPathRepeated = compile(path);
  return toPathRepeated(pathParams);
};

export const apiCreator = function<T extends Obj> (apisInput: Kv<T>): T {
  const result = {} as T;
  Object.keys(apisInput).forEach(apiName => {
    const method = extraMethod(apiName);
    switch (method) {
      case 'get':
        {
          const getCall = ({ $pathParams, $options = {}, ...rest }: CallType) => {
            const { isDownload } = $options;
            if (isDownload) {
              return agent.get(generatePath(apisInput[apiName], $pathParams)).query(rest).responseType('blob').then((response: any) => downloadFile(response));
            }
            return agent.get(generatePath(apisInput[apiName], $pathParams)).query(rest).then((response: any) => response.body);
          };
          set(result, apiName, getCall);
        }
        break;
      case 'post':
      case 'put':
        {
          const postCall = ({ $pathParams, ...rest }: CallType) => {
            return agent[method](generatePath(apisInput[apiName], $pathParams)).send(isEmpty(rest) ? undefined : rest).then((response: any) => response.body);
          };
          set(result, apiName, postCall);
        }
        break;
      case 'delete':
        {
          const deleteCall = ({ $pathParams, ...rest }: CallType) => {
            return agent.delete(generatePath(apisInput[apiName], $pathParams)).query(rest).then((response: any) => response.body);
          };
          set(result, apiName, deleteCall);
        }
        break;
      default:
        console.warn('not valid call method', method);
        break;
    }
  });
  return result;
};
```



```javascript
// xxService.ts
import { apiCreator } from '../../common/utils';

type IdPathParam = { $pathParams: { id: number } };

interface IRecoService {
  getScenarioList: (query: RECO.GetScenarioRequest) => IPagingResponse<RECO.Scenario>;
  postStartScenario: (params: IdPathParam) => void;
  postStopScenario: (params: IdPathParam) => void;
  getDownloadTagTemplate: (params: { id?: number, $options: { isDownload: boolean } }) => void;
}

const apis = (apiDomain = 'cdp') => ({
  getScenarioList: `/api/${apiDomain}/reco/scenario`,
  postStartScenario: `/api/${apiDomain}/reco/scenario/:id/start`,
  postStopScenario: `/api/${apiDomain}/reco/scenario/:id/stop`,
  getDownloadTagTemplate: `/api/${apiDomain}/reco/rule/downtagtemplate`,
});

export default (apiDomain?: string) => apiCreator<IRecoService>(apis(apiDomain));
```



## 实现思想

- api使用`key-value`的形式配置，其中`key`，必须以http方法小写开头，以此来标示此api的method。`value`为对应的api
- 当遇到需要动态拼的url，可以传入`:id`这样同路由占位符的标示，然后通过传入`$pathParams`在运行时进行填充
- 可以把url都做成模板字符串，这样可以运行时传入参数来动态指定api前缀，甚至实现各种自定义url
- 在定义api配置的同时，需要为这些api同时定义一个对应的interface，这样调用方就能拿到api方法的完整类型。
- 可以传入`$options`来预定义一些特殊请求，比如下载文件。

## 总结

- 使用api的方法与之前差距不大，唯一的区别是如果是动态拼接url就必须手动传入`$pathParams`
- 代码行数大幅减少，去除了大多数冗余代码
- 对http库的进行封装，使得api的配置语法与具体库无关，后续可方便迁移axios等库

