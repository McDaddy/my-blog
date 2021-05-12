---
title: React-Hooks精读
date: 2020-05-22
tags:
 - React Hooks
categories:
 - React

---

这是一年前刚开始上手React Hooks时候读了Dan大神的[useEffect 完整指南](https://overreacted.io/zh-hans/a-complete-guide-to-useeffect/)时写的文章，我的有些观点已经被证明是错误的了，这里放一下就当是做了归档

<!-- more -->

## React-Hooks与闭包

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  const log = () => {
    setCount(count + 1);
    setTimeout(() => {
      console.log(count);
    }, 3000);
  };

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={log}>Click me</button>
    </div>
  );
}
```

猜想在此情况下，连续点击按钮3次，控制台输出？

```
// 预想
3
3
3
// 实际
0
1
2
```

这是为什么呢？为了解答这个问题我们把这个例子用class重写一遍

```jsx
class Counter extends Component {
  state = { count: 0 };
  log = () => {
    this.setState({
      count: this.state.count + 1
    });
    setTimeout(() => {
      console.log(this.state.count);
    }, 3000);
  };

  render() {
    return (
      <div>
        <p>You clicked {this.state.count} times</p>
        <button onClick={this.log}>Click me</button>
      </div>
    );
  }
}
```

同样的操作，得到的结果就是`3 3 3`

原因在于，对于class来说

- state是immutable的， this.setState产生的是新的state引用。
- 在class中state是通过this来获得的，而this得到的内容永远的::唯一的且最新的::。

而对于Function Component来说

- useState得到的state也是immutable的，而setCount会产生一个state新的引用，但这个引用只会用在下次渲染时。
- 由于没有this，所以在setTimeout中拿到的state还是当时创建这个setTimeout时渲染闭包中的state。这种性质在React-Hooks中称为Capture Value

```jsx
// 每次的点击事件都相当于传入常量
setTimeout(() => {
      console.log(0);
    // console.log(1);
    // console.log(2);
}, 3000);
```


#### 这是React-Hooks特有的性质么？
其实这就是**闭包**中的局部变量，不论入参怎么变化，setTimeout中的变量都是在初始化setTimeout时，这个函数作用域中的那个常量值。

```javascript
function sayHi(person) {
  const name = person.name;
  setTimeout(() => {
    alert('Hello, ' + name);
  }, 3000);
}

let someone = {name: 'Dan'};
sayHi(someone);

someone = {name: 'Yuzhi'};
sayHi(someone);

someone = {name: 'Dominic'};
sayHi(someone);
```


### 如何让 Function Component 也打印`3 3 3`?

##### 方法一： useRef
useRef的功能：通过useRef创建的对象，其值只有一份，而且在所有 Rerender 之间共享。<br />但是他有一个问题就是设置ref.current无法触发渲染。<br />另一个问题就是它不再是我们熟悉的state状态，而只是一份引用。

```jsx
function Counter() {
  const count = useRef(0);

  const log = () => {
    count.current++;
    setTimeout(() => {
      console.log(count.current);
    }, 3000);
  };

  return (
    <div>
      <p>You clicked {count.current} times</p>
      <button onClick={log}>Click me</button>
    </div>
  );
}
```


##### 方法二：保留state，利用useEffect

useEffect 是处理副作用的，其执行时机在每次 Render 渲染完毕后，换句话说就是每次渲染都会执行，只是实际在真实DOM操作完毕后。<br />可以利用这个特性，在每次渲染完毕后，将count此时最新的值赋给 currentCount.current，这样就使 currentCount 的值自动同步了count的最新值。

```jsx
let currentCount = 0;
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    currentCount = count;
  });

  const log = () => {
    setCount(count + 1);
    setTimeout(() => {
      console.log(currentCount);
    }, 3000);
  };

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={log}>Click me</button>
    </div>
  );
}
```


## React-Hooks的核心 — Effects


### 问题1：Effect是什么，它有什么意义？

> UI = F(props, state, context)
>
> Props和State的变化，从根本上讲只会影响页面组件jsx的渲染，但如果我们需要做除了dom之外的操作（比如call api）该怎么办？
> 所以Effect可以理解为一种副作用，是区别于纯页面渲染之外的操作。



### 问题2： 为什么useEffect可以拿到最新的state？是不是有data binding的存在？

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = `You clicked ${count} times`;
  });
  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}
```

事实上useEffect和普通的事件处理函数一样，都是通过闭包设常量来定义，所以每次渲染得到的useEffect函数是不一样的。

```jsx
useEffect(
    // 第一次渲染
    () => {
      document.title = `You clicked ${0} times`;
    }
  );
useEffect(
    // 第二次渲染（第一次点击）
    () => {
      document.title = `You clicked ${1} times`;
    }
  );
useEffect(
    // 第三次渲染（第二次点击）
    () => {
      document.title = `You clicked ${2} times`;
    }
  );
```

React会记住你提供的effect函数，并且会在每次更改作用于DOM并让浏览器绘制屏幕后去调用它。每个effect函数都**从属于**某个特定的渲染，就像事件处理函数一样。


### 问题3： Effect中的依赖是什么？

如果没有依赖，那么每次渲染都会执行useEffect函数，那会造成无畏的性能损失，所以deps是一种类似virtual dom对比的策略。

```jsx
function Greeting({ name }) {
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    document.title = 'Hello, ' + name;
  });

  return (
    <h1 className="Greeting">
      Hello, {name}
      <button onClick={() => setCounter(counter + 1)}>
        Increment
      </button>
    </h1>
  );
}
// 没有依赖的情况下
let oldEffect = () => { document.title = 'Hello, Dan'; };
let newEffect = () => { document.title = 'Hello, Dan'; };

useEffect(() => {
   document.title = 'Hello, ' + name;
}, [name]); // 加上依赖
// 有依赖的情况下
const oldEffect = () => { document.title = 'Hello, Dan'; };
const oldDeps = ['Dan'];

const newEffect = () => { document.title = 'Hello, Dan'; };
const newDeps = ['Dan'];
```


### 问题4：是否必须要把依赖列出来？

将上面的setTimeout改为setInterval，结果会有什么变化？useEffect的依赖为[]

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCount(count + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return <h1>{count}</h1>;
}
```

```
// 期望
0 1 2 3...
// 实际
1 1 1 1...
```

思考原因，因为依赖是[]，意味着这个useEffect不依赖于任何变量，只会在组件挂载和销毁时调用，所以这个`const id = setInterval(...)`只执行了一次，结合之前闭包的原理，在setInterval中的count永远是初始的0，所以实际的执行效果就是每一秒钟发生一次`setCount(0 + 1)`，count的最新值也就永远是1。由此可见是需要把相关的依赖都列出来的。<br />但如果把count列在依赖中，这个useEffect就会不断重复执行，这和初衷不符。


### 问题5：可不可以绕过依赖检查?

思路一：去掉count依赖，利用传函数给setCount方法，在setCount的回调函数中，c值永远指向最新的count值，因此没有逻辑漏洞。

```jsx
useEffect(() => {
    const id = setInterval(() => {
      setCount(c => c + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);
```

不足：但存在两个以上变量需要使用时，这招就没有用武之地了。

```jsx
function Counter() {
  const [count, setCount] = useState(0);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCount(c => c + step);
    }, 1000);
    return () => clearInterval(id);
  }, [step]);

  return <h1>{count}</h1>;
}
```

思路二： **useReducer**

> const [state, dispatch] = useReducer(reducer, initialState);
> 不论有多少依赖，最终都化为dispatch这一个依赖，useEffect只管发出action，而不需要关心实际依赖的那些数据是否变化。


```jsx
function Counter() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { count, step } = state;

  useEffect(() => {
    const id = setInterval(() => {
      dispatch({ type: "tick" });
    }, 1000);
    return () => clearInterval(id);
  }, [dispatch]);

  return <h1>{count}</h1>;
}

function reducer(state, action) {
  switch (action.type) {
    case "tick":
      return {
        ...state,
        count: state.count + state.step
      };
  }
}
```

useReducer的最大意义在于它配合useEffect可以将状态和行为分离，在useEffect中不需要关系去更新哪个状态，只知道发什么什么action，剩下的交给reducer做，而useEffect自己关注与自己到底要做哪些副作用就好。这点在处理复杂逻辑的组件时很有效。

```jsx
// 无限循环bug
useEffect(() => {
	setStateB(stateA + 1);
}, [stateA]);

useEffect(() => {
	fetchData(stateB);
	setStateC(stateB + 1);
}, [stateB]);

useEffect(() => {
	setStateA(stateC + 1);
}, [stateC]);

// 使用useReducer来解决
const reducer = (state, action) => {
	switch (action.type) {
    case "update":
      return {
        ...state,
        // propA: state.propC + 1,
        propB: state.propA + 1,
		  propC: state.propB + 1,
      };
  }
}
const [state, dispatch] = useReducer(reducer, initialState);
const { propA, propB, propC } = state;
useEffect(() => {
	dispatch({type: 'update'});
	fetchData(propA + 1);
}, [propA]);
```


### 问题6：函数需不需要成为依赖？

如果我们把Effect中的内容作为函数提出来

```jsx
// 原始版
function SearchResults() {
  const [query, setQuery] = useState('react');
  useEffect(() => {
    const data = props.fetchData(query);
  }, [query]);

// 第一版
function SearchResults() {
  const [query, setQuery] = useState('react');
  const getFetchData = () => {
    return props.fetchData(query);
  };
  useEffect(() => {
    const data = getFetchData();
  }, [getFetchData]);
// 结果： getFetchData会在每次渲染后执行，因为这样定义方法每次渲染都会重新执行定义，导致它成为一个新的方法实例。

// 第二版
function SearchResults() {
  const [query, setQuery] = useState('react');
  const getFetchData = () => {
    return props.fetchData(query);
  };
  useEffect(() => {
    const data = getFetchData();
  }, [query]);
// 结果是正确的，但是违反了对依赖诚实的规则

// 最终版
function SearchResults() {
  const [query, setQuery] = useState('react');
  const getFetchData = useCallback(() => {
    return props.fetchData(query);
  }, [query]);
  useEffect(() => {
    const data = getFetchData();
  }, [getFetchData]);
}
```

useCallback本质上是添加了一层依赖检查。它是从另一种角度来实现依赖，Effect从依赖变量转为依赖函数。<br />说到这里其实useCallback的作用只是为了绕过lint检查，就是个辣鸡。<br />其实接下来才是useCallback真正有意义的地方

1. 它可以做class不能做的事情，从父传方法给子调用，同时方法中用到父的状态，仅当父状态变化时子调用。在class中除了把状态传下来没有别的办法。

```jsx
class Parent extends Component {
  state = {
    query: 'react'
  };
  fetchData = () => {
    return this.props.fetchData(this.state.query);
  };
  render() {
    return <Child fetchData={this.fetchData} />;
  }
}

class Child extends Component {
  state = {
    data: null
  };
  componentDidMount() {
    this.props.fetchData();
  }
  componentDidUpdate(prevProps) {
    // This condition will never be true
    if (this.props.fetchData !== prevProps.fetchData) {
      this.props.fetchData();
    }
  }
  render() {
    // ...
  }
}

// Parent
render() {
    return <Child fetchData={this.fetchData} query={this.state.query} />;
  }
// Child
componentDidUpdate(prevProps) {
    if (this.props.query !== prevProps.query) {
      this.props.fetchData();
    }
}
```

而useCallback可以合理得将父状态和父方法封装在一起，传给子组件，子组件只需要监听函数变化即可。

```jsx
function Parent() {
  const [query, setQuery] = useState('react');
  const fetchData = useCallback(() => {
    return props.fetchData(query)
  }, [query]); 
  return <Child fetchData={fetchData} />
}

function Child({ fetchData }) {
  let [data, setData] = useState(null);

  useEffect(() => {
    fetchData().then(setData);
  }, [fetchData]); 
  // ...
}
```

2. useCallback可以用于性能提升

```jsx
//在class中如果定义onClick的回调用() => {}的形式，
//那么这个Button会因为props的改变每次随组件一起更新
//解决方法是把方法单独抽出，用onClick={this.handle}来解决
//在Function中handle是每次执行函数都会重新定义的，所以会遇到同样的问题
function Foo() {
  const handleClick = () => {
    console.log('Click happened');
  }
  return <Button onClick={handleClick}>Click Me</Button>;
}
//利用useCallback，他依赖于某个变量或者不依赖变量来决定这个callback是否变化，从而达到和this一样的效果。
function Foo() {
  const memoizedHandleClick = useCallback(
    () => console.log('Click happened'), [],
  ); // Tells React to memoize regardless of arguments.
  return <Button onClick={memoizedHandleClick}>Click Me</Button>;
}
```

3. 在Function Component中 add/removeEventListerner

- 在纯函数组件中为某个domRef添加删除eventHandler必须考虑：每次渲染时如果这个eventHandler是没法提出到组件外的话，那这个handler总是变化的，这样的话add/removeEventListerner无法删除。
- 为了解决这个问题，必须在handler外包一个useCallback来保持handler不变化。
- 但这样又引出新问题，如果handler内用到了state，那在触发event时拿到的state永远是初始值。
- 为了解决这个问题，此时用到的state全部改成useRef, 改值时都用ref.current = ‘value’。
- 但如此又引出新的问题，ref的改值是不会触发渲染的。
- 为了解决这个问题，只能再添加一个为了渲染而存在的state，但有点反设计。


### 问题7： 在Effect中依赖为[]？是不是就是componentDidMount?

答案是否定的。Effect定义的先后顺序决定了在每次渲染结束之后的执行顺序。

```jsx
React.useEffect(() => {
    console.log('exec state effect', count);
}, [count]);

React.useEffect(() => {
    console.log('exec init effect');
}, []);

// 结果
// exec state effect
// exec init effect
```


### 问题8： Effect中的清理是什么？是不是就是componentWillUnmount?

Effect永远是在渲染完成之后执行的，同时清理中的函数读的state同Effect函数一样是固定在渲染时的。每次渲染结束，先执行清理（清理上一次的effect），再执行effect函数。正是因为渲染优先，所以hooks在理论上会比class性能更好，因为它不会阻塞渲染的线程。

```jsx
const Counter = () => {
  const [count, setCount] = React.useState(1);
  console.log('render', count);

  React.useEffect(() => {
    console.log('exec effect', count);
    return () => {
      console.log('clear effect', count);
    };
  }, [step]);
	
	<div>
      <p>You clicked {count} times</p>
      <Button onClick={() => setCount(count + 1)}>Click me</Button>
  </div>
}
// 预想输出
render 1
exec effect 1
clear effect 1
render 2
exec effect 2
clear effect 2
render 3
...
// 实际输出
render 1
exec effect 1
render 2
clear effect 1
exec effect 2
render 3
clear effect 2
...
```


### 问题9： 如何实现setState之后的回调？

事实上这个功能还没有官方的实现方法，从React作者的角度来讲他建议所有的回调都应该归结到Effect中，但现实中还是有它实际的用途的。 [open issue链接](https://github.com/facebook/react/issues/14174)

```jsx
// class component
fetchData = () => {
	this.props.callApi(this.state.count);
}
...
this.setState({count: this.state.count + 1}, () => this.fetchData());
...
// function component
const [shouldFetch, setShouldFetch] = useState(false);
const fetchData = React.useCallback(() => {
	props.callApi(count);
  setShouldFetch(false);
}, [count]);
...
setCount(count + 1);
setShouldFetch(true);
...
```


### 问题10：要不要打开react-hooks/exhaustive-deps

个人建议不要打开，原因主要是

1. 在Effect中经常要调用props里的异步方法，把这个方法加入依赖会造成不必要的调用。
1. 在Effect函数的逻辑里，经常会有state之间的对比`if count !== step ...then`， 这段逻辑事实上只想在count变化时触发，但lint会强制把step也加入而引起不必要的调用。

> 如果不开这条rule就必须开发自己保证在Effect中避免上面setInterval的错误。



## 用 useMemo 做局部 PureRender

useMemo对比memo的好处是useMemo可以更细粒度得控制哪些props会加入到渲染条件中。

```jsx
// memo
const Child = memo((props) => {
  useEffect(() => {
    props.fetchData()
  }, [props.fetchData])

  return (
    // ...
  )
})
// useMemo
const Child = (props) => {
  useEffect(() => {
    props.fetchData()
  }, [props.fetchData])

  return useMemo(() => (
    // ...
  ), [props.fetchData])
}
```


### 使用 Context 做批量透传

```jsx
const Store = createContext(null);

function Parent() {
  const [count, setCount] = useState(0);
  const [step, setStep] = useState(0);
  const fetchData = useFetch(count, step);

  return (
    <Store.Provider value={{ count, setCount, setStep, fetchData }}>
      <Child />
    </Store.Provider>
  );
}

// memo不会生效，需要用useMemo替换
const Child = memo((props) => {
  const { count, setCount } = useContext(Store)

  function onClick() {
    setCount(count => count + 1)
  }

  return (
	   <div>
       { count }
     </div>
    // ...
  )
})
```


## 总结

Class Component or Function Component?

> 参考文档：
> [精读《Function Component 入门》](https://juejin.im/post/5ceb36dd51882530be7b1585)
> [useEffect 完整指南](https://overreacted.io/zh-hans/a-complete-guide-to-useeffect/)