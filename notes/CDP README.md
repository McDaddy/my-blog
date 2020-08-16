# Terminus Dice CDP UI



## 简介

此项目为Dice CDP的前端工程项目的库项目， 目前被集成于Dice与美孚的前端工程中

- 生产环境: https://terminus-org.app.terminus.io



## 如何引用本工程



#### 下载npm依赖

```
npm i @terminus/dice-cdp
```



#### 修改webpack配置

```

// 1. 确保有svg loader(url-loader)配置

{

  test: /.svg$/,

  use: ['@svgr/webpack'],

  include: [

​    resolve('node_modules/@terminus/nusi'),

​    resolve('node_modules/@terminus/dice-cdp'),

  ],

},



// 2. 在scss loader的路径中加入dice-cdp，并确保包含有nusi

{

  test: /.(scss)$/,

  include: [

​    resolve('app'),

​    resolve('node_modules/@terminus/nusi'),

​    resolve('node_modules/@terminus/dice-cdp'),

  ],

}



// 3. ts loader中添加dice-cdp的路径

{

  test: /.(tsx?|jsx?)$/,

  include: [

​    resolve('app'),

​    resolve('node_modules/@terminus/dice-cdp'),

  ],

  use: ['happypack/loader?id=ts'],

},



// 4. 将dice-cdp的图片资源拷贝到指定路径 public/assets/images

new CopyWebpackPlugin([

  { from: './app/images', to: 'images' },

  { from: path.resolve('node_modules/@terminus/dice-cdp/app/images'), to: path.resolve(__dirname, 'public/assets/images') },

]),

```



#### 添加iconfont

在项目模板文件中加入dice-cdp的iconfont资源

[iconfont](https://www.iconfont.cn/manage/index?spm=a313x.7781069.1998910419.11&manage_type=myprojects&projectId=1517355&keyword=)



#### 添加nusi主题色

由于dice-cdp使用的是nusi组件库，如果被集成项目没有定义nusi的主题色名，需要将相关主题色重新定义一遍



## 如何使用

参考demo文件夹实现， 将导出的DiceAPP作为一个大的组件注册在路由中， 如果需要配置菜单须根据具体项目具体配置





## 如何开发



**### nginx(herd) 配置**

为`dl`和`cdp`两个前缀定义转发路径, 以下以nginx为例，herd同理

具体环境的后端地址需要向相关后端人员索要

```nginx
location /api/dl {
​    proxy_pass              http://localhost:8082;
​    proxy_set_header        X-Real-IP $remote_addr;
​    proxy_set_header        X-Forwarded-For $proxy_add_x_forwarded_for;
​    proxy_set_header        Host $host;
 }



  location /api/cdp {
​    proxy_pass              http://localhost:8181;
​    proxy_set_header        X-Real-IP $remote_addr;
​    proxy_set_header        X-Forwarded-For $proxy_add_x_forwarded_for;
​    proxy_set_header        Host $host;
 }
```



#### 启动

- `npm install`

- `npm run dll && npm run watch`

- 发布 更新version后 `npm run pub`





## 开发流程

### 项目结构说明

```javasdript

app: src目录
  cdp: 模块名
​    stores: cube-state的store
​    pages: 按页面划分， 目前使用hooks为主，可以直接写组件，不用区分是否容器
​      components: 纯组件
​      containers: 容器组件
​    services: api接口
​    index.js: router配置
```



### 项目开发流程（参考）

1. services中添加接口
2. store中添加实现
3. index.js添加页面路由
4. components中添加组件



### 国际化

所有开发的新功能都要求全面国际化。具体步骤：

1. 将需要国际化的中文用i18n.d包裹起来

```html
<Select
  showSearch
  placeholder={i18n.d('请输入关键字')}
  showArrow={false}
  onChange={handleSearchChange}
>
```

2. 跑 npm run extract， 此时temp-zh-words.json就会将待翻译的语句抽取出来
3. 跑 npm run translate， 通过谷歌翻译自动翻译抽取出来的中文， 翻译结束后在temp-zh-words.json中仔细检查翻译是否符合预期
4. 再次跑 npm run extract， 此时会自动将翻译好的英文回填到原来的位置，且将.d改为.t

```html
<Select
  showSearch
  placeholder={i18n.t('please enter key words')}
  showArrow={false}
  onChange={handleSearchChange}
>
```

5. 在翻译出来的英文前加上namespace，一般为`dpCommon`，如果是非常常用的词可以不加

```html
<Select
  showSearch
  placeholder={i18n.t('dpCommon:please enter key words')}
  showArrow={false}
  onChange={handleSearchChange}
>
```

6. 跑 npm run locale，会自动将翻译好的内容集合到zh.json和en.json。记得检查有漏翻的情况
7. 恢复temp-zh-words.json为空文件
8. 遇到特别长的句子，用一个短的字符串作为key



### Service层的书写

service的书写以`app/cdp/services/intelligent-recommendation.ts`为范本。 以配置化的形式来配置api。注意api名以驼峰命名并且以http方法开头



### 代码规范

- Node 版本统一12.x
- 统一要求两个vscode插件
  - eslint提示代码问题
  - Code Spell Checker 防止拼写错误
  - vscode 设置save时自动按照lint format的功能
- 组件在路由文件的导出统一用默认导出`getComp: cb => cb(import('./pages/subject-domain'))`，不用具名导出。
- Git 分支当开发阶段统一命名`feature/xxxx`，提测以后修复bug统一用`hotfix/xxxx`
- 因为是个库，所以所有的代码引用都使用相对路径
- **全链路覆盖TS**，所有新开发的代码都要严格使用ts，除非特殊情况不用any
- 尽量使用公共的scss mixin，我们已经预定义了各种公用css样式，尽量指定className来实现样式
- 遇到各种组件先看看项目里有没有类似的实现，如果是个通用的是不是可以抽成公共组件
- 保证提交的代码是eslint no warning no error的
- 遇到i18n会重复的情况，尽量抽取到公共文件中，避免重复翻译
- 尽量使用async/await来替代promise的链式写法
- 非页面根的组件尽量用React.memo包一下




### Commit message格式

```
<type>: <subject>
```



注意冒号后面有空格。

type 用于说明 commit 的类别，只允许使用下面所列标识：

> - 其中 feat、fix、refactor 三个 type 需要强制填写 body 信息，用于生成 changeLog。

> - 包括 feat_skip、fix_skip、refactor_skip 在内的其他 type，body 信息选填。



- feat_skip: 新功能

- fix_skip: 缺陷修复

- refactor_skip: 重构（即不是新增功能，也不是修改bug的代码变动）

- feat：新功能（需要生成 changeLog，必填 body）

- fix: 缺陷修复（需要生成 changeLog，必填 body）

- refactor: 重构（即不是新增功能，也不是修改bug的代码变动）（需要生成 changeLog，必填 body)

- docs: 文档（documentation）

- style: 格式（不影响代码运行的变动）

- perf: 性能优化（提升性能的代码变动）

- test: 增加测试

- chore: 构建过程或辅助工具的变动

- revert: 回滚

- WIP: 正在进行中的改动



项目中已引入 [commitizen](https://github.com/commitizen/cz-cli) 工具来生成 commit message，使用方式如下：

>1. 全局装一下 commitizen：`npm i -g commitizen`

>2. 然后使用命令行工具提交 commit，用 `git cz` 命令替换 `git commit` ，按照提示进行选择和填写即可



> ![image-20190327201841668](http://wx4.sinaimg.cn/large/006tKfTcly1g1hmajn5t8j30ra09imyk.jpg)