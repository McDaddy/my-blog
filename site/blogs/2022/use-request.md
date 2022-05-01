---
title: use request 解析
date: 2022-02-01
tags:
 - hooks
categories:
 - React
---

# Ahooks中useRequest解析

1. ## `useRequest`解决了什么问题？

   > `useRequest` 是一个强大的异步数据管理 Hooks，React 项目中的网络请求场景使用 `useRequest` 就够了。

   这是官方对它的简介，那么对我们实际使用者来说它能解决我们什么痛点呢？（此处不是功能介绍，具体功能可以[查看](https://ahooks.js.org/zh-CN/hooks/use-request/index)）

   - 自动化地管理请求所产生的各种状态，如`请求的结果数据/loading状态/成功或失败的状态`
   - 自由地与各种请求工具集成（`axios/superagent/fetch/...`）
   - 自由地选择执行时机
   - 插件化的扩展形式，除了官方提供的插件功能外还可以自定义插件，而插件可以关联到请求的整个生命周期

2. ## 如何实现

### 从API入手构建代码结构

首先从它的API入手

```typescript
const {
  loading: boolean, // 是否是在请求过程中
  data?: TData, // 成功resolve后返回的数据
  error?: Error, // 失败reject后的错误
  params: TParams || [], // 请求的参数
  run: (...params: TParams) => void, // 手动请求的触发方法
  runAsync: (...params: TParams) => Promise<TData>, // 同上，区别是这是异步方法，须要用户自行捕获错误
  refresh: () => void, // 保持参数不变，刷新请求
  refreshAsync: () => Promise<TData>, // 同上，区别是这是异步方法，须要用户自行捕获错误
  mutate: (data?: TData | ((oldData?: TData) => (TData | undefined))) => void, 
  cancel: () => void, // 取消请求的方法
} = useRequest<TData, TParams>(
  service: (...args: TParams) => Promise<TData>,
  options?: {
    manual?: boolean, // 默认在初始化时自动执行，设置为true的话就须要手动执行
    defaultParams?: TParams, // 首次默认执行时，传递给 service 的参数
    onBefore?: (params: TParams) => void, // service 执行前触发
    onSuccess?: (data: TData, params: TParams) => void, // service resolve 时触发
    onError?: (e: Error, params: TParams) => void, // service reject 时触发
    onFinally?: (params: TParams, data?: TData, e?: Error) => void, // service 执行完成时触发
  },
  plugins?: Plugin<TData, TParams>[], // 自定义插件
);
```

有三个入参，其中第一个参数`service`实际上就是一个返回`Promise`的方法，而现在的请求工具库基本都是支持promise的，所以就可以自由兼容各种可能的请求工具

options的实际可选参数不止上面这些，随着plugin的加入，后面还会添加

由此我们可以设想`useRequest`的主代码解构大致如下（先忽略plugins）

```typescript
function useRequest<TData, TParams extends any[]>(
  service: Service<TData, TParams>,
  options?: Options<TData, TParams>,
) {
  const fetchInstance = enhanced(service, options) as any; // 通过service构建出一个fetchInstance，而这个fetchInstance就是包装后的service，添加了一系列被增强的能力
  ...
  return {
    loading: fetchInstance.state.loading, // 被包装的instance拥有一个state属性，可以获取loading/data/error/params 4个状态属性
    data: fetchInstance.state.data,
    error: fetchInstance.state.error,
    params: fetchInstance.state.params || [],
    cancel: useMemoizedFn(fetchInstance.cancel.bind(fetchInstance)), // 同时导出了一系列供使用者操作的函数，这里用useMemoizedFn包装可以理解为加强版的useCallback
    refresh: useMemoizedFn(fetchInstance.refresh.bind(fetchInstance)),
    refreshAsync: useMemoizedFn(fetchInstance.refreshAsync.bind(fetchInstance)),
    run: useMemoizedFn(fetchInstance.run.bind(fetchInstance)),
    runAsync: useMemoizedFn(fetchInstance.runAsync.bind(fetchInstance)),
    mutate: useMemoizedFn(fetchInstance.mutate.bind(fetchInstance)),
  } as Result<TData, TParams>;
}

export default useRequest;
```

### 构建fetchInstance

在不关注如何构建`fetchInstance`的情况下，我们思考下，我们会如何使用这个构造方法和实例

1. 初始化时，我们会给这个构造函数传递，`service/options`
2. 同时也要传入一个更新方法`update`，目的是让`fetchInstance`内部也可以触发组件的重新渲染
3. 在挂载时，判断下是否自动触发请求，如果是的话，那就直接调用实例的`run`方法开始请求
4. 在卸载时，调用实例的`cancel`方法，取消未完成的请求

其中后面三点，有个共同的假设前提，就是`fetchInstance`是一个类实例，因为类实例是拿不到组件的生命周期的，或者说是不能用hooks，所以就需要在它的外面为它提供这个能力

```typescript
function useRequest<TData, TParams extends any[]>(
  service: Service<TData, TParams>,
  options: Options<TData, TParams> = {},
) {
  // 使用useLatest包装一下service,实际就是一个ref
  // 作用是无论传入的service方法实例是否变化,取到的都是ref值，而ref的好处就是不会重新触发渲染
  const serviceRef = useLatest(service);
    
  // 因为这里没有用到任何useState，所以状态的改变并不会触发组件的重新渲染  
  // useUpdate可以理解为触发强制刷新的方法，当fetchInstance当中的状态改变时调用它，可以做到组件的重渲染
  const update = useUpdate();
    
  // useCreation可以理解为useMemo,目的是创建一个不变的实例
  const fetchInstance = useCreation(() => {
    return new Fetch<TData, TParams>(
      serviceRef,
      options,
      update,
    );
  }, []);

  useMount(() => {
    // 在hook（组件）挂载时，如果options没有设置手动触发请求（manual），那么就自动触发请求
    if (!options.manual) {
      const params = options.defaultParams || [];
      fetchInstance.run(...params);
    }
  });

  useUnmount(() => {
    // 当卸载组件时，调用cancel方法，确保进行中的请求都能被正确取消
    fetchInstance.cancel();
  });

  return ...
}
```

接下来，就开始实现这个`fetchInstance`

几个关键点

1. 用一个全局的count计数器来校验请求是否过期，为什么这么做？
   1. 理论上讲，一个service在一个时间点应该只有一个最新请求是有效的，而之前的请求其实就是过期的无效请求，即使返回了也是会被抛弃的
   2. 所以如果使用者高频调用run方法，在前一个请求没返回时，新的请求就应该覆盖老的请求，每次count+1都意味着上一个count的请求已经失效了，同理cancel也是如此
   3. 计数器的作用就是，给每个请求自己一个唯一id，当请求结束时，对比下全局count，确认自己是不是那个最后的请求，或者自己有没有被取消
2. 生命周期的切分，主要分为以下几个生命周期阶段，在这些阶段，可以执行options里传入的各种钩子函数
   1. 请求前`onBefore`
   2. 请求成功`onSuccess`
   3. 请求失败`onError`
   4. 请求结束`onFinally`
3. fetch实例更新了自身的状态后，最终还是需要通过外面传进来的`update`来触发组件重渲染

```typescript
export default class Fetch<TData, TParams extends any[]> {
  // 用于校验当前请求是否过期
  count: number = 0;

  // 定义和初始化state状态，这就是最终会返回出去的4个状态
  state: FetchState<TData, TParams> = {
    loading: false,
    params: undefined,
    data: undefined,
    error: undefined,
  };

  // 构造函数接收，刚才的三个参数： service,options以及用于强制刷新的update
  constructor(
    public serviceRef: MutableRefObject<Service<TData, TParams>>,
    public options: Options<TData, TParams>,
    public subscribe: Subscribe,
  ) {
    this.state = {
      ...this.state,
      // 初始化时，只要不是手动触发，那么loading自动就为true
      loading: !options.manual,
    };
  }

  // 更新自身实例上的状态
  setState(s: Partial<FetchState<TData, TParams>> = {}) {
    this.state = {
      ...this.state,
      ...s,
    };
    // 触发渲染还是要通过外面传入的update
    this.subscribe();
  }

  // 异步请求
  async runAsync(...params: TParams): Promise<TData> {
    // 每次请求都把count + 1，而这个count值就是当前这个请求的唯一性id
    // 当请求结束后，会将currentCount与全局count做一个比较
    // 如果不相等，说明这个请求中途已经被取消了，或者有一个更新的请求在它之后被发起，这种情况的结果都是需要被忽略的
    // 如果相同，再进行下一步的状态变更
    this.count += 1;
    const currentCount = this.count;

    // 请求开始前，把loading设为true，传入的params也放到state中
    this.setState({
      loading: true,
      params,
    });

    // 如果options里有onBefore函数，那么在这个时机执行
    this.options.onBefore?.(params);

    try {
      // 调用传入的serviceRef，会得到一个promise
      const  servicePromise = this.serviceRef.current(...params);

      // await得到返回，这里有try/catch包裹，如果出错会走到catch里
      const res = await servicePromise;

      // 如果请求的id和全局count不一致，说明这个请求已经被取消了，直接返回空
      if (currentCount !== this.count) {
        // prevent run.then when request is canceled
        return new Promise(() => {});
      }

      // 此时请求已经结束，把loading设为false，因为没进catch所以error也设空，同时把data赋上结果res
      this.setState({
        data: res,
        error: undefined,
        loading: false,
      });

      // 如果有传onSuccess函数，那么在这个时机执行
      this.options.onSuccess?.(res, params);
      // 如果有传onFinally函数，那么在这个时机执行
      this.options.onFinally?.(params, res, undefined);

      return res;
    } catch (error) {
      // 同上
      if (currentCount !== this.count) {
        // prevent run.then when request is canceled
        return new Promise(() => {});
      }

      // 请求出错，依然要设置loading为false表示结束，同时设置error
      this.setState({
        error,
        loading: false,
      });
      // 如果有传onError函数，那么在这个时机执行
      this.options.onError?.(error, params);
      // 如果有传onFinally函数，不论成功失败最终都会执行
      this.options.onFinally?.(params, undefined, error);
      // 抛出错误，如果调用的是run方法，那么还是会被捕获的，但直接调用runAsync就需要使用者自己去捕获了
      throw error;
    }
  }

  // 与runAsync的区别就是，这里不需要使用者去捕获错误
  run(...params: TParams) {
    this.runAsync(...params).catch((error) => {
      if (!this.options.onError) {
        console.error(error);
      }
    });
  }

  // 当调用cancel，就直接把全局count加1，当请求结束时就能发现自身已经被取消了
  cancel() {
    this.count += 1;
    this.setState({
      loading: false,
    });
  }

  // 直接拿当前的请求参数再次发起一次请求
  // 使用refresh的前提是之前已经发起过一次请求，否则就不会带任何参数
  refresh() {
    this.run(...(this.state.params || []));
  }

  // 同run与runAsync的关系
  refreshAsync() {
    // @ts-ignore
    return this.runAsync(...(this.state.params || []));
  }

  // 用于修改data
  mutate(data?: TData | ((oldData?: TData) => TData | undefined)) {
    let targetData: TData | undefined;
    if (typeof data === 'function') {
      targetData = data(this.state.data);
    } else {
      targetData = data;
    }

    this.setState({
      data: targetData,
    });
  }
}
```

至此，我们就完成了useRequest的基本功能，使用以上代码，[基本用法](https://ahooks.js.org/zh-CN/hooks/use-request/basic/)就都可以正常使用了

### 引入Plugins

`useRequest`除了以上基本功能外，最强大的特性就是它的插件功能，它不仅有一系列实用的自带plugin，同时也允许用户自行扩展

首先我们需要明确，插件是什么以及它的作用是什么

- 插件可以理解为生命周期钩子函数的集合，如果熟悉webpack的同学应该了解，webpack的plugin就是定义了一系列的钩子函数，对应在构建的生命周期上，当构建到这个生命周期时便会触发这个注册的钩子函数。而生命周期在这里，指的就是单个请求的

  - 请求前`onBefore`
  - 请求中`onRequest`
  - 请求成功`onSuccess`
  - 请求失败`onError`
  - 请求结束`onFinally`
  - 请求取消`onCancel`
  - 修改结果数据`onMutate`

  所以一个插件最后导出的就是一个有若干`onXxx`属性的对象

- 插件的意义就是基础功能的增强，在这些生命周期里添加额外的功能。同时代码不与主代码耦合，可以做到随时插拔

- 插件同时也是一个hook，这样可以让plugin也拥有React的生命周期

这里我们先写一个自定义的插件，这个插件本身没有用到任何hook，作用就是能在各个生命周期节点打印一行log，为了实现这个功能，我们只需要导出一个对象，里面包含各个生命周期的钩子函数即可。此外`onInit`的作用是在初始化时，修改fetchInstance的初始值

```typescript
const useLogPlugin: Plugin<any, any[]> = () => {
  return {
    onBefore: () => {
      console.log('onBefore');
    },
    onRequest: () => {
      console.log('onRequest');
      return { servicePromise: Promise.resolve()};
    },
    onSuccess: () => {
      console.log('onSuccess');
    },
    onError: () => {
      console.log('onError');
    },
    onFinally: () => {
      console.log('onFinally');
    },
    onCancel: () => {
      console.log('onCancel');
    },
    onMutate: () => {
      console.log('onMutate');
    },
  };
};


useLogPlugin.onInit = () => {
  console.log('init log plugin')
  return {} as any
}

export default useLogPlugin;
```



现在我们再回到`useRequest`中，开始想如何把plugin集成到这个hook中

```typescript
function useRequest<TData, TParams extends any[]>(
  service: Service<TData, TParams>,
  options: Options<TData, TParams> = {},
  plugins: Plugin<TData, TParams>[] = [], // 传入第三个参数一个插件数组
) {
  ...
  
  const fetchInstance = useCreation(() => {
    // 遍历插件数组，如果插件上有onInit方法，那就在初始化fetchInstance前执行，最终返回一个被插件们初始化的状态
    const initState = plugins.map((p) => p?.onInit?.(options)).filter(Boolean);
    return new Fetch<TData, TParams>(serviceRef, options, update, Object.assign({}, ...initState));
  }, []);
  fetchInstance.options = options;
  // 注册所有的plugin
  fetchInstance.pluginImpls = plugins.map((p) => p(fetchInstance, options));

  ...

  return ...
}
```

其中这行代码可以说是整个useRequest中的核心

```typescript
fetchInstance.pluginImpls = plugins.map((p) => p(fetchInstance, options));
```

假设我有A/B/C三个plugin传入，这段代码可以等价为

```javascript
const hookA = useHookA(fetchInstance, options);
const hookB = useHookB(fetchInstance, options);
const hookC = useHookC(fetchInstance, options);

fetchInstance.pluginImpls = [hookA, hookB, hookC];
```

在我们的日常认知里面，写hooks有一条铁律就是不能在条件判断或者循环体里使用hook。这里的原因想必大家也都清楚，因为React Hooks在组件中是以一个链式的顺序执行的，如果违反这个规则，那么就有可能两次渲染用到的hook无法对齐，导致不可预知的错误。

而在这里，其实就是打破了我们的一个固定思维，只要保证循环体每次执行的结果是不变的，**那hook也是可以在循环体里使用的**。

通过上面的代码，`fetchInstance.pluginImpls`就得到了一个钩子函数的集合数组，结构类似

```typescript
[
	{
    onBefore: () => {}
    onSuccess: () => {}
  },
  {
    onBefore: () => {}
    onError: () => {}
  },
]
```

然后我们继续实现fetchInstance

```typescript
export default class Fetch<TData, TParams extends any[]> {
  ...
  // 注册在这个请求实例上的所有plugin
  pluginImpls: PluginReturn<TData, TParams>[];

  ...

  // 通过这个方法，在各个生命周期调用各个plugin的钩子函数
  runPluginHandler(event: keyof PluginReturn<TData, TParams>, ...rest: any[]) {
    // @ts-ignore
    const r = this.pluginImpls.map((i) => i[event]?.(...rest)).filter(Boolean);
    return Object.assign({}, ...r);
  }

  async runAsync(...params: TParams): Promise<TData> {
    ...
    const state = this.runPluginHandler('onBefore', params);

    this.setState({
      loading: true,
      params,
      ...state, // onBefore的plugin可能改变state
    });

    // 如果options里有onBefore函数，那么在这个时机执行
    this.options.onBefore?.(params);

    try {
      // 这里可以劫持原本的service
      let { servicePromise } = this.runPluginHandler('onRequest', this.serviceRef.current, params);
      // 如果onRequest钩子没有劫持这个service，还是用来的service执行
      if (!servicePromise) {
        servicePromise = this.serviceRef.current(...params);
      }
      const res = await servicePromise;
      ...

      this.options.onSuccess?.(res, params);
			// 此时执行成功，执行所有onSuccess的钩子函数
      this.runPluginHandler('onSuccess', res, params);

      this.options.onFinally?.(params, res, undefined);
      // 执行onFinally钩子函数
      this.runPluginHandler('onFinally', params, res, undefined);

      return res;
    } catch (error) {
      // 同上
      if (currentCount !== this.count) {
        // prevent run.then when request is canceled
        return new Promise(() => {});
      }

      // 请求出错，依然要设置loading为false表示结束，同时设置error
      this.setState({
        error,
        loading: false,
      });
      // 如果有传onError函数，那么在这个时机执行
      this.options.onError?.(error, params);
			// 执行onError钩子函数
      this.runPluginHandler('onError', error, params);
      // 如果有传onFinally函数，不论成功失败最终都会执行
      this.options.onFinally?.(params, undefined, error);

		  // 同理，执行onFinally钩子函数
      this.runPluginHandler('onFinally', params, res, undefined);
      // 抛出错误，如果调用的是run方法，那么还是会被捕获的，但直接调用runAsync就需要使用者自己去捕获了
      throw error;
    }
  }

  cancel() {
    this.count += 1;
    this.setState({
      loading: false,
    });
		// 执行onCancel钩子函数
    this.runPluginHandler('onCancel');
  }

  ...

  mutate(data?: TData | ((oldData?: TData) => TData | undefined)) {
    ...
    this.runPluginHandler('onMutate', targetData);

    this.setState({
      data: targetData,
    });
  }
}
```

经过上面的改造，当我们传入`useLogPlugin`后，就可以看到控制台打印了预期的log信息



![image-20220419193446042](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20220419193446042.png)

基于以上我们就完成了`useRequest`的核心代码了。

### 预设Plugin

那么接下来，我们就看下这些预设的plugin是怎么实现的

#### useLoadingDelayPlugin

延迟loading插件，请求只要在`loadingDelay`时间内请求结束就不显示loading状态，目的是让一些速度很快的情况不要显示多余的loading信息，使得页面有闪烁。实现原理

1. 维护了一个定时器timer的ref，这在整个生命周期保持引用不变
2. 在onBefore钩子里开启定时器，等到传入的时间到了才改变fetchInstance的loading为true
3. 在onBefore直接返回状态loading为false
4. 在Finally和Cancel的钩子里取消定时器

```typescript
const useLoadingDelayPlugin: Plugin<any, any[]> = (fetchInstance, { loadingDelay }) => {
  // 维护了一个定时器timer的ref，这在整个生命周期保持引用不变
  const timerRef = useRef<Timeout>();

  // 如果没传loadingDelay，那相当于没用这么插件
  if (!loadingDelay) {
    return {};
  }

  const cancelTimeout = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  return {
    onBefore: () => {
      // 如果一个请求重复触发，把之前的计时器重置
      cancelTimeout();

      timerRef.current = setTimeout(() => {
        // 到时间了再set loading
        fetchInstance.setState({
          loading: true,
        });
      }, loadingDelay);

      // 初始状态一定是loading为false
      return {
        loading: false,
      };
    },
    onFinally: () => {
      cancelTimeout();
    },
    onCancel: () => {
      cancelTimeout();
    },
  };
};
```



#### usePollingPlugin

轮询插件，作用是轮询一个请求。传入`pollingInterval`设置轮询间隔，`pollingWhenHidden`设置是否当页面不可见时停止轮询

实现原理：

1. 与`LoadingDelayPlugin`非常像，需要维护一个timer计时器，此处用于轮询计时
2. 当首次请求结束之后，启动这个计时器，当到时间时，调用`refresh`方法，重试这个请求，结束后又会启动计时器，一直循环下去
3. 如果设置了`pollingWhenHidden`为false或者没设置，那么在页面不可见时，需要注册一个对页面重新显示事件的监听，当页面重新显示时，重新触发一次请求，这里用到了`document.visibilityState`来判断这个页面是否可见

```typescript
const usePollingPlugin: Plugin<any, any[]> = (
  fetchInstance,
  { pollingInterval, pollingWhenHidden = true },
) => {
  const timerRef = useRef<Timeout>();
  const unsubscribeRef = useRef<() => void>();

  const stopPolling = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    unsubscribeRef.current?.(); // 这里其实是一个unsubscribe函数
  };

  // useUpdateEffect 可以理解为不会在mount时执行的useEffect
  // 此处监听外面传来的pollingInterval，渲染过程中被置空了那就要停止这个轮询
  useUpdateEffect(() => {
    if (!pollingInterval) {
      stopPolling();
    }
  }, [pollingInterval]);

  if (!pollingInterval) {
    return {};
  }

  return {
    onBefore: () => {
      // 重复请求都要重置状态
      stopPolling();
    },
    onFinally: () => {
      // 默认在页面不可见时会停止轮询，这种情况下，需要去监听页面何时重新被激活，然后再触发一次请求以继续这个轮询
      if (!pollingWhenHidden && !isDocumentVisible()) {
        unsubscribeRef.current = subscribeReVisible(() => {
          fetchInstance.refresh();
        });
        return;
      }

      timerRef.current = setTimeout(() => {
        fetchInstance.refresh();
      }, pollingInterval);
    },
    onCancel: () => {
      // 当调用cancel方法，重置状态，即停止了整个轮询
      stopPolling();
    },
  };
};

function canUseDom() {
  return !!(typeof window !== 'undefined' && window.document && window.document.createElement);
}

function isDocumentVisible(): boolean {
  if (canUseDom()) {
    return document.visibilityState !== 'hidden';
  }
  return true;
}
```

这里的重点是如何在文档流不可见时，注册监听当文档重新可见时触发请求

1. 这里是一个**Pub-Sub**的设计模式，当上面的代码判断当前不可见后，就会调用这里的`subscribe`方法
2. 实际就是为`visibilitychange`这个事件添加了一个订阅者
3. 当visibilitychange事件触发后，如果文档可见，那么就会通知所有的订阅者执行方法
4. 在订阅方法的最后return一个`unsubscribe`方法把订阅者自身移除出队列，这样订阅者就可以主动结束订阅

```typescript
const listeners: any[] = [];

function subscribe(listener: () => void) {
  listeners.push(listener);
  // 返回方法来移除自身，做到取消订阅
  return function unsubscribe() {
    const index = listeners.indexOf(listener);
    listeners.splice(index, 1);
  };
}

if (canUseDom()) {
  const revalidate = () => {
    if (!isDocumentVisible()) return;
    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i];
      listener();
    }
  };
  window.addEventListener('visibilitychange', revalidate, false);
}

export default subscribe;
```



#### useAutoRunPlugin

`useAutoRunPlugin`对应了[Ready](https://ahooks.js.org/zh-CN/hooks/use-request/ready)和[依赖刷新](https://ahooks.js.org/zh-CN/hooks/use-request/refresy-deps)两个功能点。

主要功能是

1. 当传入ready state参数后，只有当ready为true时，请求才会触发，否则被阻止
2. 当传入refreshDeps参数后，当依赖的参数变化后才会重新触发请求

实现原理：

1. 传入ready，判断ready不为true时，在onBefore钩子里返回`stopNow`来取消请求
2. 上面提到过fetchInstance会把service包装成一个ref，这样无论service本身怎么变化，都不会触发重新的请求。那要重新请求只能利用fetchInstance的`refresh`方法
3. 利用effect来监听传入的`refreshDeps`变化，如果变化就调用refresh方法。

```typescript
// support refreshDeps & ready
const useAutoRunPlugin: Plugin<any, any[]> = (
  fetchInstance,
  { manual, ready = true, defaultParams = [], refreshDeps = [], refreshDepsAction },
) => {
  // 标志位，用来标志是否自动请求
  const hasAutoRun = useRef(false);
  // 这句不是多余的，可以参考useLatest这个hook，目的是每次渲染时都重新给这个ref赋上值
  hasAutoRun.current = false;

  // 当ready变为true后，触发自动请求
  useUpdateEffect(() => {
    if (!manual && ready) {
      hasAutoRun.current = true;
      fetchInstance.run(...defaultParams);
    }
  }, [ready]);

  // 当依赖项变化时，重新请求
  useUpdateEffect(() => {
    if (hasAutoRun.current) {
      // 细节：当ready从false转为true后，首先要触发上面那个Effect，并把hasAutoRun.current设为true
      // 试想下如果在使用时，同时在组件里更改ready和refreshDeps的值，那么就会同时触发这两个Effect，
      // 导致的结果就是请求重复两次。 这个细节就能解决这个问题
      // 而当一次渲染结束之后，hasAutoRun.current又会被重置为false，此时再去改refreshDeps，就能正常触发refresh了
      // 同时，两个Effect的代码顺序也要固定，因为hooks是链式结构顺序执行的，如果对调，不仅会发生上面的问题，还会因为refresh执行先于run导致refresh拿不到参数
      return;
    }
    if (!manual) {
      hasAutoRun.current = true;
      if (refreshDepsAction) {
        refreshDepsAction();
      } else {
        fetchInstance.refresh();
      }
    }
    // 这里是一个细节，必须用rest表达式把传入的数组中的每个值解构出来，传入deps
    // 如果不加这三个点，那么依赖的就是整个数组，在外面传值的时候，只要不被useMemo包裹，就会进入无限循环，页面卡死的情况
  }, [...refreshDeps]);

  return {
    onBefore: () => {
      // 每次发起请求，比如触发run方法，走到onBefore钩子，只要ready不为true，那么就会返回stopNow标志来停止请求
      if (!ready) {
        return {
          // fetchInstance会接受这个钩子的结果然后取消请求
          stopNow: true,
        };
      }
    },
  };
};

// 初始化plugin时，根据ready和manual两个值得到loading的初始状态
useAutoRunPlugin.onInit = ({ ready = true, manual }) => {
  return {
    loading: !manual && ready,
  };
};
```



#### useRefreshOnWindowFocusPlugin

主要作用是当页面不被focus后重新进入页面时，自动触发请求。接收两个参数`refreshOnWindowFocus`开启此功能，`focusTimespan`重新请求间隔。这里有一个**容易误解的地方**，这个focusTimespan并不是指失焦的总时长，而是两次Focus之间的时间差，简单解释就是

- 开启功能后，第一次失焦后重新回来，不论时间多短都会重新请求，此时时间为t1
- 第二次失焦重新回来，时间为t2，如果t2-t1 大于了focusTimespan则会重新请求，否则不会请求

主要原理：

1. 与 `usePollingPlugin`类似，维护一个取消订阅的方法
2. 判断是否失焦的方法是监听`focus`事件
3. 当判断得知页面重新获焦，执行*节流版*的refresh操作即可

```typescript
const useRefreshOnWindowFocusPlugin: Plugin<any, any[]> = (
  fetchInstance,
  { refreshOnWindowFocus, focusTimespan = 15000 },
) => {
  const unsubscribeRef = useRef<() => void>();

  // 停止监听的函数 类似 usePollingPlugin 中的实现
  const stopSubscribe = () => {
    unsubscribeRef.current?.();
  };

  useEffect(() => {
    if (refreshOnWindowFocus) {
      // bind是为了在refresh方法中能拿到this
      const limitRefresh = limit(fetchInstance.refresh.bind(fetchInstance), focusTimespan);
      unsubscribeRef.current = subscribeFocus(() => {
        // 当重新被focus时，判断距离上次请求是否满focusTimespan，是的话触发请求
        limitRefresh();
      });
    }
    return () => {
      // 支持动态改变两个参数，每次改变都会把之前的监听给取消了
      stopSubscribe();
    };
  }, [refreshOnWindowFocus, focusTimespan]);

  useUnmount(() => {
    stopSubscribe();
  });

  return {};
};

// 可以理解为一个节流操作
export default function limit(fn: any, timespan: number) {
  let pending = false;
  return (...args: any[]) => {
    if (pending) return;
    pending = true;
    fn(...args);
    setTimeout(() => {
      pending = false;
    }, timespan);
  };
}
```



#### useDebouncePlugin

`useDebouncePlugin`通过设置 `debounceWait`，进入防抖模式，此时如果频繁触发 `run` 或者 `runAsync`，则会以防抖策略进行请求。

实现原理：

1. debounce的实现是借用了`lodash`的debounce方法
2. 传入的参数作用与lodash的debounce方法一致
3. 当高频调用run或者runAsync方法时，这个执行方法其实已经是被debounce包裹了，自然有了防抖的效果
4. 调用fetchInstance的cancel方法，直接调用debounce的cancel，可以取消未执行的请求

```typescript
const useDebouncePlugin: Plugin<any, any[]> = (
  fetchInstance,
  { debounceWait, debounceLeading, debounceTrailing, debounceMaxWait },
) => {
  // debounce方法的ref
  const debouncedRef = useRef<DebouncedFunc<any>>();

  // 将传入的参数转换成lodash.debounce需要的参数
  const options = useMemo(() => {
    const ret: DebounceSettings = {};
    if (debounceLeading !== undefined) {
      ret.leading = debounceLeading;
    }
    if (debounceTrailing !== undefined) {
      ret.trailing = debounceTrailing;
    }
    if (debounceMaxWait !== undefined) {
      ret.maxWait = debounceMaxWait;
    }
    return ret;
  }, [debounceLeading, debounceTrailing, debounceMaxWait]);

  useEffect(() => {
    // debounceWait不为空时，才会执行debounce
    if (debounceWait) {
      // 因为lodash.debounce方法的Callback需要返回promise，所以这里需要劫持一下
      const _originRunAsync = fetchInstance.runAsync.bind(fetchInstance);

      // debouncedRef.current 注册为一个debounce方法
      debouncedRef.current = debounce(
        (callback) => {
          callback();
        },
        debounceWait,
        options,
      );

      // debounce runAsync should be promise
      // https://github.com/lodash/lodash/issues/4400#issuecomment-834800398
      fetchInstance.runAsync = (...args) => {
        return new Promise((resolve, reject) => {
          debouncedRef.current?.(() => {
            _originRunAsync(...args)
              .then(resolve)
              .catch(reject);
          });
        });
      };

      return () => {
        // debounceWait动态变化时，取消延迟的函数调用
        // 比如设置了一个很长的debounceWait，第一次触发后，还没开始请求，此时改变debounceWait，就要把那个还没开始的请求取消掉
        debouncedRef.current?.cancel();
        fetchInstance.runAsync = _originRunAsync;
      };
    }
  }, [debounceWait, options]);

  if (!debounceWait) {
    return {};
  }

  return {
    onCancel: () => {
      // 这个cancel方法是lodash.debounce提供的方法
      debouncedRef.current?.cancel();
    },
  };
};
```

#### useThrottlePlugin

实现原理与`useDebouncePlugin`相同，区别就是调用了lodash的`throttle`方法

```typescript
const useThrottlePlugin: Plugin<any, any[]> = (
  fetchInstance,
  { throttleWait, throttleLeading, throttleTrailing },
) => {
  const throttledRef = useRef<DebouncedFunc<any>>();

  const options: ThrottleSettings = {};
  if (throttleLeading !== undefined) {
    options.leading = throttleLeading;
  }
  if (throttleTrailing !== undefined) {
    options.trailing = throttleTrailing;
  }

  useEffect(() => {
    if (throttleWait) {
      const _originRunAsync = fetchInstance.runAsync.bind(fetchInstance);

      throttledRef.current = throttle(
        (callback) => {
          callback();
        },
        throttleWait,
        options,
      );

      // throttle runAsync should be promise
      // https://github.com/lodash/lodash/issues/4400#issuecomment-834800398
      fetchInstance.runAsync = (...args) => {
        return new Promise((resolve, reject) => {
          throttledRef.current?.(() => {
            _originRunAsync(...args)
              .then(resolve)
              .catch(reject);
          });
        });
      };

      return () => {
        fetchInstance.runAsync = _originRunAsync;
        throttledRef.current?.cancel();
      };
    }
  }, [throttleWait, throttleLeading, throttleTrailing]);

  if (!throttleWait) {
    return {};
  }

  return {
    onCancel: () => {
      throttledRef.current?.cancel();
    },
  };
};
```

#### useRetryPlugin

`useRetryPlugin`通过设置 `options.retryCount`，指定错误重试次数，则 useRequest 会在失败后会进行重试指定的次数。

比如把`retryCount`设置为3，那么当一次正常请求失败后，它会在后续自动重试三次，如果中间成功了，就不会继续重试

实现原理：

1. 设置一个计数器ref，用于记录重试的次数，初始为0
2. 设置一个timerRef，用于做重试之间的时间间隔
3. 在onBefore的钩子里，如果是普通请求就把计数器置为零
4. 在onError钩子里，把计数器+1，只要数量还没达到retryCount说明可以继续重试，此时设定timerRef在`retryInterval`之后调用`refresh`方法进行重试。如果到达了retryCount，那就把计数器置0，不再继续重试
5. 在onSuccess钩子里，将计数器置0。这里所有的计数器归零操作都是为了下次正常请求失败时，重试次数都是从0开始的，否则就达不到预期的重试次数。
6. 一句话总结就是，失败的时候用定时器重试，用ref记录重试次数，每次失败计数加1，直到达到retryCount，如果中间成功了或者被使用者手动发起新的请求，计数器归零，不再重试

```typescript
const useRetryPlugin: Plugin<any, any[]> = (fetchInstance, { retryInterval, retryCount }) => {
  const timerRef = useRef<Timeout>();
  // 触发重试的次数
  const countRef = useRef(0);

  // 表示这个请求是否是由重试触发的
  const triggerByRetry = useRef(false);

  // 必须有retryCount才能触发重试
  if (!retryCount) {
    return {};
  }

  return {
    onBefore: () => {
      // 如果是正常触发，即不是由重试触发的，则重置计数
      // 这里的作用是，如果在自动重试的过程中，用户手动触发了请求，重试次数就要归零
      if (!triggerByRetry.current) {
        countRef.current = 0;
      }
      // 不论是否是重试触发的，都要设置为false
      // triggerByRetry.current的作用只是为了在上面这个条件判断中使用
      // 如果后面再次出错，那又会重新被设置为true，否则这就会被当成是一次普通请求
      triggerByRetry.current = false;

      // 重置计时器
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    onSuccess: () => {
      // 成功了之后就要把计数器重置，否则下次请求如果出错，重试的次数就错了
      countRef.current = 0;
    },
    onError: () => {
      // 请求出错时，如果计数器小于retryCount，则计数器+1
      // 如果retryCount为-1，则表示不限制重试次数
      countRef.current += 1;
      if (retryCount === -1 || countRef.current <= retryCount) {
        // 如果不设置retryInterval，默认采用简易的指数退避算法，
        // 取 1000 * 2 ** retryCount，也就是第一次重试等待 2s，第二次重试等待 4s，以此类推，如果大于 30s，则取 30s
        const timeout = retryInterval ?? Math.min(1000 * 2 ** countRef.current, 30000);
        timerRef.current = setTimeout(() => {
          // 到达重试时间，触发refresh，同时设置triggerByRetry.current为true，表示这次请求是由重试触发的
          triggerByRetry.current = true;
          fetchInstance.refresh();
        }, timeout);
      } else {
        // 超过重试次数，不再重试，并把计数器归零
        countRef.current = 0;
      }
    },
    onCancel: () => {
      // 归零计数器并取消当前正在等待执行的重试
      countRef.current = 0;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
  };
};
```

#### useCachePlugin

`useCachePlugin`的功能非常多，总结起来有以下几点

1. 设置了`cacheKey`之后，当第一次请求成功之后，会缓存返回的结果，当第二次发起请求时会先显示上次缓存的结果，这样就没有了loading的显示，且可以直接看到数据展示
2. 如果这个缓存已经过期了就会发起一次新的请求，当新的请求的结果返回后会覆盖之前缓存的结果用于展示，并成为新的缓存
3. 通过`staleTime`来设置缓存的保质期，即多少时间内这个缓存的内容是值得信任的
4. 通过`cacheTime`来设置缓存的超时时间，即超过这个时间该缓存就会被删除
5. 当多个共用同个`cacheKey`的请求同时发起时，只会同时有一个请求触发，后面发起的都会共用同一个promise
6. 同时，这些请求也会共享一个结果，即两个共享`cacheKey`的请求得到的结果是同步的
7. 可以缓存请求的参数，在下次初始化时，直接得到上次请求的参数
8. 可以自定义缓存，可以存到如`localStorage`或者`indexDB`等介质中

实现原理：

1. 用一个全局的Map的充当全局缓存，以cacheKey为key
2. 初始化组件时，尝试从缓存中取得数据，如果有的话，就直接设置成fetchInstance的data用于页面直接展示。同时订阅这个cacheKey的缓存变化，如果别的组件请求使得缓存得到更新，它也要执行回调以保持同步
3. 在onBefore钩子中，判断是否有缓存，有的话直接展示，同时判断缓存是否过期，如果过期就再发起一个请求
4. 当请求成功了，把数据放入缓存并通知所有的订阅者缓存更新请同步，同时更新自己的展示

```typescript
const useCachePlugin: Plugin<any, any[]> = (
  fetchInstance,
  {
    cacheKey,
    cacheTime = 5 * 60 * 1000,
    staleTime = 0,
    setCache: customSetCache,
    getCache: customGetCache,
  },
) => {
  const unSubscribeRef = useRef<() => void>();

  // 请求promise的ref,确保共享cacheKey时同一时刻只有一个请求
  const currentPromiseRef = useRef<Promise<any>>();

  const _setCache = (key: string, cachedData: CachedData) => {
    // 如果是自定义缓存，那就执行自定义的设置缓存方法
    if (customSetCache) {
      customSetCache(cachedData);
    } else {
      cache.setCache(key, cacheTime, cachedData);
    }
    // 发布缓存更新事件，所有订阅了缓存更新的组件都会收到缓存更新事件，然后执行订阅的回调
    cacheSubscribe.trigger(key, cachedData.data);
  };

  const _getCache = (key: string, params: any[] = []) => {
    // 如果是自定义缓存，那就执行自定义的取缓存方法
    if (customGetCache) {
      return customGetCache(params);
    }
    return cache.getCache(key);
  };

  // 初始化只执行一次，这里换成useMount应该效果一样
  // 这段的作用是在页面挂载时，还未开始做任何请求前，先把缓存拿到渲染页面
  useCreation(() => {
    // 只有设置了cacheKey才会缓存
    if (!cacheKey) {
      return;
    }

    // 初始化时从缓存中获取数据
    const cacheData = _getCache(cacheKey);
    // 取到了缓存同时里面有data这个属性，表示确实有数据
    // 因为缓存里包含data/time/params三个属性，所以可能出现有其它两个属性，但data属性不存在的情况
    if (cacheData && Object.hasOwnProperty.call(cacheData, 'data')) {
      // 直接把缓存里的数据设置给fetchInstance的状态
      fetchInstance.state.data = cacheData.data;
      fetchInstance.state.params = cacheData.params;
      // staleTime为-1表示不会过期，或者当前时间-缓存时间<staleTime时，表示还没过期，可以直接使用缓存的数据，此时不需要loading
      if (staleTime === -1 || new Date().getTime() - cacheData.time <= staleTime) {
        fetchInstance.state.loading = false;
      }
    }

    // subscribe same cachekey update, trigger update
    unSubscribeRef.current = cacheSubscribe.subscribe(cacheKey, (data) => {
      fetchInstance.setState({ data });
    });
  }, []);

  useUnmount(() => {
    // 卸载组件时要取消订阅
    unSubscribeRef.current?.();
  });

  if (!cacheKey) {
    return {};
  }

  return {
    onBefore: (params) => {
      // 在onBefore钩子中先获取缓存，这段逻辑同上
      const cacheData = _getCache(cacheKey, params);

      if (!cacheData || !Object.hasOwnProperty.call(cacheData, 'data')) {
        return {};
      }

      // If the data is fresh, stop request
      if (staleTime === -1 || new Date().getTime() - cacheData.time <= staleTime) {
        return {
          loading: false,
          data: cacheData?.data,
          returnNow: true, // returnNow不同于stopNow，后者也是结束请求但不返回数据，而returnNow会返回缓存的数据
        };
      } else {
        // 如果缓存过期，先返回缓存的数据给页面显示，同时继续请求
        return {
          data: cacheData?.data,
        };
      }
    },
    onRequest: (service, args) => {
      // 每次请求后（只是发起请求，不是指请求结束）都会把当前请求的promise设置给currentPromiseRef
      let servicePromise = cachePromise.getCachePromise(cacheKey);

      // 这段逻辑是为了复用promise请求，同时防止自身重复请求被阻止
      // 假设有A/B两个组件共享cacheKey，A开始请求，此时A的currentPromiseRef.current为空，缓存也为空，不会走进这个判断逻辑
      // A的请求会被赋到currentPromiseRef.current中，同时缓存起来
      // 当A的请求还没结束，B开始请求，此时B的currentPromiseRef.current为空，缓存为A的请求，两者不同会走这个判断逻辑
      // 此时B就会得到A的请求然后直接return，不再发起新的请求
      // 同理，当A的请求还没结束，A又再次发起请求，此时会发现currentPromiseRef.current和缓存中的promise是同一个
      // 就会跳过这段逻辑，开始新的请求
      if (servicePromise && servicePromise !== currentPromiseRef.current) {
        return { servicePromise };
      }
      // 在没有找到promise缓存的情况下，新建一个promise进行请求，并放入缓存中
      servicePromise = service(...args);
      currentPromiseRef.current = servicePromise;
      cachePromise.setCachePromise(cacheKey, servicePromise);
      return { servicePromise };
    },
    onSuccess: (data, params) => {
      if (cacheKey) {
        // 当请求成功，先取消自身的订阅，因为现在数据返回了，自己才是最新的数据的源头，不需要被通知更新
        unSubscribeRef.current?.();
        // 设置缓存，并设置当前时间供后面判断过期时间
        _setCache(cacheKey, {
          data,
          params,
          time: new Date().getTime(),
        });
        // 重新订阅，如果别的组件有新的数据返回，自己也会收到通知
        unSubscribeRef.current = cacheSubscribe.subscribe(cacheKey, (d) => {
          // 订阅的回调，就是把缓存中的新数据放到fetchInstance的data状态中
          fetchInstance.setState({ data: d });
        });
      }
    },
    onMutate: (data) => {
      if (cacheKey) {
        // 逻辑与onSuccess一样
        unSubscribeRef.current?.();
        _setCache(cacheKey, {
          data,
          params: fetchInstance.state.params,
          time: new Date().getTime(),
        });
        // resubscribe
        unSubscribeRef.current = cacheSubscribe.subscribe(cacheKey, (d) => {
          fetchInstance.setState({ data: d });
        });
      }
    },
  };
};
```

以下是cache的实现

```typescript
// 缓存本质就是一个全局的Map
const cache = new Map<CachedKey, RecordData>();

const setCache = (key: CachedKey, cacheTime: number, cachedData: CachedData) => {
  const currentCache = cache.get(key);
  // 如果之前已经有计时器了，那么要清除它开始重新计时，因为这是新的数据
  if (currentCache?.timer) {
    clearTimeout(currentCache.timer);
  }

  let timer: Timer | undefined = undefined;

  if (cacheTime > -1) {
    // 当设置了缓存时间，那么就用一个定时器，到了固定时间直接删除这个缓存
    timer = setTimeout(() => {
      cache.delete(key);
    }, cacheTime);
  }

  cache.set(key, {
    ...cachedData,
    timer,
  });
};

const getCache = (key: CachedKey) => {
  return cache.get(key);
};

// 清除缓存的方法
const clearCache = (key?: string | string[]) => {
  if (key) {
    const cacheKeys = Array.isArray(key) ? key : [key];
    cacheKeys.forEach((cacheKey) => cache.delete(cacheKey));
  } else {
    cache.clear();
  }
};
```

