# Terminus Dice FDP UI



## 简介

此项目为Dice快数据平台的前端工程项目

## 开发准备

### 工具准备

- 浏览器统一为`Chrome`
- `Node` 版本统一12.x
- 编辑器 最新版`vscode`
- `vscode`强制安装的插件
  - `Code Spell Checker` 英文拼写检查
  - `ESLint`
  - vscode需要设置save时自动format代码
- `switch host`或`utools`做手动host切换
- `nginx` 本地调试做反向代理
- `Tunnelblick` 隧道用来连接VPN
- `Docker`用于打包发布镜像（第一次打包前需要登录docker，具体命令见钉钉群公告）
- `iTerm2` （建议）更好用的终端
- `iPaste` （建议）历史粘贴板

### VPN文件下载

由于我们的开发环境都是部署在隔离环境里的，本地访问这些接口都需要连接`VPN`，如何下载文件详见`DICE 前端小组`钉钉群公告。下载完成后手动安装到`Tunnelblick`。下载完记得将下面的123步完成，完成后需要重启下电脑

![image-20210127175006752](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210127175006752.png)

### HTTPS证书本地配置

由于我们的开发环境是开启https的，且UC限制了跳转域名，因此我们本地开发的时候要做到调试的本地url要和线上部署的一致，这里第一步需要借助`switch host`来改变DNS地址指向

```
# dev
127.0.0.1	terminus-org.dev.terminus.io
# test
127.0.0.1 terminus-test-org.test.terminus.io
```

第二步需要创建一个本地的HTTPS证书，具体教程见 [**如何利用自签名证书搞定本地直连https**](https://yuque.antfin-inc.com/dice/zs3zid/na3uvi)

如果配置最后还是被浏览器拦截，可以在键盘输入`thisisunsafe`来绕过

### Nginx配置

在`/usr/local/etc/nginx/nginx.conf`文件底部添加具体的config文件

```nginx
include servers/fdp.config;
```

在`/usr/local/etc/nginx/servers`目录下新建一个`fdp.config`文件， 将如下内容粘贴进去，同时***注意***要将其中`your-*-path`替换成自己本地路径

- your-cert-path 存放HTTPS证书cert文件的目录
- your-project-path `git`工程的目录
- your-log-path 存放log的位置，需要时来的看nginx log

```nginx
upstream fdp_server {
  server openapi.default.svc.cluster.local:9529; # vpn
}

server {
  listen 80;
  listen 443 ssl;

  ssl_certificate /Users/your-cert-path/server.crt;
  ssl_certificate_key /Users/your-cert-path/server.key;

  ssl_protocols TLSv1 TLSv1.1 TLSv1.2;

  # dice
  server_name terminus-org.dev.terminus.io; #dice.test.terminus.io dice2.dev.terminus.io; #配合host绑定
  root /Users/your-project-path/dice-fdp-ui/public; # console

  # individual nginx logs for this web vhost
  access_log  /Users/your-log-path/logs/fdp-access.log;
  error_log   /Users/your-log-path/logs/fdp-error.log;

  set $my_scheme "http";
  if ($http_x_forwarded_proto = "https") {
      set $my_scheme "https";
  }
  
  proxy_buffering off;
  proxy_buffer_size 1k;
  proxy_buffers 24 4k;
  proxy_busy_buffers_size 8k;
  proxy_max_temp_file_size 2048m;
  proxy_temp_file_write_size 32k;
    add_header Access-Control-Allow-Origin *;

  location / {
    index index.html;
    try_files /index.html =404;
    add_header 'Cache-Control' 'no-cache';
    add_header Access-Control-Allow-Origin *;
  }

  location /api {
    proxy_pass              http://fdp_server;
    proxy_set_header        X-Real-IP $remote_addr;
    proxy_set_header        X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header        Host $host;
    proxy_set_header        X-Forwarded-Proto $my_scheme;
  }

  location /api/fdp-websocket {
    proxy_pass              http://fdp_server;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
  }

  #static files
  location ~* ^.*\.(json|svg|jpeg|gif|png|ico|css|zip|tgz|gz|rar|bz2|doc|xls|exe|pdf|ppt|txt|tar|mid|midi|wav|bmp|rtf|js)$ {
    expires 30d;
    add_header 'Cache-Control' 'no-cache';
    add_header Access-Control-Allow-Origin *;
  }
}
```

经过以上步骤，连接VPN， 启动`nginx`，如果没有报错那配置工作就基本完成了。

记得每次切换完host要用[chrome://net-internals/#sockets](chrome://net-internals/#sockets)这个页面刷下DNS缓存，否则要开无痕模式才能生效



## 物料

### 组件库

此项目用到的组件库是公司内部包装的组件库 [NUSI](https://3x.nusi.terminus.io/docs/overview)

如果发现有bug，可以向`NUSI 反馈群`钉钉群反馈

### 设计

设计图地址 [DONE](https://done.alibaba-inc.com/project/O3JC9ES8p8GK/6eQAGNB0Ky7o/filelist?categoryId=all) 如没有权限找相关同学添加

### iconfont

项目中的所有图标都来自`iconfont`下的`CDP`项目，使用时引入`common`模块下的`Icon`组件，将具体icon的名字写在`type`中

```html
<Button type="primary">
	<CustomIcon type="cir-add" className="mr-1" />
</Button>
```

[iconfont地址](https://www.iconfont.cn/manage/index?spm=a313x.7781069.1998910419.12&manage_type=myprojects&projectId=1517355&keyword=&project_type=&page=) 如果没有权限找相关同学开通权限

如果设计同学在`iconfont`项目中加入了新的图标，需要手动更新`iconfont`在项目中的地址

![image-20210119144021868](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20210119144021868.png)

```html
// index.ejs
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Dice FDP</title>
    <meta name="description" content="Dice 快数据平台">
    <link rel="shortcut icon" href="/images/favicon.ico">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="//at.alicdn.com/t/font_1517355_5eiz2b7brd.css">
    <link rel="stylesheet" href="//at.alicdn.com/t/font_1538246_lqjzwtrzzqj.css">
  </head>
  <body>
    <div id="fdp-content" style="height: 100%;"></div>
    <script src="//at.alicdn.com/t/font_1517355_5eiz2b7brd.js" async></script>
    <!--dice-layout-->
    <script src="//at.alicdn.com/t/font_1538246_lqjzwtrzzqj.js" async></script>
  </body>
</html>
```



## 本地安装与调试

1. `npm install`
2. `npm run watch`
3. 浏览器访问对应的地址。e.g. [dev环境](https://terminus-org.dev.terminus.io/fdp/1/data-source) dev的账号密码在前端开发群公告查看



## 项目结构说明

```javasdript
app: src目录
  fdp: 模块名
​    stores: cube-state的store
​    pages: 按页面模块划分，一般按菜单分割
​      components: 页面组件
​    services: api接口层
​    index.js: router配置
  common: 公共模块
```



## 开发规范

- 所有新开发页面强制使用`typescript`，如非特殊情况不得使用`any`
- 文件名统一为全小写`xxx-xxx.tsx/scss/d.ts/ts/js`的形式
- 如非特殊情况，不要写`class`组件，统一使用hooks来管理状态
- 需要自定义hook，先在`react-use`库和`use-hooks`文件中查找是否有可以直接利用的hook
- css样式使用[`tailwind`](https://tailwindcss.com/docs)提供的工具类，涉及颜色的样式类都在`app.scss`中找，如果是组合的公共类型可以提取到`app.scss`，尽量不写单独的新scss文件
- 页面css布局使用`Flex`或`Grid`，尽量不用绝对定位，不得使用`float`来做布局
- 尽量使用`async/await`来替代`promise`的链式写法
- 路由页面级别的组件使用`default`导出
- 非页面根的组件尽量用`React.memo`包一下
- 遇到各种组件先看看项目里有没有类似的实现，如果是个通用的看看是不是可以抽成公共组件
- **确保**提交的代码是eslint no warning no error的
- **不要**滥用全局的状态管理，写调用接口相关代码前，先思考下这个API拿到的数据是否有全局性或共用性，如果没有那就不要走store层
- 写hook尽量保持职责单一性， 如果逻辑复杂可以分开几个hook写
- 如果代码长度很长，可以考虑分割部分组件代码到新文件中
- **不要**拘泥于现有的技术架构和方案，如果有新的想法，做出可以证明提效或提质的demo然后逐步推广



## Git版本管理

- 在开发阶段，从`develop`分支拉分支，按功能统一命名`feature/xxxx`

- 在开发过程中需要拉取develop最新代码合并到`feature`分支，使用`git rebase`命令合并代码

- 开发完成需在`DICE`上提交MR来合并代码，相关人员完成`code review`后合并

- 在提测阶段，从`develop`分支拉取分支，按迭代统一命名`release/x.xx`

- 提测以后修复bug，从`release`分支拉取分支，统一命名`hotfix/xxxx`，修复后同样提MR

- 如果修复的内容需要在多个分支应用，使用`git cherry-pick`命令迁移代码，不要每个分支都手动改一遍

- commit代码**必须**使用`git cz`命令，根据提示选择提交类型并写上提交信息

  

## 全局状态管理

我们使用自主开发基于`React-Hooks`实现的状态管理库 [cube-state](https://github.com/daskyrk/cube-state)，具体代码可参考任意stores目录下的代码

## Service层开发

service的书写可以以`app/fdp/services/queue-manage.ts`为范本。 以配置化的形式来配置api。**注意**api名以驼峰命名并且以http方法开头，具体参考 [API service层的集中管理的思考实践](https://yuque.antfin-inc.com/dice/zs3zid/govqmk)

每开发完一个新的service文件，需要到`app/common/stores/loading.ts`文件里注册一下。

后端接口统一使用`OpenAPI`

## 页面开发

- 页面内`state`，不要用原生`useState`，使用`useUpdate`来管理
- 标准页面组件（除两栏布局页面），使用`PageLayout`在最外层封装
- 如果页面需要过滤表格数据，使用`useFilter`和`CustomFilter`的组合
- 弹窗表单使用`FormBuilderModal`组件
- 在定义state或props的初始值时，如果初始值是空对象，不要设置成`{}`，而要设置null，这样后续就不用手动判断对象`isEmpty`，ts也会自动来提示为空的风险
- **注意**所有的nusi组件都要从`app/nusi.ts`引，不要直接引用`@terminus/nusi`，因为有很多组件需要特殊处理，直接引会有问题
- 控制api loading状态如果直接走service用`useServiceLoading`，如果经过store用`useLoading`
- 做路由跳转统一用`common/utils`中的`goTo`方法，除了父子页面之间跳转，如果跨模块跨层级尽量定义`goTo.pages`常量来跳转



## 国际化

所有开发的新功能都要求全面国际化， 老代码中没有做到国际化的也要顺手加上。

在要国际化的中文外面套上`i18n.s`，第二个参数为命名空间，如果觉得是最常用的那种词可以不加即默认空间，否则目前统一为`fdp`，`webpack`插件会自动翻译中文并更新到`locale`文件中，但每次提交代码前都**必须**要仔细检查`zh.json`和`en.json`两个资源文件更改的内容是否翻译得符合预期

```javascript
import i18n from 'i18n';
...
const title = i18n.s('我是中文标题', 'fdp');
```



## 需求开发流程（参考）

1. 在需求评审中明确开发的内容和目标，注意开发周期的起止时间安排工作量
2. 要求后端同学先出详设文档，尽量文档先行，有设计需求的催设计同学尽快出设计稿
3. 根据后端的设计文档，先定义对象类型，在相关`.d.ts`文件中添加类型定义
4. service层中添加接口
5. 如果需要的话在store层添加相关实现
6. `index.js`添加页面路由
7. `menu.js`中添加菜单信息
8. `pages`中添加页面实现



## 故事线

TODO

计划在代码库中维护`markdown`文档，从前端视角记录每个需求功能点，后续添加

## 微前端

本项目是可以独立打包部署，同时也可以挂载在一个实现[qiankun](https://www.npmjs.com/package/qiankun)接口的父项目上，目前主要是部署在`DICE`上做为一个子项目运行

## 打包发布

1. 使用`npm run release` 命令打包镜像
2. 在dev环境，登陆跳板机替换现有镜像
3. 在test环境，在`DICE`提交version MR，请测试同学更新
4. 在生产环境，在`DICE`提交version MR，发邮件给SRE请求更新
5. 相关命令
   1. `ssh root@xxx.xxx.xxx.xxx`  登陆跳板机
   2. `kubectl get pods | grep ui`  查看所有ui镜像运行部署的状态
   3. `kubectl edit dice dice` 键入这个命令之后会打开整个dice的yml文件，找到dice-fdp-ui来替换镜像
   4. `kubectl logs x > ui.log` 查看部署日志，其中的`x`是第一条查看命令得到的实例编号