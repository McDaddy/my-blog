# Formily解析

Formily从架构上看主要分为以下几层

1. 表单内核，这里实现了响应式，领域模型等，是脱离前端框架的实现

   1. Models：如`Form/Field`等领域模型，可以想象一下一个Form它是怎样的数据结构，有哪些实例方法、静态方法，这些都是在这里定义
   2. Path System: 路径系统，用于在表单中寻址
   3. Lifecycle: 生命周期，实现表单和字段的全生命周期，暴露出各种钩子，用于自定义操作和联动
   4. Validator: 校验器，实现表单的校验功能
   5. Shared：共享的工具与方法
   6. Reactive：实现响应式，是整个Formily的核心

2. UI桥接层

   这是一个胶水层，用于桥接内核与具体的UI框架，以React为例

   1. 它提供一个`Context`可以把form模型实例这个传递给下面的所有子组件
   2. 提供一个`Field`组件，在这个组件中拿到form实例，同时调用`createField`方法来创建字段，同时需要在组件中渲染`Decorator`与`Component`

3. 拓展组件库

   在组件库层的实现。以`Antd`为例，会通过`react-reactive`这个桥接层，对原有的组件做各种增强，其中包括一些Array字段组件

![img](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/formily_1659867545884.svg)

## reactive

### 如何实现响应式

这里与`mobx`的原理是基本一致的，主要思想就是利用`Proxy`来劫持数据对象，当数据变化后会通知`订阅者`，执行此前注册的`reaction`

![img](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/reaction_1659865173726.png)



### 劫持的具体实现

对一个对象做整体劫持，从而实现一个`observable`的对象

- 全局存放三个`weakmap`，正好是个双向的关系，作为缓存，当代理对象或者原始对象中任何一个被销毁就会从map中自动移除

```javascript
// 普通对象=>代理对象
export const RawProxy = new WeakMap();
// 代理对象=>普通对象
export const ProxyRaw = new WeakMap();
// 普通对象=>浅代理对象
export const RawShallowProxy = new WeakMap();
```

- 创建可被订阅对象的方法

```javascript
/**
*	当调用createObservable方法时，实际想要代理的是value这个参数
*	target是当前要被代理对象的父对象
*/
export const createObservable = (target, key, value, shallow) => {
  // 如果value不是对象，直接返回，原始类型不需要代理
  if (typeof value !== 'object') {
    return value;
  }
  // 看这个value是不是一个已经存在的代理对象
  const raw = ProxyRaw.get(value);
  // 如果能找到对应的原生对象，说明此原生对象已经创建过代理对象了
  if (raw) {
    return value; // 说明它本身就是一个代理对象，可以直接返回
  }
  // 当最开始劫持的时候target肯定为空，因为value本事就是最顶层的对象
  // 而当劫持对象里面的属性时，target就是当前属性的父级
  if (target) {
    const parentRaw = ProxyRaw.get(target) || target;
    // 获取此父原生对象的浅劫持代理对象
    const isShallowParent = RawShallowProxy.get(parentRaw);
    // 如果父亲的代理对象是一个浅劫持的话，说明代理父就够了，子属性都不需要继续代理了
    // 所以直接返回原始value
    if (isShallowParent) {
      return value;
    }
    // 否则的话，说明父要么不存在，要么就是一个深代理对象，
    // 而父是深代理对象就需要继续代理当前属性
  }
  // 区分是浅代理还是深代理
  if (shallow) {
    return createShallowProxy(value);
  }
  if (isNormalType(value)) {
    return createNormalProxy(value);
  }
  return value;
};
```

- 深代理和浅代理的实现
  - **关键技术点**：*延迟代理*，在这里其实只是做了一个最外层的代理（不同于mobx），如`obj = { name: { first: '张三' } }`进行代理，此时只是一个obj层的代理，而name这个属性，只有当访问它时才会真正开始代理。这样可以极大得**提升性能**，当对象属性很多或者嵌套很深

```javascript
// 浅代理和深代理公用一个函数
const createShallowProxy = target => {
  if (isNormalType(target)) {
    return createNormalProxy(target, true);
  }
};

const createNormalProxy = (target, shallow) => {
  // 创建仅target层的代理
  const proxy = new Proxy(target, baseHandler);
  ProxyRaw.set(proxy, target);
  if (shallow) {
    RawShallowProxy.set(target, proxy);
  } else {
    RawProxy.set(target, proxy);
  }
  return proxy;
};

export const baseHandler = {
  get(target, key) {
    const result = target[key]; // Reflect.get(target,key);
    // 当read了代理对象中的key属性时，开始绑定当前的reaction
    bindTargetKeyWithCurrentReaction({ target, key });
    // 如果此原生对象已经创建过代理对象了，直接返回
    const observableResult = RawProxy.get(result);
    if (observableResult) {
      return observableResult;
    }
    // 如果这个结果不是一个可观察对象，就返回它对应的可观察对象
    if (!isObservable(result)) {
      // 当read操作时才创建代理，即延迟代理
      return createObservable(target, key, result);
    }
    return result;
  },
  set(target, key, value) {
    // 如果修改的属性是一个对象，那就需要重新创建一个可订阅对象
    // 比如 values.a = { x: 1 }
    // 而当 values.a = 1 这种变化时，1会被直接返回， 因为原始类型不需要代理
    const newValue = createObservable(target, key, value);
    target[key] = newValue;
    // 将绑定在当前key上的reaction都跑一遍
    runReactionsFromTargetKey({ target, key });
    return true;
  },
};
```

- 注册reaction，即将订阅者的回调注册给这个属性

```javascript
// 全局还需要维护一个普通对象与Reactions的映射关系
export const RawReactionsMap = new WeakMap();

/**
 * 把某个对象的某个key和当前的reaction进行绑定，从行为一定发生在属性的get中
 * @param {*} operation {target,key}
 */
export const bindTargetKeyWithCurrentReaction = operation => {
  const { target, key } = operation;
  // 最后一个Reaction就是currentReaction
  const currentReaction = ReactionStack[ReactionStack.length - 1];
  if (currentReaction) {
    addRawReactionsMap(target, key, currentReaction);
  }
};

const addRawReactionsMap = (target, key, reaction) => {
  // 判断此target对象在RawReactionsMap里有没有值
  const reactionsMap = RawReactionsMap.get(target);
  if (reactionsMap) {
    // 有则添加
    const reactionSet = reactionsMap.get(key);
    if (reactionSet) {
      reactionSet.add(reaction);
    } else {
      let reactionSet = new Set();
      reactionSet.add(reaction);
      reactionsMap.set(key, reactionSet);
    }
    return reactionsMap;
  } else {
    // 无则创建
    // ArraySet 元素唯1的数组
    let reactionSet = new Set(); // 源码里作者自己封装了一个ArraySet
    reactionSet.add(reaction);
    const reactionsMap = new Map([[key, reactionSet]]);
    RawReactionsMap.set(target, reactionsMap);
    return reactionsMap;
  }
};
```

- 当修改被订阅的属性时，触发所有的reaction

```javascript
export const runReactionsFromTargetKey = ({ target, key }) => {
  runReactions(target, key);
};

function runReactions(target, key) {
  // 从上面的RawReactionsMap中拿到key的所有reaction
  const reactions = getReactionsFromTargetKey(target, key);
  // 如果有的话，就挨个执行
  for (let reaction of reactions) {
    if (isFn(reaction.scheduler)) {
      reaction.scheduler(); // Tracker.track方法的scheduler属性是一个函数
    } else {
      reaction(); // autorun的reaction是一个函数
    }
  }
}

const getReactionsFromTargetKey = (target, key) => {
  const reactionsMap = RawReactionsMap.get(target);
  if (reactionsMap) {
    return reactionsMap.get(key);
  } else {
    return new Set();
  }
};
```



到了这里，整个劫持的流程就基本完成了。 下面的问题是上文的`ReactionStack`是做什么的，什么时候才能往里面添加reaction?

这里就要说到对象成为可被订阅对象之后，如何去订阅它，这里有两种方式

### autorun

下面的例子，obs成为`observable`对象后，把它放在autorun包裹的函数中，它就自动被订阅了，下面的代码log会执行两次，第一次是初始化时，第二次是aa被修改时

```javascript
import { observable, autorun } from '@formily/reactive'

const obs = observable({})

autorun(() => {
  console.log(obs.aa)
})

obs.aa = 123
```

实现autorun，首先要在全局维护一个`ReactionStack`

```javascript
export const ReactionStack = [];
```

```javascript
export function autorun(tracker) {
  // reaction本质上是一个函数，当它观察到的对象和属性发生变化，此函数会重新执行
  const reaction = () => {
    ReactionStack.push(reaction); // reaction 入栈
    tracker(); // 执行tracker函数是，会read对象的key，此时就会执行reaction的绑定，此时是tracker的第一次执行
    ReactionStack.pop(); // reaction 出栈
  };
  reaction();
}
```

为什么要是一个栈，比如下面的例子。`currentReaction`永远是栈顶的reaction

```javascript
autorun(() => {
  // 开始执行时，外层reaction先入栈
  autorun(() => {
  	console.log(obs.bb) // 此时外层的reaction还在，内层的reaction入栈，此时的currentReaction就是内层的
  })
  console.log(obs.aa) // 执行read .aa 时候上面的reaction已经出栈，此时的currentReaction就是外层的
})
```

### Tracker

直译就是追踪器，它是用在组件追踪上

实现基本和上面一致。tracker与autorun的区别

1. 传给autorun的函数本身就是一个reaction，每次触发就是重新执行一遍这个函数
2. tracker第一次执行其实就是执行view的渲染（加载），之后每次触发要执行的其实就是`scheduler`这个函数

```javascript
export class Tracker {
  constructor(scheduler) {
    this.track.scheduler = scheduler;
  }
  track = view => {
    ReactionStack.push(this.track);
    const result = view();
    ReactionStack.pop();
    return result;
  };
}
```



### annotation

直译就是注解，可以理解为js的装饰器，本质就是给当前的对象增加某种能力，这里以`observable.shallow`为例，被这个装饰了的对象属性就已经被浅劫持了。但对象还是原先的对象

```javascript
// 虽然看起来实现和劫持的baseHandler差不多，但这里传入的对象并不会变成一个proxy，
// 而是通过Object.defineProperty做了一层劫持，对象还是原始的对象
// 但是当发起get时，得到的属性值已经是一个observable对象了
export const shallow = createAnnotation(({ target, key }) => {
  // 先把target对象的key属性变成可观察对象并存在store.value属性上
  // 这里相当于就是个闭包
  const store = {
    value: createObservable(target, key, target[key], true),
  };
  function get() {
    bindTargetKeyWithCurrentReaction({ target, key });
    return store.value;
  }
  function set(value) {
    value = createObservable(target, key, value, true);
    store.value = value;
    runReactionsFromTargetKey({ target, key });
  }
  Object.defineProperty(target, key, {
    get,
    set,
    enumerable: true,
    configurable: false,
  });
  return store.value;
});

// 作用就是在返回的函数上添加一个全局统一的Symbol属性，然后把具体实现的函数赋值给它
export const createAnnotation = maker => {
  const annotation = () => {};
  if (isFn(maker)) {
    annotation[MakeObservableSymbol] = maker;
  }
  return annotation;
};

```



### define

手动定义领域模型，可以指定具体属性的响应式行为

```javascript
export function define(target, annotations) {
  if (isObservable(target)) {
    return target;
  }
  for (const key in annotations) {
    const annotation = annotations[key]; // 如 annotation.observable
    // 如果annotation是一个合法的注解的话才会进入
    if (isAnnotation(annotation)) {
      const observableMarker = getObservableMaker(annotation);
      observableMarker({ target, key });
    }
  }
}
// target就是上面传入的annotation，它有一个属性是MakeObservableSymbol就是真正实现增强的函数
export const getObservableMaker = target => {
  if (target[MakeObservableSymbol]) {
    if (!target[MakeObservableSymbol][MakeObservableSymbol]) {
      return target[MakeObservableSymbol];
    }
    return target[MakeObservableSymbol][MakeObservableSymbol]; // 可能一层可能两层， 比如observable就是两层
  }
};

export function observable(target) {
  return createObservable(null, null, target);
}

observable.shallow = annotations.shallow;
observable[MakeObservableSymbol] = annotations.observable; // 这里两层
```

使用如下，手动当前对象的values属性将被深劫持，而fields属性被浅劫持

```javascript
define(this, {
  values: observable,
  fields: observable.shallow,
});
```



## core

### models

定义Form和Field的数据结构

```javascript
export class Form {
  values = {}; // 表单的值
  fields = {}; // 表单的字段
  constructor(props = {}) {
    this.initialize(props);
    this.makeObservable();
    this.makeValues();
  }
  initialize(props) {
    this.props = props;
  }
  makeObservable() {
    // 初始化时values和fields都是空对象，此时劫持这两个对象
    // 当后续不管是手动改values还是添加删除字段都会被拦截到
    define(this, {
      values: observable,
      fields: observable.shallow,
    });
  }
  makeValues() {
    this.values = Object.assign({}, this.props.values || {});
  }
  createField(props) {
    const address = FormPath.parse().concat(props.name); // 得到新域的path
    new Field(address, props, this);
    return this.fields[address.entire];
  }
  setValuesIn(pattern, value) {
    this.values[pattern.entire] = value;
  }
  getValuesIn(pattern) {
    return this.values[pattern.entire];
  }
  submit = onSubmit => batchSubmit(this, onSubmit);
}
```

通过Field类可以添加字段

```javascript
export class Field {
  constructor(address, props, form) {
    this.props = props;
    this.form = form; // 传入的form实例
    this.locate(address);
    this.initialize();
    this.makeObservable();
  }
  initialize() {
    this.value = this.props.value;
    this.decorator = this.props.decorator;
    this.component = this.props.component;
  }
  makeObservable() {
    // 对自己的value做一个深劫持
    define(this, {
      value: observable,
    });
  }
  locate(address) {
    this.form.fields[address.entire] = this;
    this.path = address;
  }
  get decorator() {
    return [this.decoratorType];
  }
  set decorator(value) {
    this.decoratorType = value[0];
  }
  get component() {
    return [this.componentType];
  }
  set component(value) {
    this.componentType = value[0];
  }
  get value() {
    return this.form.getValuesIn(this.path);
  }
  set value(value) {
    this.form.setValuesIn(this.path, value);
  }
  onInput = event => {
    const newValue = event.target.value;
    this.value = newValue;
    // this.form.values.username = '新的输入框的值'
    this.form.values[this.path.entire] = newValue;
  };
}
```



## reactive-react

主要导出一个`observer`方法来做HOC，给传入组件加一个`instRef`维护一个tracker，这个方法一般不需要使用方直接用，因为已经集成在react包中了

- 初次渲染组件时，track方法执行时，会执行这个view渲染方法，除了做页面的正常渲染，里面必然会有`observable`的value对象被read到 此时就会把tracker注册到了reactionMap上
- 当调用组件的onChange方法，就会修改value的值，此时就会触发组件的forceUpdate
- 这样其实就做到了细粒度的更新，不会像之前的表单解决方案，当有联动情况时，一个域值的改动会引起整个form的重新渲染

```javascript
export function observer(component) {
  const wrappedComponent = props => useObserver(() => component(props));
  return wrappedComponent;
}

export const useObserver = view => {
  const [, setState] = useState({});
  const forceUpdate = () => setState({});
  const instRef = useRef(null);
  if (!instRef.current) {
    instRef.current = new Tracker(forceUpdate);
  }
  return instRef.current.track(view);
};
```



## react

作用就是将react组件与formily的模型联系起来

- 首先提供一个form的context，这样所有的子域都可以方便获得form模型实例

```javascript
export const FormProvider = props => {
  const { form } = props;
  return <FormContext.Provider value={form}>{props.children}</FormContext.Provider>;
};
```

- 实现一个Field组件，通过上面context传下来的form，调用`createField`方法，得到新的字段，同时创建一个字段的context，并且把field往下传

```javascript
export const Field = props => {
  const form = useForm(); // 获取表单的领域模型
  const field = form.createField(props); // 创建字段的领域模型
  return (
    <FieldContext.Provider value={field}>
      <ReactiveField field={field}>{props.children}</ReactiveField>
    </FieldContext.Provider>
  );
};
// 同时渲染Decorator和Component
const ReactiveInternal = props => {
  const { field } = props;
  const renderDecorator = children => React.createElement(field.decoratorType, {}, children);
  const renderComponent = () => {
    const { value } = field;
    const onChange = event => {
      field.onInput(event);
    };
    return React.createElement(field.componentType, { value, onChange });
  };
  return renderDecorator(renderComponent());
};
// 这里是关键，一个按照form/field配置渲染好的组件，被react-reactive的observer方法包装一下，这个就变成响应式的组件了
// 就是指字段属性更新或者value更新，都会触发强制重渲染
export const ReactiveField = observer(ReactiveInternal);
```



### connect

虽然上面的实现应该可以做到响应式的表单组件了，但如果原生组件想通过field做一些增强，那就需要提供一个方法可以做一个HOC，让组件得到能力增强，使用方法就是@formily/antd组件的实现

```javascript
export function mapProps(...propMappers) {
  return Target => observer(props => {
    const field = useField();
    const result = propMappers.reduce(
      (props, propMapper) => Object.assign(props, propMapper(props, field)),
      { ...props }
    );
    return React.createElement(Target, result);
  });
}

export function connect(target, ...enhanceTargets) {
  const Target = enhanceTargets.reduce((target, enhanceTarget) => enhanceTarget(target), target);
  return props =>
    // return <Target {...props} />
    React.createElement(Target, { ...props });
}
```



## antd

以input为例，通过上面的`connect`使组件拿到了field，并增加了有用的属性

```javascript
export const Input = connect(
  AntdInput,
  mapProps((props, field) => ({
    ...props,
    suffix: <span>{field?.loading || field?.validating ? <LoadingOutlined /> : props.suffix}</span>,
  }))
);
```







![img](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/formilycore_1659691651275.svg)