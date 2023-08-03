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
  // 如果是函数组件，就是hook链表的头
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
- 如果是**IndeterminateComponent**即函数组件或类组件，通过执行函数，就可以得到它的children，然后做子节点的协调

```javascript
export function beginWork(current, workInProgress) {
  switch (workInProgress.tag) {
    case IndeterminateComponent:
      return mountIndeterminateComponent(current, workInProgress, workInProgress.type);  
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

会走到这里有两种情况

- 虚拟DOM的叶子节点，它没有children了
- 节点的所有子节点都已经complete了，就会开始完成它本身

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



### completeWork

目的： 给每个节点创建/更新真实DOM节点，并且append或者insert到自己的父节点的真实DOM上，同时把各种属性都设置上去

几个函数

- bubbleProperties： 传入当前fiber节点，通过收集自己的child以及child的所有sibling，归纳出自身节点的`subtreeFlags`属性，代表自己子的副作用。不论什么类型的Fiber节点都需要调用
- createInstance： 创建元素类型（h1/div）的真实DOM节点，同时把当前Fiber和props作为两个属性**缓存**在DOM节点上，*这样做就可以随时从Fiber上找到DOM(stateNode)，也可以从DOM上立刻找到Fiber（domNode[缓存key]）*
- appendAllChildren：传入当前的真实DOM节点和Fiber，把当前Fiber的child以及child的所有sibling的`stateNode`添加到真实DOM上去。 中间有细节**注意**：child或者sibling可以是非原生元素或纯文本，即函数组件或类组件，此时就需要一直往下找，直到找到原生节点为止才算有效的child
- finalizeInitialChildren：就是把所有放在虚拟DOM上的pendingProps，赋值给这个真实DOM，比如style, className等，如果碰到children属性，同时还是字符串或者数字的话，那么就会用`node.textContent = text`来设置纯文本内容

```javascript
export function completeWork(current, workInProgress) {
  const newProps = workInProgress.pendingProps;
  switch (workInProgress.tag) {
    case HostRoot:
      bubbleProperties(workInProgress);
      break;
    //如果完成的是原生节点的话
    case HostComponent:
      ///现在只是在处理创建或者说挂载新节点的逻辑，后面此处分进行区分是初次挂载还是更新
      //创建真实的DOM节点
      const { type } = workInProgress;
      const instance = createInstance(type, newProps, workInProgress);
      //把自己所有的儿子都添加到自己的身上
      appendAllChildren(instance, workInProgress);
      workInProgress.stateNode = instance;
      finalizeInitialChildren(instance, type, newProps);
      bubbleProperties(workInProgress);
      break;
    case HostText:
      //如果完成的fiber是文本节点，那就创建真实的文本节点
      const newText = newProps;
      //创建真实的DOM节点并传入stateNode
      workInProgress.stateNode = createTextInstance(newText);
      //向上冒泡属性
      bubbleProperties(workInProgress);
      break;
  }
}
```



### commitWork

整个渲染过程主要分为两部分：

1. 协调，即上面的`workLoop`工作循环，简单讲就是把老的Fiber更新成新的Fiber，而新的Fiber上都已经准备好了要更新的真实DOM节点。因为有Fiber链表结构的存在，整个过程是可以打断的
2. commit，把上一步总结好的Fiber一次性更新到UI上，这个步骤不可打断。通过之前的分析得到，当前节点和自己的子树中有没有需要更新的操作(flags/subtreeFlags)

```javascript
function commitRoot(root) {
  const { finishedWork } = root;
  //判断子树有没有副作用
  const subtreeHasEffects =
    (finishedWork.subtreeFlags & MutationMask) !== NoFlags;
  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;
  //如果自己的副作用或者子节点有副作用就进行提交DOM操作
  if (subtreeHasEffects || rootHasEffect) {
    commitMutationEffectsOnFiber(finishedWork, root);
  }
  //等DOM变更后，就可以把让root的current指向新的fiber树
  root.current = finishedWork;
}
```

`commitMutationEffectsOnFiber`: 作用是按深度遍历的顺序，处理每个节点需要的DOM操作（插入/删除/更新）

1. 看当前节点有没有subtreeFlags，有的话开始处理child，child处理完处理剩下可能得sibling。如果没有的话就直接跳过了，说明这个节点的子都不需要更新
2. 当自己的child都处理完之后，开始处理自身，即根据自身flags把自身的DOM节点在**最近**的原生元素节点下插入更新删除（其中插入不一定是append，可能需要查找其最近的sibling来插入到它的前面）



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

### 对单节点的处理

单节点就是一个Fiber下面要创建的child对应的虚拟DOM是一个object，且不是一个数组

![img](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/dan_jie_dian_diff_1678677255463-20230726141834644.png)

#### key相同，类型相同

如果只是属性不同，会在completeWork阶段对比属性差异进行更新

**同时为了防止这个节点在上次渲染时是一个数组中的元素**，虽然节点可以复用，但这个节点是上一个渲染数组的某一个元素，所以必须把它**可能存在的后续节点都删除**，这一步在所有可复用节点的情况下都要操作，如下情况，container下面的child是个数组，同时里面有个key=B是可以复用的，所以当发现新渲染的是一个单节点时，就要把之前的A和C都删除

```javascript
return number === 0 ? (
    <ul key="container" onClick={() => setNumber(number + 1)}>
      <li key="A" id="A">A</li>
      <li key="B" id="B">
        B
      </li>
      <li key="C" id="C">C</li>
    </ul>
  ) : (
    <ul key="container" onClick={() => setNumber(number + 1)}>
      <li key="B" id="B2">
        B2
      </li>
    </ul>
  );
```



#### Key相同，类型不同

1. 删除包括当前fiber在内的已经可能存在的sibling
2. 根据新的虚拟dom节点创建一个新的Fiber，并把它的return设为原先的父节点



#### key不同

1. 把这个Fiber的父也就是它的return上加上一个`deletions`属性（数组），表示这个child需要被删除

2. 用这个要被删除的child的可能存在的sibling去对比Key，如果Key相同（**复用**），走上面两条分支，这里return

3. 根据新的虚拟dom节点创建一个新的Fiber，并把它的return设为原先的父节点

4. 在commit阶段，对每个有`deletions`的节点，进行遍历删除

   1. 这里的删除，必须从要被删除的节点向上找到最近的Host节点（非function/class组件），然后再删除
   2. 在删除前，还要再遍历下要被删除的节点下面的儿子，如果有儿子则遍历先删除儿子。这样做的目的是让**所有**被删除的组件都能走到它的**unmount**生命周期函数




### 多节点DIff

就是不论上次渲染时单节点还是数组，当前这次新的虚拟DOM是数组

- 多节点DOM DIFF 的三个规则

  - 只对同级元素进行比较，不同层级不对比
  - 不同的类型对应不同的元素（不能复用）
  - 可以通过 key 来标识同一个节点

  主要有三轮遍历可能

- 第 1 轮遍历

  - 如果 key 不同则直接结束本轮循环
  - newChildren 或 oldFiber 遍历完，结束本轮循环
  - key 相同而 type 不同，标记老的 oldFiber 为删除，继续循环
  - key 相同而 type 也相同，则可以复用老节 oldFiber 节点，继续循环

- 第 2 轮遍历

  - newChildren 遍历完而 oldFiber 还有，遍历剩下所有的 oldFiber 标记为删除，DIFF 结束
  - oldFiber 遍历完了，而 newChildren 还有，将剩下的 newChildren 标记为插入，DIFF 结束
  - newChildren 和 oldFiber 都同时遍历完成，diff 结束
  - newChildren 和 oldFiber 都没有完成，则进行`节点移动`的逻辑

- 第 3 轮遍历

  - 处理节点移动的情况

#### 节点移动

前两轮可以**总结**为

前后两个数组，从头部开始一一对比，只要key是相同的，就继续对比下一个，直到某一方没有元素了或者key对不上了

1. 如果老的先结束，那么后面就直接添加剩下的新虚拟DOM节点
2. 如果新的先结束，那么就把剩下的老Fiber都标记为删除
3. key对不上了开始移动节点逻辑

![image-20230801171324088](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230801171324088.png)

移动节点也是一个循环，从第一个对不上key的位置开始，从上图看就是从数组的第1位开始

1. 把B到F这些老的fiber，用k-v的形式添加到一个**map**中，k就是key，v就是fiber
2. 声明一个lastPlacedIndex，值为0，即最后能对上key的数组位置
3. 从C开始循环新的虚拟DOM数组，发现C和E都在这个map中能找到相同key的老fiber节点，就通过老的fiber节点创建一个新的fiber节点，然后成为A的sibling。此时lastPlacedIndex指向4，即最后一个排列好的可复用的老fiber节点在老数组中的位置
4. 循环到B，发现能找到可复用的老fiber，但是它在老数组的index是1，小于lastPlacedIndex4，这种情况就无法直接把B放在E后面（ACE可以直接放因为在DOM结构里面他们本来就是顺序的，只需要把不需要的DOM删除，就能保持这个结构），需要进行**节点移动**，此时B节点就要打上一个**Placement**的flag标志它需要移动（React中没有移动操作flag，移动就是插入，在插入时用`dom.insertBefore(child,beforeChild)`来实现DOM节点的移动）
5. 循环到G，在map中找不到老fiber，直接创建一个新的fiber并成为B的sibling
6. D同B，以上每次找到可复用的老fiber都会同时把它从map中删除，当遍历完新数组后，map中剩下的元素就是要删除的节点，这里就是F



### 从DOM-DIFF到页面更新

以上所有DOM-DIFF的操作，**最终的成果**就是把所有的更新体现在fiber链表中

- 新增的节点，fiber打上**Placement**的flag
- 删除的节点，在被删除节点的父fiber上会添加上deletions的数组，并打上**ChildDeletion**的flag
- 移动的节点，和新增一样

在completeWork阶段

- 会对新fiber的props和老fiber的memorizedProps做一个diff，如果发现有变化，就会在fiber上打上**Update**的flag。同时把需要更新的内容放在fiber的updateQueue属性上

在commitWork阶段

- 得到当前fiber，根据flag做相应操作，对真实DOM进行增删改



## 合成事件

所谓合成事件肯定是要相对于原生事件，那么它做了些什么呢？

1. 把所有事件都由root进行代理，相当于所有的event都是注册在顶部元素的
2. 整个`addEventListener`行为只会发生一次（初次挂载时），接下来所有的事件注册都不需要额外绑定事件，减少内存开销
3. 对浏览器的兼容，比如`stopPropagation`、`preventDefault`在IE中的语法是不同的，React帮助抹平了这个差异

这个过程主要分以下几步

### 初次挂载时绑定所有事件

React在初次挂载时会收集所有可能的事件类型，最终集合到一个Set中，以click为例，这个过程会在div#root上注册两个事件绑定（此时注意即便是我们的代码里没有任何click相关的事件，这个过程也必须的），分别是

- click事件的捕获
- click事件的冒泡

绑定上去的事件回调，是一个创建出来的**listenerWrap**，这个wrap函数通过bind绑定了listener回调需要的三个参数

- EventName: 事件名，如`click`
- eventSystemFlags：表示冒泡或捕获的标志
- targetContainer：即div#root

```javascript
// react-dom/src/client/ReactDOMRoot.js
export function createRoot(container) {
  const root = createContainer(container);
  listenToAllSupportedEvents(container); // 初始化时开始监听事件
  return new ReactDOMRoot(root);
}

// react-dom-bindings/src/events/DOMPluginEventSystem.js
export function listenToAllSupportedEvents(rootContainerElement) {
    ...
    // 遍历所有的原生的事件比如click,进行监听
    allNativeEvents.forEach((domEventName) => {
      listenToNativeEvent(domEventName, true, rootContainerElement); // 监听捕获
      listenToNativeEvent(domEventName, false, rootContainerElement); // 监听冒泡
    });
}

function addTrappedEventListener(
  targetContainer,
  domEventName,
  eventSystemFlags,
  isCapturePhaseListener
) {
  // 创建一个listenerWrap，随后直接做addEventListener绑定
  const listener = createEventListenerWrapperWithPriority(
    targetContainer,
    domEventName,
    eventSystemFlags
  );
  if (isCapturePhaseListener) {
    addEventCaptureListener(targetContainer, domEventName, listener); // addEventListener
  } else {
    addEventBubbleListener(targetContainer, domEventName, listener);
  }
}
```

经过初始化之后，div#root上就有关于click的两个事件监听了。

### 事件触发

当在页面触发实际点击后，就会触发上面注册的**listenerWrap**，除了上面已经绑定的三个参数，最后一个参数是事件的原生事件对象**nativeEvent**

通过这个原生事件对象，可以拿到那个真实触发事件的DOM元素，即实际点击的button/div/span，然后通过`internalInstanceKey`在DOM上得到绑定在其上的Fiber对象。**为什么要取Fiber节点**？因为我们目前能获取到的只是某个DOM元素被点击了，不论这个元素是否有绑定onClick事件，我们都要考虑这个元素的父元素一直到root是否还有绑定onClick事件，这里就可以利用`fiber.return`一路向上遍历。

这个过程可以简单概括为（这个过程会执行两遍，第一次是捕获，第二次是冒泡，这里以捕获为例）：

1. dispatchEvent：拿到原生事件对象、目标对应的Fiber
2. extractEvents：
   1. 通过事件类型，创建一个新的合成事件对象，比如click事件就是`SyntheticMouseEvent`，在创建时nativeEvent是它的一个属性，同时会按需把一些nativeEvent的属性复制到合成事件上，比如click事件的`clientX`和`clientY`
   2. 收集listener，从当前target DOM开始利用它对应的Fiber.return一路向上遍历，找到一路上有包含`onClickCapture`的节点，把这些回调都放到一个listener数组中去，此时**注意**这个数组的顺序是先是子的事件回调，然后再是一路父级的回调
3. processDispatchQueue：根据上面的listeners逐个执行
   1. 如果是捕获阶段：listeners数组从后往前执行，即从父到子的顺序
   2. 如果是冒泡阶段：listeners数组从后往前执行，即从子到父的顺序
4. 中间会覆盖原生的`stopPropagation`和`preventDefault`，模拟原生那样，如果调用就不会执行接下来的回调

```javascript
// 这个就是上面listenerWrap的实际内容
export function dispatchEvent(
  domEventName,
  eventSystemFlags,
  targetContainer,
  nativeEvent
) {
  //获取事件源，它是一个真实DOM
  const nativeEventTarget = getEventTarget(nativeEvent);
  const targetInst = getClosestInstanceFromNode(nativeEventTarget); // domNode[internalInstanceKey]
  dispatchEventForPluginEventSystem(
    domEventName, //click
    eventSystemFlags, //0 4
    nativeEvent, //原生事件
    targetInst, //此真实DOM对应的fiber
    targetContainer //目标容器
  );
}


/**
 * 把要执行回调函数添加到dispatchQueue中
 * @param {*} dispatchQueue 派发队列，里面放置我们的监听函数
 * @param {*} domEventName DOM事件名 click
 * @param {*} targetInst 目标fiber
 * @param {*} nativeEvent 原生事件
 * @param {*} nativeEventTarget 原生事件源
 * @param {*} eventSystemFlags  事件系统标题 0 表示冒泡 4表示捕获
 * @param {*} targetContainer  目标容器 div#root
 */
function extractEvents(
  dispatchQueue,
  domEventName,
  targetInst,
  nativeEvent,
  nativeEventTarget, //click => onClick
  eventSystemFlags,
  targetContainer
) {
  const reactName = topLevelEventsToReactNames.get(domEventName); //click => onClick
  let SyntheticEventCtor; //合成事件的构建函数
  switch (domEventName) {
    case "click":
      SyntheticEventCtor = SyntheticMouseEvent;
      break;
    default:
      break;
  }
  const isCapturePhase = (eventSystemFlags & IS_CAPTURE_PHASE) !== 0; //是否是捕获阶段
  const listeners = accumulateSinglePhaseListeners( // 收集链路上所有事件回调
    targetInst,
    reactName,
    nativeEvent.type,
    isCapturePhase
  );
  //如果有要执行的监听函数的话[onClickCapture,onClickCapture]=[ChildCapture,ParentCapture]
  if (listeners.length > 0) {
    const event = new SyntheticEventCtor(
      reactName,
      domEventName,
      null,
      nativeEvent,
      nativeEventTarget
    );
    dispatchQueue.push({
      event, //合成事件实例
      listeners, //监听函数数组
    });
  }
}
```

## Hooks

### useReducer

React其实维护了两套useReducer的逻辑，分别对应mount和update

当函数组件进入**beginWork**逻辑时，会调用**renderWithHooks**根据Hooks进行渲染

```javascript
// 进入beginWork
// 几个维护在全局的变量
const { ReactCurrentDispatcher } = ReactSharedInternals; // 整个React全局维护一个ReactCurrentDispatcher
let currentlyRenderingFiber = null;
/**
 * 一个hook有三个属性
 *  memoizedState: 这个hook上次保留的state值，或者初始值,
    queue: 这个hook上存在的待更新的update队列
    next: 注册在这个hook后面的下一个hook,
    同时当前Fiber的memoizedState就是指向此Fiber下的第一个hook
 */
let workInProgressHook = null; // 用来指代Hooks链表中的最后一位，用于在mount阶段组建链表
let currentHook = null;

const HooksDispatcherOnMount = {
  useReducer: mountReducer,
};
const HooksDispatcherOnUpdate = {
  useReducer: updateReducer,
};

/**
 * 渲染函数组件
 * @param {*} current 老fiber
 * @param {*} workInProgress 新fiber
 * @param {*} Component 组件定义
 * @param {*} props 组件属性
 * @returns 虚拟DOM或者说React元素
 */
function renderWithHooks(current, workInProgress, Component, props) {
  if (挂载阶段) {
    ReactCurrentDispatcher = HooksDispatcherOnMount
  } else {
    ReactCurrentDispatcher = HooksDispatcherOnUpdate
  }
  const children = Component(props); // 执行函数得到children
  return children;
}
```

比如我把组件写成这样

```javascript
function FunctionComponent() {
  const [number, setNumber] = React.useReducer(counter, 0);
  return (
    <button
      onClick={() => {
        setNumber({ type: "add", payload: 1 });
        setNumber({ type: "add", payload: 2 });
        setNumber({ type: "add", payload: 3 });
      }}
    >
      {number}
    </button>
  );
}
```

当在执行`const children = Component(props)`这句话时，里面就会调用到`React.useReducer`，而此时这个useReducer就是在此之前去赋值的，每次调用一个useXXX都会生成一个**新的**hook对象，它的数据结构是这样

```javascript
const hook = {
  memoizedState: null, 
  queue: null, 
  next: null, 
};
```

- memoizedState：hook的状态 上面例子里初始值就是0
- queue：存放**仅针对**本hook的更新队列，它的值指向所有更新(update)中的最后一个，指向最后一个的好处是，可以非常方便得得到整个列表的头尾元素
- next：指向下一个hook,一个函数里可以会有多个hook,它们会组成一个单向链表

#### mountReducer

即useReducer执行时的函数体。主要工作是新建一个hook同时把它添加到Hooks链表中，最后返回两个值，一个是hook的初始值，另一个是绑定了当前fiber和更新队列的dispatch方法。**注意**这里*reducer*参数并不会被用到，只需要用到初始值

```javascript
function mountReducer(reducer, initialArg) {
  const hook = 创建一个新的空hook并返回，同时把这个hook放在hooks链表的尾部;
  hook.memoizedState = initialArg; // 给新的hook添加初始值
  hook.queue = {
    pending: null,
  }; // 给新的hook添加一个空的更新队列
  return [hook.memoizedState, dispatchReducerAction];
}
```

#### dispatchReducerAction

即触发action的函数。目标是每一次触发都新建一个update对象，然后把它**入队**到当前**全局**的queue里面去

其中fiber和queue是在mount时就绑定的(bind方法)，运行时只会传入action

全局维护一个queue数组和一个queueIndex

如上面的例子，连续执行三次setNumber，即调用了三次dispatchReducerAction。会按照三个一组的形式存储

执行结束的结果就是

全局 `concurrentQueue = [fiber1,queue1,update1,fiber2,queue2,update2,fiber3,queue3,update3]`

其中queue是对当个hook来说是共享的，即这里的queue1,queue2,queue3是**同一个对象**(这里的fiber1/2/3也是同一个对象)，假设后面还触发了一个useState的setState，那么queue4就是不同的队列queue了

concurrentQueue的使命就是在一个渲染周期里收集所有的更新动作

```javascript
const concurrentQueue = [];
let concurrentQueuesIndex = 0;

/**
 * 执行派发动作的方法，它要更新状态，并且让界面重新更新
 * @param {*} fiber function对应的fiber
 * @param {*} queue hook对应的更新队列
 * @param {*} action 派发的动作
 */
function dispatchReducerAction(fiber, queue, action) {
  // 更新对象
  const update = {
    action, //{ type: 'add', payload: 1 } 派发的动作
    next: null, //指向下一个更新对象
  };
  //把当前的最新的更添的添加更新队列中
  enqueueConcurrentHookUpdate(fiber, queue, update);
  通知React从root开始更新
}

function enqueueConcurrentHookUpdate(fiber, queue, update) {
  concurrentQueue[concurrentQueuesIndex++] = fiber; // 函数组件对应的fiber
  concurrentQueue[concurrentQueuesIndex++] = queue; // 要更新的hook对应的更新队列
  concurrentQueue[concurrentQueuesIndex++] = update; // 更新对象
}
```

虽然执行了三次，但是最后一步通知React从root开始更新并不会迫使React更新三次，而是保证在单位时间(requestIdleCall)中只会执行一次

#### updateReducer

即在非挂载阶段执行的useReducer的函数体。

经过上面的dispatchReducerAction操作，最后会**通知React从root开始更新**。此时再次执行`React.useReducer(counter, 0)`时（此时还是beginWork阶段），就是需要把之前触发的action**累计计算出**新的state来渲染

在beginWork阶段前会**先做一步**，把刚才存储的**concurrentQueue**拿出来组建更新队列，这步会把concurrentQueue按三位一组取出，

最终结果就是把之前的空queue(`{ pending: null })`变成了`{ pending: update3 -> update1 -> update2 -> ... }`

```javascript
function updateReducer(reducer) {
  //获取新的hook
  const hook = 从老fiber的memoizedState上得到的hooks链表上取出对应位置的hook，相当于做个拷贝
  //获取新的hook的更新队列
  const queue = hook.queue;
  //获取老的hook
  const current = 同位置的老hook;
  //获取将要生效的更新队列
  const pendingQueue = queue.pending;
  //初始化一个新的状态，取值为老的状态
  let newState = current.memoizedState;
  if (pendingQueue !== null) { // 代表dispatchReducerAction被触发过，更新队列有内容
    queue.pending = null;
    const firstUpdate = pendingQueue.next; // 从第一个更新开始
    let update = firstUpdate;
    // 遍历整个更新队列，把State做一个reducer汇总
    do {
      const action = update.action;
      newState = reducer(newState, action);
      update = update.next;
    } while (update !== null && update !== firstUpdate);
  }
  hook.memoizedState = newState; // 把计算出来的新state返回给函数组件
  return [hook.memoizedState, queue.dispatch];
}
```

最后`hook.memoizedState`就是把这次渲染内所有queue上累积的update汇总后的结果。 然后把结果渲染到函数组件中

### useState

useState其实就是一个套壳的useReducer

我们在useState中内置了一个reducer，action可以接受方法或者值

```javascript
function baseStateReducer(state, action) {
  return typeof action === "function" ? action(state) : action;
}
```

#### moutState

和useReducer基本一样，主要步骤就是

1. 新建一个hook，然后从老的fiber的memoizedState中找到对应的老hook，所以React强调了hooks的顺序必须前后一致，不然新老fiber的memoizedState就找不到对应的hook了
2. 给hook加一个空的queue， 但结构和useReducer不同

```javascript
// useReducer
hook.queue = {
  pending: null,
}; 
// useState
const queue = {
  pending: null,
  dispatch: null,
  lastRenderedReducer: baseStateReducer, //上一个reducer
  lastRenderedState: initialState, //上一个state
};
```

3. 最后生成这个dispatcher

```javascript
function dispatchSetState(fiber, queue, action) {
  const update = {
    action,
    hasEagerState: false, //是否有急切的更新
    eagerState: null, //急切的更新状态
    next: null,
  };
  //当你派发动作后，我立刻用上一次的状态和上一次的reducer计算新状态
  const { lastRenderedReducer, lastRenderedState } = queue;
  const eagerState = lastRenderedReducer(lastRenderedState, action);
  update.hasEagerState = true;
  update.eagerState = eagerState;
  if (Object.is(eagerState, lastRenderedState)) {
    // 针对对象state，如果只是在原对象上改了属性，然后setState，是不会立即触发更新的，只有新对象才会立即触发更新
    return;
  }
  //下面是真正的入队更新，并调度更新逻辑
  const root = enqueueConcurrentHookUpdate(fiber, queue, update);
  scheduleUpdateOnFiber(root);
}
```

当时setState触发，会取出lastRenderedState和lastRenderedReducer，然后计算出最新的state，剩下逻辑和useReducer一样

#### updateState

直接复用updateReducer

```javascript
function updateState() {
  return updateReducer(baseStateReducer);
}
```



### useEffect

开始前先明确下useEffect和useLayoutEffect的区别，以下是网络答案

> `useEffect` 和 `useLayoutEffect` 都是 React 中的 Hook，它们的作用都是在组件渲染后执行一些副作用操作。它们的区别在于执行的时间和方式。
>
> `useEffect` 会在渲染完成后异步执行，也就是说它不会阻塞渲染过程。它的回调函数会在浏览器绘制完成后调用，因此它适用于大多数情况下。
>
> 而 `useLayoutEffect` 会在渲染后同步执行，也就是说它会阻塞渲染过程。它的回调函数会在浏览器绘制之前调用，因此它适用于需要在浏览器绘制之前同步更新 DOM 的情况。

总结一下

- useEffect是异步的，它是在渲染完成之后下一个宏任务（requestIdleCallback）才执行的
- useLayoutEffect是同步的，什么意思呢？ 比如React在commit中改变了真实DOM， `div.style.color='red'`，这句话执行了之后，**仅仅是DOM被修改了，但此时浏览器还并没有渲染**。此时我是可以通过DOM直接查询到将要渲染的结果的DOM的准确数据的，所以此时同步获取DOM是可以避免一些问题的，
  - 假设我需要获取DOM的top属性，如果是在useEffect中获取，那如果渲染的过程中发生scroll了，top值就变了，这种不确定性就可能带来计算错误。如果假设你是想要同步得更新DOM的话，就会被异步发生的DOM改变给打的措手不及
  - 另外Chrome浏览器的debugger是**不会阻塞渲染**的，即把断点打在`div.style.color='red'`这行代码之后，可以看到页面已经变化了，虽然主线程代码停止了。 这里可以使用`alert()`api来替代，当使用alert时，渲染会阻塞。用这个方法可以证明useLayoutEffect是在渲染之前执行的
  - 基于上面我们知道useLayoutEffect是在渲染前同步执行的，所以它不能做太多耗时的操作，否则就会让页面变卡





有两个Fiber新的Tag（类同前面的Placement、ChildDeletion等）

- Passive： 表示普通的Effect，即告诉调度器，在本次渲染结束后要触发一个异步的任务(requestIdleCallback)来执行useEffect里面的函数

- Layout: 等同Update



同时还引入了一个Effect Tag的概念，用来区别effect的类型和需不需要执行

- HasEffect: 有这个flag才需要执行effect，否则就不需要执行（比如前后deps一样）
- Passive：表示*会在UI绘制后执行，类似于宏任务*，用于useEffect
- Layout：表示*积极的，会在UI绘制前之前，类似于微任务*



#### mountEffect

1. 创建hook，这步和useState一样
2. 对当前fiber打上一个`Passive`的标签，表示这个fiber上有useEffect
3. 构建这个hook的memoizedState，这里和useState的结构不同，它里面主要包括
   1. tag: effect的标签（HasEffect + Passive）
   2. create: 就是useEffect里面的回调函数
   3. destroy：销毁方法，这个方法在mount时是不存在的，因为还没执行create
   4. deps：依赖数组
   5. next：当前Fiber的下一个effect



![image-20230802212836170](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230802212836170.png)

上图表示了：

- 当前fiber的memoizedState，其实就是它下面的hooks链表，里面可以包含useEffect和useState和其他各种hook
- 当存在useEffect时，fiber会被打上Passive的flag
- fiber的**updateQueue**，其实就是之前useState用来更新状态的updateQueue，里面有个新属性叫`lastEffect`，指向最后一个effect，其实就是一个effect链表
- 每个useEffect hook的memoizedState都指向上面这个effect链表中的对应的那个effect



#### commitRoot

commitRoot是一次Workloop结束后，要commit到真实DOM的步骤，这里会先判断整个Fiber链上是否有包含Passive这个flag，如果有那就通过requestIdleCallback，schedule在渲染之后执行副作用，即`flushPassiveEffect`

```javascript
function flushPassiveEffect() {
  if (rootWithPendingPassiveEffects !== null) {
    const root = rootWithPendingPassiveEffects;
    //执行卸载副作用，destroy
    
    commitPassiveUnmountEffects(root.current);
    //执行挂载副作用 create
    commitPassiveMountEffects(root, root.current);
  }
}
```

在执行副作用时，会先执行umount副作用，后执行mount副作用

但是unmount函数是通过mount（create）函数return产生的， 所以当首次执行时，`commitPassiveUnmountEffects`不会产生任何作用。

在执行`commitPassiveMountEffects`时，做了以下的步骤

1. 从根Fiber开始递归向下，找到如果就Passive的fiber就执行它的副作用，**即Effect都是先执行子，后执行父**
2. 执行副作用时，取出fiber的updateQueue中的lastEffect，通过next拿到第一个effect，然后顺序执行链表，执行create函数得到destory函数，并赋值到effect对象上，供下次使用
3. 在执行create前会判断effect的Tag是否有**HasEffect**这个tag，否则不执行。这里涉及到更新时deps的对比，如果相同就不会有这个tag。 首次渲染的话是必然会执行的

#### updateEffect

和mountEffect几乎一样，主要区别是有一个对比deps的过程，如果deps前后一样，那么就不会放**HasEffect**这个Tag，这样下次在commitRoot阶段遍历到这个effect的时候，就会跳过执行



### useLayoutEffect

mount和update逻辑和useEffect几乎没差，只是用了不同flag而已。核心区别是在执行时机

useLayoutEffect的unmout函数会在commit函数组件时执行，此时连dom都没修改完，只是这个函数组件完成了修改（一轮workloop或者卸载）

mount（create）函数会在完成commit后，**立刻执行，此时只是改变了dom，但浏览器还没渲染**





### 简单描述Hooks原理

1. Hooks是每个Fiber上的一个属性，放在memoizedState上
2. Hooks是一个链表结构，后一个hook是前一个的next属性
3. 一个hook上有三个属性
   1.  memoizedState：上次渲染后的hook状态或者是初始值
   2.  queue:  单个hook上的更新队列，比如在一个渲染周期中触发了N次setState操作，那就会放在这个queue上
   3.  next: 下一个hook或null
4. 每次页面update，都会通过老的hook来创建新的hook，所以hook在链表中的位置必须固定，不然创建出来的新hook就和老的无法对应
5. 通过触发setState或Reducer操作，会触发重新渲染，在新的一轮渲染中，会做以下几件事
   1. 把每个hook中的queue里的update整合起来，最终合并计算出一个最终的state，这就是为什么连续触发`setState(num+1)`最终结果只是加1的原因，在一次渲染计算中num始终是不变的
   2. 把上面的结果更新到hook的memoizedState上，这个结果也会作为state反馈到页面上
   3. 重置hook，即下次渲染又会从第一个hook开始做计算
