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

组件化的一个隐忧，必须一开始就设计好，组件API，不然删除一个属性根本不知道有没有被用到

markdown组件槽点：
1. 属性要内聚，比如Markdown的onSetLS属性，思考下应不应该放进来
2. 无关的内容不要放进来，比如show rate
3. React的设计原则，如果受控就一直受控，如果不受控就一直不受控


{list.map((item) => {
                const { title = '-', onClick = () => {}, `show` = true } = item;
                return show ? (
                  <Menu.Item key={title} onClick={onClick}>
                    <span className="fake-link mr-1">{title}</span>
                  </Menu.Item>
                ) : (
                  ''
```



![image-20211116155450381](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20211116155450381.png)



@erda-ui/cli 发了1.3.5， 对国际化做了些调整

1. 不再支持中文翻译英文，将来只支持英文翻译英文，用法流程没有变化。可能有些难适应，但也只能这样倒逼产品早日优先出英文版原型，同时也基本可以避免我们有低级的翻译错误
2. `erda-ui i18n` 命令即使在没有需要翻译内容的时候执行，也可以做locale文件的排序和去除无用locale内容。所以将来有手动修改locale文件和删除了包含i18n的源码之后都可以执行下命令来整理下locale文件，也检查下是否有翻译缺失
3. 由于目前命名空间的管理太乱，而迁移命名空间的步骤成本太高，这次增加`--switch` 参数，在源码中`i18n.t('A:xxx')`把t改成r(replace)，即`i18n.r('A:xxx')`。然后执行`erda-ui i18n --switch`，选择目标空间B，就可以一键把所有源码中的`i18n.t('A:xxx')`转成`i18n.t('B:xxx')`，同时自动会把locale文件中的内容也调整过来



@erda-ui/cli 1.3.6. 国际化相关调整

- 重构类
  - 此前`default`这个命名空间是维护在`shell`里面的。这会对将来扩展带来牵制，理想情况下将来shell只是一个集合布局、权限、路由等内容的基础应用，而各个具体模块将继续抽离出去，与shell平行存在，所以这次的改动是，**将default的内容单独抽离出去，维护在单独的locale文件中**。今后子模块的locale文件里就不再需要有default空间，全部都从公共的引
- 功能类
  - 鉴于近期园区网络问题，谷歌自动翻译api无法调用，会阻塞脚本的执行。所以这里**加入有道的翻译api**，但是它没有纯免费的版本，现在可以用我个人注册的账号使用。使用方法是把`.translaterc`文件拷贝到项目根路径，文件我已经上传到了群共享。建议在谷歌无法使用时用
  - 此前需要`cd`到具体模块目录再执行`erda-ui i18n`，现在开始将不区分模块，和其他`erda-ui`命令一样，**只能在根路径执行**，主要目的有二：
    1. 在`enterprise`有msp/cmp的部分代码，之前要维护那部分的i18n很麻烦，这次将那部分的locale文件全部抽了回来。在全局执行i18n，不仅会扫描erda-ui的内容，也会扫描和管理enterprise里的相关代码。
    2. 因为default被单独提出，那如果修改删除了default里的内容必然会影响全局，所以必须要统一地执行i18n，而不是分模块
  - 添加了一个`–external`参数，可以维护fdp/admin/uc这样的与`erda-ui`不共享资源的i18n

- 修复类
  - 修复了`i18n.r`迁移时无法识别`i18n.t`第二个参数的问题



Erda组件库S2规划

- 项目搭建  ①
- 支持国际化  ④
- 文档支持dumi或者storybook  ②
- 单测覆盖60%以上 ⑤
- 样式回归sass 并且支持主题色与样式前缀 ③
- S2计划主要涉及包括但不限于以下组件(后期可动态调整):  
  - Table
  - Form Builder
  - Panel
  - Log Viewer
  - Markdown Editor
  - Filter
  - Ellipsis
  - Icon

时间: 12月1日到4月15日

参与人: 韡韬，培峰，圣辉

优先级： 见上图示

细化：

| 时间          | 目标                                          | 进度 |
| ------------- | --------------------------------------------- | ---- |
| 12.1 ~ 12.10  | 项目搭建                                      | 10%  |
| 12.13 ~ 12.24 | 模拟一个组件，实现文档支持，发布dev           | 20%  |
| 12.27 ~ 1.7   | 完善样式支持方案                              | 30%  |
| 1.10 ~ 1.21   | 支持组件国际化，开始试水快数据项目            | 50%  |
| 1.24 ~ 2.18   | 添加第一个组件（建立标准）同时开始试水erda-ui | 70%  |
| 2.21 ~ 4.15   | 添加余下组件                                  | 100% |

