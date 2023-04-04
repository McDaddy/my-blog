## 从JSX到js数据结构

Jsx看起来是HTML，但是在经过编译器的转化后，在浏览器中运行时其实是一段js代码。而这个过程一般都是通过编译工具的插件完成的，比如babel，vite的react插件等

以下就是通过babel转换source code的示例

```javascript
const babel = require('@babel/core');
const sourceCode = `
<h1>
  hello<span style={{ color: 'red' }}>world</span>
</h1>
`;

process.env.NODE_ENV = 'development';
const result = babel.transform(sourceCode, {
  plugins: [
    ["@babel/plugin-transform-react-jsx-development", { runtime: 'automatic' }]
  ]
});
console.log(result.code);
// var _jsxFileName = "";
// import { jsxDEV as _jsxDEV } from "react/jsx-dev-runtime";
// /*#__PURE__*/_jsxDEV("h1", {
//   children: ["hello", /*#__PURE__*/_jsxDEV("span", {
//     style: {
//       color: 'red'
//     },
//     children: "world"
//   }, void 0, false, {
//     fileName: _jsxFileName,
//     lineNumber: 3,
//     columnNumber: 8
//   }, this)]
// }, void 0, true, {
//   fileName: _jsxFileName,
//   lineNumber: 2,
//   columnNumber: 1
// }, this);
```

这里我们用了`@babel/plugin-transform-react-jsx-development`这个babel插件，专门用转换在development模式下的jsx，注意这里的runtime需要改成**automatic**否则默认是**classic**，如果用classic就会变成旧版的`React.createElement`的形式

结果转义的代码主要有以下作用

1. 从`react/jsx-dev-runtime`引入了一个叫**jsxDEV**的方法，如果是非dev模式下，会从`react/jsx-runtime`来引入`jsxRuntime`
2. 用jsxDEV这个方法包裹住一个数据结构对象，这里就是被解析后的jsx的数据结构表示
3. **注意**，在这里的children里还会包jsxDEV，也就是说所有的tag转义后最终都会被jsxDEV所包裹。但是当仅仅是个纯字符串的时候这个包裹会省略（这也是一种优化）

那么上面这段代码要在ESM的环境中运行，就必须安装react的模块了



## 构建虚拟DOM

如果我们把入口文件`main.jsx`改成如下内容

```react
let element = (
  <h1>
    hello1<span style={{ color: "red" }}>world</span>
  </h1>
);
console.log(element);
```

通过上面的内容，我们已经知道它会转变成的真实运行时代码，所以我们需要去实现`react/jsx-dev-runtime`这个模块

重点看下面的**jsxDEV**

- 它的第一个参数是这个元素的类型，这里是h1
- 第二个参数它的配置，可以理解为props，里面包含了children，key等受保护字段
- 最后返回一个**ReactElement**，就是我们所说的虚拟DOM
- **$$typeof**是一个特殊的字段，用来标识React虚拟DOM的类型

```javascript
import hasOwnProperty from "shared/hasOwnProperty";
import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols";

const RESERVED_PROPS = {
  key: true,
  ref: true,
  __self: true,
  __source: true,
};
function hasValidKey(config) {
  return config.key !== undefined;
}
function hasValidRef(config) {
  return config.ref !== undefined;
}
function ReactElement(type, key, ref, props) {
  return {
    //这就是React元素，也被称为虚拟DOM
    $$typeof: REACT_ELEMENT_TYPE,
    type, //h1 span
    key, //唯一标识
    ref, //后面再讲，是用来获取真实DOM元素
    props, //属性 children,style,id
  };
}
export function jsxDEV(type, config) {
  let propName; //属性名
  const props = {}; //属性对象
  let key = null; //每个虚拟DOM可以有一个可选的key属性，用来区分一个父节点下的不同子节点
  let ref = null; //引用，后面可以通过这实现获取真实DOM的需求
  if (hasValidKey(config)) {
    key = config.key;
  }
  if (hasValidRef(config)) {
    ref = config.ref;
  }
  for (propName in config) {
    if (
      hasOwnProperty.call(config, propName) &&
      !RESERVED_PROPS.hasOwnProperty(propName) // 过滤掉被保护的字段
    ) {
      props[propName] = config[propName];
    }
  }
  return ReactElement(type, key, ref, props);
}
```

上面代码最终结果如图

![image-20230228160003942](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230228160003942.png)

## 创建 ReactDOMRoot

这步对应React18中的创建根节点语法，`const root = createRoot(document.getElementById("root"));`

接下来开始构建这个React的Root，ReactDOMRoot主要包括以下几部分

- FiberRootNode：
  - 包含一个containerInfo，其实就是根的真实DOM（div#root），
  - 有个current属性，指向HostRootFiber
- HostRootFiber：
  - 是一个特殊Fiber节点，
  - 有一个stateNode属性，指向FiberRootNode，所以这是一个类型循环链表的结构

![img](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/FiberRootNode_1664074436254.jpg)

```javascript
import { createHostRootFiber } from './ReactFiber';
import { initialUpdateQueue } from './ReactFiberClassUpdateQueue';
function FiberRootNode(containerInfo) {
  this.containerInfo = containerInfo;//div#root
}

export function createFiberRoot(containerInfo) {
  const root = new FiberRootNode(containerInfo);
  //HostRoot指的就是根节点div#root
  const uninitializedFiber = createHostRootFiber();
  //根容器的current指向当前的根fiber
  root.current = uninitializedFiber;
  //根fiber的stateNode,也就是真实DOM节点指向FiberRootNode
  uninitializedFiber.stateNode = root;
  initialUpdateQueue(uninitializedFiber);
  return root;
}
```

一个标准的**Fiber Node**的实现，这里**注意**这个tag，它是用来区分当前Fiber是Root还是原生元素或是组件的标志

```javascript
export function FiberNode(tag, pendingProps, key) {
  this.tag = tag; // Fiber类型 对应容器根节点/原生节点/纯文本节点/类组件/函数组件等
  this.key = key;
  this.type = null; //fiber类型，来自于 虚拟DOM节点的type  span div p
  //每个虚拟DOM=>Fiber节点=>真实DOM
  this.stateNode = null; //此fiber对应的真实DOM节点  h1=>真实的h1DOM

  this.return = null; //指向父节点
  this.child = null; //指向第一个子节点
  this.sibling = null; //指向弟弟

  //fiber哪来的？通过虚拟DOM节点创建，虚拟DOM会提供pendingProps用来创建fiber节点的属性
  this.pendingProps = pendingProps; //等待生效的属性
  this.memoizedProps = null; //已经生效的属性

  //每个fiber还会有自己的状态，每一种fiber 状态存的类型是不一样的
  //类组件对应的fiber 存的就是类的实例的状态,HostRoot存的就是要渲染的元素
  this.memoizedState = null;
  //每个fiber身上可能还有更新队列
  this.updateQueue = null;
  //副作用的标识，表示要针对此fiber节点进行何种操作
  this.flags = NoFlags; //自己的副作用
  //子节点对应的副使用标识
  this.subtreeFlags = NoFlags;
  //替身，轮替 在后面在DOM-DIFF的时候会用到
  this.alternate = null;
  // 用在数组中
  this.index = 0;
}
```

最终就会得到这样一个对象

![image-20230228161855269](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230228161855269.png)



## 更新Root（初次渲染）

这步对应React18 渲染root的方法 `root.render(element);`

主要有以下这些步骤

1. 创建一个update对象，里面包含一个payload就是传入的element，即表示接下来要去更新渲染这个element
2. **HostFiberRoot**（本身就是个Fiber）上有个updateQueue属性，把上面的update添加到这个queue上面去，这个queue是一个单向循环链表
3. 开始渲染，第一次渲染必然是同步渲染
4. 根据当前的**HostFiberRoot**创建一个新的Fiber节点，新的节点基本和老的节点一样，其中**alternate**属性新老节点互相指向对方，这是为了最后渲染时做轮替用的，即双缓存结构，使页面一次性切换不卡顿
5. 开始**工作循环**



## 工作循环

即`workLoopSync`方法，可以说是Fiber架构的核心方法之一

以下是Fiber链表结构

![image-20230404151546797](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230404151546797.png)

以下是遍历Fiber树的顺序，总结就是有儿子处理儿子，没儿子处理弟弟，否则处理父(叔)

现在的绿线是beginWork的路线，红线是compeleteWork的路线

每个节点都会被有且仅有一次的begin和compelete

![image-20230404151642998](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230404151642998.png)



全局定义一个**workInProgress**，也是一个Fiber，表示当前正在处理的Fiber节点

把当前的workInProgress传入工作单元函数执行，直到workInProgress为空为止

```javascript
let workInProgress = null;

function workLoopSync() {
  while (workInProgress !== null) { // 只要workInProgress不为null，就要执行工作单元
    performUnitOfWork(workInProgress);
  }
}
```

### performUnitOfWork

处理每一个Fiber节点，目标是递归得把每个Fiber的结果 // TODO

**unitOfWork**：即新的刚创建Fiber节点，它的alternate就是当前已经存在的Fiber节点（如果是新插入的元素那也可能不存在）

**beginWork**： 根据新旧节点，得到当前节点的child和memoizedProps（对updateQueue的消化）

经过beginWork之后

- 如果发现下面还有子节点，那么把这个子节点继续赋值给workInProgress，然后开始下一个`performUnitOfWork`循环
- 如果没有子节点，表示当前Fiber已经处理完成进入`completeUnitOfWork`逻辑

如果

```javascript
function performUnitOfWork(unitOfWork) {
  //获取新的fiber对应的老fiber
  const current = unitOfWork.alternate;
  //完成当前fiber的子fiber链表构建后
  const next = beginWork(current, unitOfWork);
  unitOfWork.memoizedProps = unitOfWork.pendingProps;
  if (next === null) {
    //如果没有子节点表示当前的fiber已经完成了
    completeUnitOfWork(unitOfWork);
  } else {
    //如果有子节点，就让子节点成为下一个工作单元
    workInProgress = next;
  }
}
```

### beginWork

目标是根据新虚拟DOM构建新的fiber子链表 child/return

beginWork的**最终返回**是当前节点经过处理后得到的可能得儿子，即实现了`unitOfWork.child = xxx`，这个xxx必然是一个Fiber或者null

这里通过不同的tag类型，有不同的处理逻辑，但最终都要协调子节点

- 如果是**HostRoot**
  - 把当前Fiber上的updateQueue中pending的update整合起来，其实就是做了个merge，形成一个最终的状态放在memoizedState上
  - 取出上面state中的element做为child来做协调，即DOM-DIFF
  - 最后返回child给外层的`performUnitOfWork`，来处理它的子元素
- 如果是**HostComponent** 即原生元素
  - 查看pendingProps中的children是不是纯文本，如果是的话就没有再下层的儿子了
  - 有儿子的话，做DOM-DIFF

```javascript
export function beginWork(current, workInProgress) {
  switch (workInProgress.tag) {
    case HostRoot:
      return updateHostRoot(current, workInProgress);
    case HostComponent:
      return updateHostComponent(current, workInProgress);
    case HostText:
      return null;
    default:
      return null;
  }
}

function updateHostRoot(current, workInProgress) {
  //需要知道它的子虚拟DOM，知道它的儿子的虚拟DOM信息
  processUpdateQueue(workInProgress); // 最终目的是把update的payload信息放到memoizedState中，即 workInProgress.memoizedState={ element }
  const nextState = workInProgress.memoizedState;
  const nextChildren = nextState.element;
  //协调子节点 DOM-DIFF算法
  reconcileChildren(current, workInProgress, nextChildren);
  return workInProgress.child; //{tag:5,type:'h1'}
}

function updateHostComponent(current, workInProgress) {
  const { type } = workInProgress;
  const nextProps = workInProgress.pendingProps;
  let nextChildren = nextProps.children;
  //判断当前虚拟DOM它的儿子是不是一个文本独生子
  const isDirectTextChild = shouldSetTextContent(type, nextProps);
  if (isDirectTextChild) {
    nextChildren = null;
  }
  reconcileChildren(current, workInProgress, nextChildren);
  return workInProgress.child;
}
```



**协调子节点**

分两种情况，reconcileChildFibers和mountChildFibers逻辑其实是一样的，只是是否跟踪副作用的区别

1. 有老Fiber，比如RootNodeFiber必然存在，或者更新节点，意味着老fiber里面可能就有旧的儿子们了，所以要做一次**DOM-DIFF**
2. 无老Fiber，那么意味着这些传进来的`nextChildren`都是新挂载的

```javascript
function reconcileChildren(current, workInProgress, nextChildren) {
  //如果此新fiber没有老fiber,说明此新fiber是新创建的
  //如果此fiber没能对应的老fiber,说明此fiber是新创建的，如果这个父fiber是新的创建的，它的儿子们也肯定都是新创建的
  if (current === null) {
    workInProgress.child = mountChildFibers(workInProgress, null, nextChildren);
  } else {
    //如果说有老Fiber的话，做DOM-DIFF 拿老的子fiber链表和新的子虚拟DOM进行比较 ，进行最小化的更新
    workInProgress.child = reconcileChildFibers(
      workInProgress,
      current.child, // 老fiber下面的老child
      nextChildren   // 新child
    );
  }
}
```



### completeUnitOfWork

1. 维护局部变量`completedWork`
2. `completeWork`：创建真实节点
3. 查看当前completedWork是否有兄弟节点sibling
   1. 如果有，则把sibling赋给workInProgress，跳出循环重新进入`performUnitOfWork`开始处理sibling
   2. 如果没有，此时说明当前节点既没有儿子也没有兄弟了，即是父Fiber的最后一个节点。 把returnFiber赋给completedWork，开始complete父节点

```javascript
function completeUnitOfWork(unitOfWork) {
  let completedWork = unitOfWork;
  do {
    const current = completedWork.alternate;
    const returnFiber = completedWork.return;
    //执行此fiber 的完成工作,如果是原生组件的话就是创建真实的DOM节点
    completeWork(current, completedWork);
    //如果有弟弟，就构建弟弟对应的fiber子链表
    const siblingFiber = completedWork.sibling;
    if (siblingFiber !== null) {
      workInProgress = siblingFiber;
      return;
    }
    //如果没有弟弟，说明这当前完成的就是父fiber的最后一个节点
    //也就是说一个父fiber,所有的子fiber全部完成了
    completedWork = returnFiber;
    workInProgress = completedWork;
  } while (completedWork !== null);
}
```





## DOM-DIFF

DOM-DIFF是beginWork中的一步，用来协调当前Fiber的子节点的更新状态

1. 如果新儿子是个对象，且不是数组，即singleElement
   1. 调用`reconcileSingleElement`方法，最终根据传入的child，返回一个新的Fiber。TODO
   2. 把上一步得到的新child Fiber传入`placeSingleChild`，本质就是打标，即**flags**属性，确定这个Fiber是要插入还是更新之类的操作
   3. 这里的**shouldTrackSideEffects**表示：是否需要去跟踪副作用，简单理解就是当前这个newFiber的*父亲是不是本身就存在*
      1. True -> `reconcileChildFibers`， 比如挂载根节点下第一个元素时，RootNodeFiber是存在的，所以走的是reconcileChildFibers，需要单独去跟踪这个Fiber的插入/更新/删除副作用
      2. False -> `mountChildFibers`，比如初次挂载时，除了最顶层节点外，里面的所有元素要挂载时，return(parent)其实也是刚刚创建的，它的*alternate*(老的Fiber节点)其实是不存在的。所以走的是mountChildFibers，即最终的挂载是跟随向上追溯第一个shouldTrackSideEffects为true的节点一起，而不需要单独去处理它的副作用了

```javascript
function reconcileChildFibers(returnFiber, currentFirstFiber, newChild) {
  if (typeof newChild === "object" && newChild !== null) {
    switch (newChild.$$typeof) {
      case REACT_ELEMENT_TYPE:
        return placeSingleChild(reconcileSingleElement(returnFiber, currentFirstFiber, newChild));
      default:
        break;
    }
  }
  //newChild [hello文本节点,span虚拟DOM元素]
  if (isArray(newChild)) {
    return reconcileChildrenArray(returnFiber, currentFirstFiber, newChild);
  }
  return null;
}

function reconcileSingleElement(returnFiber, currentFirstFiber, element) {
  //因为我们现实的初次挂载，老节点currentFirstFiber肯定是没有的，所以可以直接根据虚拟DOM创建新的Fiber节点
  const created = createFiberFromElement(element);
  created.return = returnFiber;
  return created;
}

function placeSingleChild(newFiber) {
  //说明要添加副作用
  if (shouldTrackSideEffects) {
    //要在最后的提交阶段插入此节点  React渲染分成渲染(创建Fiber树)和提交(更新真实DOM)二个阶段
    newFiber.flags |= Placement;
  }
  return newFiber;
}
```

2. 如果newChild是数组，// 目前还没有DIFF TODO
   1. 把数组中的每一个元素从虚拟DOM转成Fiber节点
   2. 把这个数组一字排开，组成一个链表，后一个是前一个的**sibling**，最终返回第一个节点，这样*workInProgress*得到的child就不会是一个数组，而是一个**链表**

```javascript
function reconcileChildrenArray(returnFiber, currentFirstFiber, newChildren) {
  let resultingFirstChild = null; //返回的第一个新儿子
  let previousNewFiber = null; //上一个的一个新的fiber
  let newIdx = 0;
  for (; newIdx < newChildren.length; newIdx++) {
    const newFiber = createChild(returnFiber, newChildren[newIdx]);
    if (newFiber === null) continue;
    placeChild(newFiber, newIdx);
    //如果previousNewFiber为null，说明这是第一个fiber
    if (previousNewFiber === null) {
      resultingFirstChild = newFiber; //这个newFiber就是大儿子
    } else {
      //否则说明不是大儿子，就把这个newFiber添加上一个子节点后面
      previousNewFiber.sibling = newFiber;
    }
    //让newFiber成为最后一个或者说上一个子fiber
    previousNewFiber = newFiber;
  }
  return resultingFirstChild;
}
```

