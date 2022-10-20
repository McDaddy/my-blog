## Tips

#### 在有setState的函数中，不需要把state作为依赖项

```typescript
❌ 不太好
const decrement = useCallback(() => setCount(count - 1), [setCount, count])
const decrement = useCallback(() => setCount(count - 1), [count])

✅ 推荐
const decrement = () => setCount(count => (count - 1));
```



#### 如果`useMemo`或者`useCallback`里面没有任何依赖，那可能代表你不需要使用这些hook

```typescript
❌ 不太好
const MyComponent = () => {
   const functionToCall = useCallback(x: string => `Hello ${x}!`,[])
   const iAmAConstant = useMemo(() => { return {x: 5, y: 2} }, [])
   /* 接下来可能会用到 functionToCall 和 iAmAConstant */
}

✅ 推荐
const I_AM_A_CONSTANT =  { x: 5, y: 2 }
const functionToCall = (x: string) => `Hello ${x}!`
const MyComponent = () => {
   /* 接下来可能会用到 functionToCall 和 I_AM_A_CONSTANT */
}
```



#### 使用`RDD`开发方式来开发和设计组件API，即`README`驱动开发

#### 去除代码异味

- 一个函数有太多的参数
- 单个文件代码行数过多，一般逻辑类的代码绝对不能超过200行
- 重复的代码
- 逻辑难以理解且没有注释的代码

#### 相信工具的力量

- 开启Eslint/StyleLint 分析代码
- 全面使用typescript
- 渲染数组组件时，必须加上key
- 当遇到`exhaustive-deps`问题时，考虑依赖项是否是参与渲染的，如果不是，那就用`ref`来替代
- 添加错误边界
- 不能无视控台中的warning和errors
- 不论路由级页面还是公共组件，都要记得做`tree-sharking`
- 利用`Prettier`来统一团队的代码格式



#### 不要去维护可以被推导的状态

删除这些冗余的状态，除了避免同步错误外，这样的代码也更容易维护和推理，而且代码更少。



#### [不要过度优化代码](https://kentcdodds.com/blog/usememo-and-usecallback)

不要滥用`useMemo`和`useCallback`，只有在两种情况下去使用

1. 需要引用相同，具体来讲就是两种情况
   1. 当缓存的对象或者函数，被一个`useEffect`作为依赖
   2. 当缓存的对象或者函数，作为一个`props`传入了一个被`React.memo`包裹的组件
2. 复杂的计算，比如数组的for循环等

除此之外，就不需要额外得去使用了，因为使用hook本身就是有代价的，这**完全抵消**了因为缓存所达到的性能提升

具体而言，当`useMemo`一个函数，当第二次渲染页面时，这个函数依然要被创建（开辟内存，虽然它用不到），同时在useMemo中还缓存了上一次的函数，所以此时就为这个函数开辟了两份内存空间。同时调用hooks也是有执行的消耗的，所以总体还不如不用这个hook


