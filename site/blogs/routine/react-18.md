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

一个标准的Fiber Node的实现，这里**注意**这个tag，它是用来区分当前Fiber是Root还是原生元素或是组件的标志

```javascript
export function FiberNode(tag, pendingProps, key) {
  this.tag = tag;
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
}
```

最终就会得到这样一个对象

![image-20230228161855269](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230228161855269.png)
