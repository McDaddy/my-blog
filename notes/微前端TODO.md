- [x] 页面接入
- [x] 国际化
- [ ] 环境变量的注入
- [x] 载入的loading过渡
- [x] userInfo的传递
- [ ] 集群切换的通知机制
- [ ] 进入fdp初始化fdp路由，用于当刷新页面时首次加载拿不到路由参数
- [ ] 菜单切换
- [ ] 主题样式如何按需替换









坑

1. 请求子应用静态资源 需要配置nginx转发规则， 否则就会走进父系统的静态文件夹

2. 父系统是https， 子系统需要连WebSocket，且子是http的。 就会报错

![image-20200903135342871](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200903135342871.png)