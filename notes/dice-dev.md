## 创建部署前端node应用

问题：

1. 当没有pipeline.yml时新建流水线的提示没有提示功能（已知）

2. 建空的pipeline.yml直接打开会报错，没有默认初始化（已知）

3. 当前没有stage时用图形化添加节点会报错， 已修改代码解决

4. 配置完成发现流水线预检测报错，询问林俊说是后端的extension和pipeline没同步
   <img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200608113200209.png" alt="image-20200608113200209" style="zoom:67%;" />

5. release action的image字段，后端返回type不对，应该是map实际是string，导致图形化显示有问题，反应给林俊，现在已解决
   <img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200608135153445.png" style="zoom:67%;" />

6. 用图形化编辑dice.yml之后，多出了一个`name`字段导致流水线报错，是一个有图形化以来就有的bug，说明这功能确实没人用过，现在通过改前端代码修复
   <img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200608140200142.png" alt="image-20200608140200142" style="zoom:67%;" />
7. 用图形化编辑dice.yml之后，实例数在图形化界面显示是1，但实际保存时就掉了。 已修改前端代码修复
   <img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200608141744084.png" alt="image-20200608141744084" style="zoom:80%;" />
   ![](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200608141812102.png)
8. 部署模式`global`已经被后端废弃，但前端还能配置。已修改前端代码

最后完成的runtime： http://dice.dev.terminus.io/workBench/projects/1/apps/12/deploy/runtimes/6/overview

![image-20200608151047037](/Users/chenweitao/Library/Application Support/typora-user-images/image-20200608151047037.png)

## 创建部署前端spa应用

1. 推了nginx文件之后依然报找不到， 查找原因是复制骏总文档的文件名错了，已更正文档。![image-20200608161243720](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200608161243720.png)

2. 部署时，nginx启动报错
   <img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200608162247037.png" alt="image-20200608162247037" style="zoom:67%;" />
   反复验证nginx文件这一行确实是分号结尾的。最后找到原因是没有在`dice.yml`开头注册这两个参数。 这个问题感觉提示太不友好了，检查问题跑偏了方向，而且流水线会无限跑下去，不会停

最后完成
<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200608164324346.png" alt="image-20200608164324346" style="zoom:67%;" />

在服务列表中

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200608164951535.png" alt="image-20200608164951535" style="zoom:80%;" />

![image-20200608164630511](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200608164630511.png)



## addon的使用

部署过程没有什么问题，只是时间非常长，花了5分11秒才部署好。还在显示部署中的时候，就可以访问成功了

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200608171714513.png" alt="image-20200608171714513" style="zoom:80%;" />![image-20200608171808161](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200608171808161.png)

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200608171714513.png" alt="image-20200608171714513" style="zoom:80%;" />![image-20200608171808161](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200608171808161.png)

<img src="/Users/chenweitao/Library/Application Support/typora-user-images/image-20200608172147740.png" alt="image-20200608172147740" style="zoom:67%;" />



## 微服务的使用

遇到资源不足的问题， log提示还是比较人性化的，当前需要2.6个核，但只有0个核可用

```verilog
2020-06-08 17:34:45(orchestrator) start deploying...
2020-06-08 17:34:45(orchestrator) increasing release reference...
2020-06-08 17:34:45(orchestrator) request addon resources...
2020-06-08 17:34:46(orchestrator) deployment is fail, status: DEPLOYING, phrase: INIT, (failed to request addons, runtimeId 6: The CPU reserved for the project is 1.00 cores, 2.60 cores have been occupied, and the resources for addon are insufficient)
```

解决过程也走了弯路，开始以为是dice.yml里面的核数写太少（之前是0.1核），改大了之后发现还是不行。 询问后端发现还要改整个项目整个可用核的总数 [设置地址](http://terminus-org.dev.terminus.io/orgCenter/projects/1/setting?tabKey=projectInfo)，把这个改大之后，dice.yml里面的核数要小于等于它。

最后结果和文档一致，对nodejs没有生效

