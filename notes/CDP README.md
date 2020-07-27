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