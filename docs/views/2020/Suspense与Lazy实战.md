---
title: React Suspense & Lazy实战
date: 2020-05-26
tags:
 - React
categories:
 - React

---

需求是之前后端拿给我看一个兖矿的环境，各个页面路由间切换，内容一直是白屏，过了很久才出现内容。问是不是前端问题，为什么白屏这么久，打开控制台看很明显看到部署的网络环境比较差，chunk文件加载速度很慢。为了不给用户带来页面崩溃的错觉，应该加上类似菊花的进度显示。而这里正好可以结合React官方的Suspense和Lazy来实现的。

<!-- more -->

首先第一步， 改造组件的加载模式，先回顾下当前的加载方式

1. 在路由文件中定义组件的`getComp`属性传递ES6的动态import和导出名

```javascript
{
  path: 'createProject',
  breadcrumbName: i18n.t('add project'),
  getComp: cb => cb(import('app/modules/org/pages/projects/create-project'), 'ExportName'),
},
```

2. 在解析路由文件时，将整个方法包起来传入一个`asyncComponent`中

```javascript
if (route.getComp) {
  route.component = asyncComponent(
    () => route.getComp((loadingMod, key = 'default') => {
      return loadingMod.then(mod => (wrapper ? wrapper(mod[key]) : mod[key]));
    })
  );
  route.exact = route.isExact === undefined ? true : route.isExact;
}
```

3. 而这个`asyncComponent`其实是由于`react-router` v4没有提供可以拿到回调中的被加载组件的方法（换句话说，router没法去加载一个promise）所提供的临时方案。里面做的事情就是通过动态import的`promise`返回来异步渲染组件，未加载成功前显示空

```javascript
// in react-router v4, there is no `getComponent` to pass a callback to load comp, instead introduce this asyncComponent to implement it.
// this is also solution for dva/dynamic
export const asyncComponent = (getComponent: Function) => {
  return class AsyncComponent extends React.Component {
    static Component: any = null;

    state = { Component: AsyncComponent.Component };

    componentDidMount() {
      if (!this.state.Component) {
        getComponent().then((Component: any) => {
          AsyncComponent.Component = Component;
          this.setState({ Component });
        });
      }
    }

    render() {
      const { Component } = this.state;
      if (Component) {
        return <Component {...this.props} />;
      }
      return null;
    }
  };
};
```

而`React.lazy(() => import(./xxx))`这里是可以返回一个组件的，所以我们就可以完全把这个临时方案去掉了。

但是lazy不接受**非**`default`的导出，所以还需要将所有具名导出改成default导出

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200526162211702.png" alt="image-20200526162211702" style="zoom:50%;" />

所以具体实现就是

```react
// 定义路由
{
  path: 'settings',
  breadcrumbName: i18n.t('workBench:addon setting'),
  getComp: () => import('common/components/addon-settings'),  // 导出形式改成原生态，不用包cb
},

// 解析路由
if (route.getComp) {
  route.component = wrapper ? wrapper(React.lazy(route.getComp)) : React.lazy(route.getComp);
  route.exact = route.isExact === undefined ? true : route.isExact;
}
  
// 在renderRoutes外层包一个Suspense， 并加上fallback
export const EmptyContainer = ({ route }: any) => {
  return (
    <React.Suspense fallback={<LoadingContent />}>
      {renderRoutes(route.routes)}
    </React.Suspense>
  );
};
  
// 定义fallback 仅当延迟300ms还未加载chunk成功才显示
export const LoadingContent = () => {
  const [show, setShow] = React.useState(false);
  const timer = React.useRef(setTimeout(() => {
    setShow(true);
  }, 300));

  useUnmount(() => {
    clearTimeout(timer.current);
  });

  if (show) {
    return (
      <>
        <div className="main-holder">
          <div id="enter-loading" />
        </div>
      </>
    );
  }
  return null;
};
```

使用前：

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/Kapture 2020-05-26 at 16.39.29.gif" style="zoom:80%;" />

使用后：

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/Kapture 2020-05-26 at 16.42.38.gif" alt="Kapture 2020-05-26 at 16.42.38" style="zoom:80%;" />

总结： 虽然这个效果也可以通过改造`asyncComponent`来实现，但用发展的眼光看问题，还是用官方提供的解决方法比较有意义，虽然Suspense/Lazy还属于试验阶段，但推出已经差不多两年，而且是React官方三种模式都兼容的新特性，所以应该可以放心使用。