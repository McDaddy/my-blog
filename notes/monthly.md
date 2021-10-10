## Release/1.3

- 管理员入口的变化
- 待处理看板添加更多过滤功能
- 手动测试执行计划添加归档功能
- cli增加线上根据git version判断是否跳过打包的脚本



P1 问题总结

1. 个人要负责自己的cherry-pick是否合并到指定分支，如果reviewer忘记操作，也可以自行操作
2. 拷贝老代码逻辑时需要验证所有功能点，免得引入新的问题



code review

```javascript
{} as XXX  时需要实事求是， 应该是Partial<XXX>
组件名和文件名不对应
props类型要写成 IXXXProps
interface type 首字母大写
不要滥用 _ 临时变量
尽量不要使用import * as XX from 'xx' 这种语法， 因为这样对tree shaking很不友好，用什么import什么，把这个解构放上面去， 然后就算要保持现状，只有组件和class可以大写开头，其他都应该小写开头tagService
边界不清，A组件带逻辑的内容直接export给B用
命名规范 + 注释规范
flex为1的兄弟组件。 都要设置宽度或者truncate
```



