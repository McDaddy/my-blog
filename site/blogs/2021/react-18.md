---
title: React 18 新特性初探
date: 2021-07-16
tags:
 - React
categories:
 - React

---



### 如何使用

```shell
pnpm i react@alpha react-dom@alpha
```

### 启动模式

- `legacy`模式`ReactDOM.render`会同步渲染
- `createRoot`会启用`concurrent mode`并发模式

```javascript
// legacy mode
ReactDOM.render(<App />, document.getElementById('root'));

// CM
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
```
<!-- more -->
### 批量更新

React 18 以前，在React合成事件管理中的`setState`是根据`isBatchUpdate`这个标志来决定是否批量更新的，当合成事件执行完毕，`isBatchUpdate`就会被设回`false`，所以在`setTimeout`中的setState都是同步的，不会发生批量更新。所以下来的代码在同步模式下的结果是`[0, 0, 2, 3]`

![image-20210714172732804](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210714172732804.png)

在开启了CM模式之后，即使脱离了合成事件，setState依然是批量的，所以结果就是`[0, 0, 1, 1]`

### Suspense

- Suspense 让你的组件在渲染之前进行`等待`，并在等待时显示`fallback`的内容
- Suspense内的组件子树比组件树的其他部分拥有更低的优先级，不会影响其他部分的渲染逻辑
- 可以配合Lazy实现`code-split`

### Suspense原理

#### 思考如何做到数据同步加载结合组件loading?

```javascript
function createResource(promise: Promise<any>) {
  let status = "pending"; //等待中,未知态
  let result: any;
  return {
    read() {
      if (status === "success" || status === "error") {
        return result;
      } else {
        throw promise.then(
          (data: any) => {
            status = "success";
            result = data;
          },
          (error: any) => {
            status = "error";
            result = error;
          }
        );
      }
    },
  };
}

// fake api which return promise
function fetchUser(id: number) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve({ success: true, data: { id: 1, name: "名字" + id } });
      //   reject({ success: false, error: "数据加载失败" });
    }, 1000);
  });
}
// create api resource
const userResource = createResource(fetchUser(1));

// component
function User() {
  console.log("into user render");
  let result: any = userResource.read();
  console.log("result", result);
  if (result.success) {
    let user = result.data;
    return (
      <div>
        {user.id} {user.name}
      </div>
    );
  } else {
    throw result.error;
  }
}

export default class extends React.Component {
  componentDidMount() {
    console.log("mounted");
  }

  render() {
    return (
      <ErrorBoundary fallback={<div>出错啦......</div>}>
        <Suspense fallback={<div>加载中....</div>}>
          <User />
        </Suspense>
      </ErrorBoundary>
    );
  }
}
```



#### Suspense的简单实现

```javascript
import React from "react";
interface Props {
  fallback: React.ReactNode;
}
export default class extends React.Component<Props> {
  state = { loading: false };
  componentDidCatch(error: any) {
    if (typeof error.then === "function") { // check if it's a promise
      this.setState({ loading: true });
      error.then(() => {
        this.setState({ loading: false });
      });
    }
  }

  render() {
    const { children, fallback } = this.props;
    const { loading } = this.state;
    return loading ? fallback : children;
  }
}
```



### SuspenseList

可以用来编排向用户显示这些组件的顺序，直白说就是控制一群`suspense`组件显示到用户眼前的顺序，场景主要是一些有先后逻辑顺序的组件，虽然部分组件加载速度更快，但依然要根据预设的顺序来， 个人认为这个功能目前比较鸡肋，如果能自定义order才比较完美

![Kapture 2021-07-16 at 11.40.03](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/Kapture 2021-07-16 at 11.40.03.gif)

有两个参数

- revealOrder (forwards, backwards, together) 定义了 SuspenseList 子组件应该显示的顺序
  - together 在所有的子组件都准备好了的时候显示它们，而不是一个接着一个显示
  - forwards 从前往后显示
  - backwards 从后往前显示
- tail (collapsed, hidden) 指定如何显示 SuspenseList 中未加载的项目
  - 默认情况下，SuspenseList 将显示列表中的所有 fallback
  - collapsed 仅显示列表中下一个 fallback
  - hidden 未加载的项目不显示任何信息

### startTransition

- [startTransition](https://zh-hans.reactjs.org/docs/concurrent-mode-reference.html)
- startTransition 接受一个回调的函数。这个回调里面如果包含setState操作就会告诉 React 这个更新是低优先级的
- 场景：允许组件将可能阻塞用户输入等高优先级事件的状态更新推迟到随后渲染，以便能够立即渲染更重要的更新

### useDeferredValue

- 返回一个会延迟响应的值
- 在`useDeferredValue`的内部会调用useState并触发一次更新,但此更新的优先级很低
- 场景：我们需要自己做debounce的地方

### useTransition

- 可以理解为`startTransition`的增强
- `useTransition`允许组件在切换到下一个界面之前等待内容加载，从而避免不必要的加载状态
- 它还允许组件将速度较慢的数据获取更新推迟到随后渲染，以便能够立即渲染更重要的更新
- `useTransition` hook 返回两个值的数组 `const [isPending, startTransition] = useTransition();`
  - startTransition 是一个接受回调的函数。我们用它来告诉 React 需要推迟的 state
  - isPending 是一个布尔值。这是 React 通知我们是否正在等待过渡的完成的方式
- 如果某个 state 更新导致组件阻塞，则该 state 更新应包装在 transition 中

### 流式SSR

解决原有SSR的缺陷：

- 如果接口太慢，SSR还不如CSR
- 重型组件能够code-split与异步加载
- 本质区别 `res.send` 改成了 `res.socket`

```javascript
  // This is how you would wire it up previously:
  //
  // res.send(
  //   '<!DOCTYPE html>' +
  //   renderToString(
  //     <DataProvider data={data}>
  //       <App assets={assets} />
  //     </DataProvider>,
  //   )
  // );  

const {startWriting, abort} = pipeToNodeWritable(
    <DataProvider data={data}>
      <App assets={assets} />
    </DataProvider>,
    res,
    {
      onReadyToStream() {
        // If something errored before we started streaming, we set the error code appropriately.
        res.statusCode = didError ? 500 : 200;
        res.setHeader('Content-type', 'text/html');
        res.write('<!DOCTYPE html>');
        startWriting();
      },
      onError(x) {
        didError = true;
        console.error(x);
      },
    }
  );
  // Abandon and switch to client rendering if enough time passes.
  // Try lowering this to see the client recover.
  setTimeout(abort, ABORT_DELAY);
```

