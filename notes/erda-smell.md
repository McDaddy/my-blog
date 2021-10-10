- fill的颜色可以抽取到公共类中

```
<IconTime className="-mt-0.5" theme="outline" size="16" fill="#070A1A" />
```

- 减少inline style
- 迁移scss到tailwind
- 公共组件和方法添加详细注释
- 从store迁移到纯Service调用



1. 服务端nest.js
2. 前端next.js 开启SSR 直接上react 17
3. 组件库antd
4. 样式库tailwind
5. 包管理pnpm
6. 图表echarts
7. 状态管理cube-state
8. 打包webpack5
9. 开启eslint-loader
10. 开启any warning
11. 开启warning error无法提交

路由问题

鉴权问题

API问题

规范：

1. 不得使用 git commit —no-verify  可以适当加ignore注释 但不能是 eslint-disable-next-line react-hooks/exhaustive-deps
2. 特殊拼写全部加入cspell.json
3. service层实现，用最新的hook形式
4. 不留没用注释
5. 需要从erda-ui/fdp-ui 迁代码，只迁有用的， 不要整块整块复制粘贴
6. useUpdate 不用as语法。用IState替代