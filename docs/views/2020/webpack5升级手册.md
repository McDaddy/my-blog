1. webpack5不再内置node模块

![image-20201201151902608](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20201201151902608.png)

2. 需要强制升级的包
   1. webpack
   2. webpack-cli
   3. html-webpack-plugin
   4. webpack-merge
   5. copy-webpack-plugin (需要改配置结构)

3. 退休的包
   1. hard-source-webpack-plugin
   2. happypack

4. webpack对node_modules里面的代码强制要带尾缀![image-20201201160611199](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20201201160611199.png)

解决方法： 安装`@babel/runtime`最新版

5. build报错，解决方法： 倒置mini-css和thread-loader的order

![image-20201201164307493](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20201201164307493.png)

6. thread-loader替代happypack

![image-20201201164951750](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20201201164951750.png)

![image-20201201170209009](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20201201170209009.png)

[官方升级指南](https://webpack.js.org/migrate/5/)

![image-20201204135049889](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20201204135049889.png)

![image-20201208164014361](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20201208164014361.png)

![image-20201223161645416](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20201223161645416.png)

无法使用cnpm