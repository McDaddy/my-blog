---
title: 初识mobx
date: 2021-12-26
tags:
 - mobx
categories:
 - react

---

虽然写了多年的React，但也没有仔细得去了解过mobx，这里对它来做一个初体验

<!-- more -->

## Mobx核心

个人认为mobx的核心在于其的响应式设计，对比与redux的不同

redux的过程

- 派发action
- Reducer接收action，依据原有的state，结合action和payload，产生一个新的state，返回给store
- UI和store绑定，接收到store状态的更新，进而更新视图

mobx的过程

- 在store中定义被观察的状态，做一个深度代理
- 在UI中，可以直接操作状态，mobx会有一个响应式的监听
- 监听到变化后，要么产生computed values，要么触发Reaction（其实就是个effect）
- UI与store绑定，会根据状态更改的粒度去更新UI

![image-20211226232215269](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20211226232215269.png)

我认为他对比redux有两大优点

### 步骤简单，心智负担小

它不需要去定义繁琐的action，所有的改动都是自然而然的，和我们操作代码的习惯一般，在我们直接修改状态的同时，就把更新与副作用都实现了。 从某种意义上来说，redux是主动的，因为需要主动发起action，而mobx是被动的，副作用是手动修改状态后被动发生的。这点和vue的响应式思想是很类似的

### 性能高效

举个例子， 假设下面的message是一个组件的props

```javascript
let message = mobx.observable({
    title: "Foo",
  	age: 19,
    author: {
        name: "Michel"
    },
    likes: [
        "John", "Sara"
    ]
});

mobx.autorun(() => {
    console.log(message.title) // 打印两次
})
mobx.autorun(() => {
    console.log(message.age) // 只会打印一次
})
message.title = 'abc'
```

- 如果是通过redux和组件关联，那么假设，组件里只用到message中的author属性，那么message.title改变后，这个组件是会被重新渲染的，即使组件中根本没用到这个属性。因为整个message是一个新的state。虽然通过dom diff可以避免实际的dom操作，但是渲染这个步骤是确实发生了
- 如果是通过mobx和组件关联，同样情况下，改变title，不会使得只引用author的组件重新渲染，这就是说它高效的原因



## 实现原理

### 深度代理

首先，做到响应式，肯定不是一层能相应，比如`{ a:1 }`改变a的值可以相应，同时如`{ a: { b: 1} }`当修改b的时候也要能做到响应式，这里就需要一个深度代理

```javascript
function deepProxy(val, handler) {
  // 如果是非对象就直接返回其本身，或者说只代理对象
  if (typeof val !== "object") {
    return val;
  }
  // 从直觉上讲，我们应该先创建自身的proxy，然后遍历属性，创建各自的proxy然后添加回自身
  // 但是这样会有一个问题，当创建子属性的proxy后，赋值回来的时候，因为父的proxy已经建立好了
  // 此时就会无缘无故触发了父的set方法，比如一个val有100个属性，那么就相当于这个proxy被修改了100次，触发100次set
  // 所以，只能做一个类似后续遍历的操作，先把子都代理好，然后再来代理父
  for (const key in val) {
    val[key] = deepProxy(val[key], handler);
  }
  return new Proxy(val, handler()); // 子都搞定了，最后创建自身的proxy
}

function createObservable(val) {
  // 统一定义proxy的handler
  const handler = () => ({
    get(target, key) {
      return Reflect.get(target, key);
    },
    set(target, key, value) {
      return Reflect.set(target, key, value);
    },
  });
  return deepProxy(val, handler);
}

const obj = createObservable({ a: { b:2 } });
obj.a.b = 3 // 此时obj.a的set会被调用
console.log(obj);
```

### 依赖收集

有了代理之后，相当于知道了哪些对象是可被观察的。但可被观察对象不代表改变了就会触发副作用，需要代码来决定去监听某些部分的变化。比如下面的代码，除了初始化，仅会在author变化时执行，而其他属性变化时不会执行

```javascript
autorun(() => {
  console.log(message.author);
})
```

大致原理

- 每次调用autorun，会把回调函数暂存到nowFn
- autorun会在初始化执行一次handler，而handler中一定会调用到属性的get，即`.`
- 每次创建代理对象时，创建一个reaction对象，当触发get时，调用collect方法收集依赖
- reaction中定义一个store，是为了如果某个属性，被多个autorun回调，那么就要存成一个数组
- handler第一次执行结束，nowFn重新变成null
- 当set值时，调用reaction.run方法，取出所有存起来的handler回调一起执行
- **注意** 收集依赖时`console.log(obj.a.b)`a和b的get都会被调用
- **注意** 改值时，`obj.a.b = 3` 只会在b的set上执行，而a是不会被执行到的，所以只会执行b上面的reaction收集回调
- 如果写成`obj.a = 3`，此时b的reaction就不会执行了，会执行a的reaction，而此时虽然不是直接改b，但是因为b已经不存在，所以会打印undefined

```javascript
// 全局定义，只有一个
let nowFn = null;

class Reaction {
  constructor() {
    this.store = [];
  }

  collect() {
    // 这个判断是和end清楚nowFn结合使用
    // 如果我是在autorun之外触发了get，那就不应该被收集依赖，这里就确保只有autorun里面的变量被收集
    if (nowFn) {
      this.store.push(nowFn);
    }
  }

  run() {
    if (this.store.length) {
      this.store.forEach((w) => w());
    }
  }

  static start(handler) {
    nowFn = handler;
  }

  static end() {
    nowFn = null;
  }
}

const autorun = (handler) => {
  Reaction.start(handler);
  handler();
  Reaction.end();
};

function createObservable(val) {
  const handler = () => {
    const reaction = new Reaction(); // 每次创建代理都有一个reaction实例
    return {
      get(target, key) {
        reaction.collect(); // handler首次执行时收集依赖
        return Reflect.get(target, key);
      },
      set(target, key, value) {
        const r = Reflect.set(target, key, value);
        reaction.run(); // 修改变量时执行存储的回调
        return r;
      },
    };
  };
  return deepProxy(val, handler);
}

const obj = createObservable({ a: { b: 2 } });

autorun(() => {
    console.log(obj.a.b);
})

obj.a = 3
```



同理，react-mobx就是重写了`componentWillMount`方法，只要是被监听的变量发生变化，就强制执行render，否则就不重新渲染