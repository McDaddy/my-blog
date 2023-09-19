# 《SRE Google运维解密》读书笔记



### 系统管理员模式

行业内传统的做法是分别研发部门与运维部门，前者负责研发系统，开发业务逻辑，后者负责把新程序发布到生产环境，并维护系统的日常运行。这种做法的弊端：

1. 直接成本。运维团队的大小基本与系统负载成**线性相关**，共同成长。
2. 间接成本。线上问题大部分都与发版相关，研发部门期望“随时随地发布新功能，没有任何阻拦”，运维部门厌恶变化，为发版设置越来越多的门槛、限制，两者存在非常多的**冲突**。

### SRE 方法论

SRE 团队的职责：可用性改进，廷迟优化，性能优化，效率优化，变更管理，监控，紧急事务处理以及容量规划与管理。

1. Google SRE 团队从2003年开始组建，由7名软件工程师组成。到2016年，约1000余人。
2. SRE 团队由两种层次的工程师组成：
   a. 50%-60% 是 Google 标准工程师；；
   b. 40%-50% 是比标准工程师要求低一些的人，但具备其他能力的工程师，如 UNIX 内部细节和1-3层网络知识；
3. SRE 团队成员有如下特点：
   a. 对重复性、手工性的操作天然的排斥感。
   b. 有足够的技术能力快速开发出软件系统以替代人工操作。
4. 避免团队的大小与所服务的产品负载呈线性同步增长：
   a. 负责运维服务的团队必须有足够的时间编程，否则他们会被运维工作淹没；
   b. 传统运维工作包括：工单处理，手工操作等，运维工程师最多只能花**50%**的时间放在传统运维工作；
   c. SRE 管理层需要主动维护每一个 SRE 团队的**工作平衡**；
   d. SRE 团队和研发队员之间的成员可以自由流动，可以获得更全面的体验及知识；
5. 由于 SRE 模型中为了提高可用性需要采取一些与常规做法违背的做法，所以需要**强有力的管理层**支持才能推行下去。

#### 确保长期关注研发工作

- SRE 团队的运维工作限制在50%以内，他们应该将剩余时间花在研发项目上。
- 可采取一些暂时性的措施将过多的运维压力移回给开发团队处理。
- SRE 处理运维工作的一项准则是：在每8~12小时的 on-call 轮值期间最多只处理**两个**紧急事件。
- 所有的产品事故都应该有对应的事后总结，无论有没有触发警报。**事后总结**应该包括以下内容：事故发生、发现、解决的全过程，

#### 在保障服务 SLO 的前提下最大化迭代速度

SLO 应该是业务来定，但是 **SRE 要提供一些信息，告诉业务达成什么样的 SLO 要付出什么样的成本**

SLO 最终是服务于商业目标的！

度量可用性的两种方法

```
// 计算可提供服务百分比
可用性 = 系统正常运行时间 / (系统正常运行时间 + 系统计划外停机时间)
// 如果是全球化部署，只会部分服务不可用，就要计算成功请求的百分比
可用性 = 成功请求数 / 总的请求数
```



##### 错误预算

- 基于用户的使用习惯，服务可靠性要达到什么程度用户才会满意？
- 如果这项服务的可靠程度不够，用户是否有其他的替代选择？

- 考虑服务的可靠程度是否会影响用户对这项服务的使用模式？

从这几个方面，我们就可以推导出“错误预算”。通过引进“错误预算”的概念，我们解决了研发团队和 SRE 团队之间的组织架构冲突。

打个比方，如果99.9%和100%对用户来说没有区别，那么这0.1%就可以作为错误预算用于容错。每次出了问题都会扣除这个预算，直到扣到0，此时就要停下来衡量是否要减慢发版速度，或者重新定义SLO

#### 监控系统

监控系统不应该依赖人来分析警报信息，而是应该由系统自动分析，仅当需要用户执行某种操作时，才需要通知用户。



### 硬件

典型的Google数据中心的拓扑结构：

（a）约10台物理服务器组成了一个机柜（Rack）
（b）数台机柜组成一个机柜排（Row）
（c）一排或多排机柜组成了一个集群（Cluster）
（d）一般来说，一个数据中心（Datacenter）包含多个集群
（e）多个相邻的数据中心组成了一个园区（Campus）



### SLI、SLO、SLA

SLI：服务质量指标，比如 99 分位的响应时间、99 分位的响应时间、错误率等 比如P90 P99
SLO：服务质量目标，所谓的几个 9 的目标，比如 99 分位的响应时间小于 200 毫秒，比如错误率小于 0.1%
SLA：服务质量协议，是个承诺，是个合同，比如公有云就会提供 SLA，不达标就会有赔付



**SLI 应该是一些上层业务或用户关注的体验指标**

- 用户可见的服务系统：可用性、延迟、吞吐。即：是否能正常处理请求？每个请求花费的时间是多少？多少请求可以被处理？
- 存储系统：延迟、可用性、数据持久性。即：读写数据需要多少时间？我们是否可以随时访问数据？一段时间之后数据是否还能被读取？
- 大数据系统：比如数据处理流水线系统，关注吞吐量和端到端延迟。即：处理了多少数据？数据从进来到产出需要多少时间？
- 所有系统都应该关注：正确性。比如是否返回了正确的结果？当然，正确性更关注系统内部的数据而非系统本身，所以SRE通常不会关注这块。

一般 SLI 都是分钟级的汇总，比如成功率是每分钟产出一个值，延迟也是，延迟尽量不要用平均延迟和50分位，会掩盖一些长尾问题，比如下图：

![20230526162220](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/20230526162220.png)

*50th, 85th, 95th, and 99th percentile latencies for a system. Note that the Y-axis has a logarithmic scale.*

从 10:30 开始，长尾请求的延迟变得频繁了，尤其是 99 分位和 95 分位，但是 50 分位的值，几乎不变，如果我们只关注 50 分位的值，就没法发现这个问题了！

#### SLO 可以建立用户预期

通过公布 SLO 可以设置用户对系统行为的预期。为了让用户拥有正确的预期，我们可以考虑使用以下几种策略：

- 留出一定的安全区
- 实际 SLO 也不要过高

### 监控系统

监控系统应该解决两个问题：什么东西出故障了，以及为什么出故障。前者为现象（symptom），后者代表原因。

#### 黑盒监控与白盒监控

黑盒监控与白盒监控最简单的区别是：黑盒监控面向现象的，代表了目前正在发生的，而非预测会发生的问题，即“系统现在有故障”。白盒监控则大量依赖对系统内部信息的检测，如系统日志，抓取提供指标信息的 HTTP 节点等。白盒监控系统因此可以检测到即将发生的问题及哪些重试所掩盖的问题等。

#### 4 个黄金指标

>  监控系统的4个黄金指标分别是延迟、流量、错误和饱和度（saturation）。

##### 饱和度

服务容量有多“满”。通常是系统中目前最为受限的某种资源的某个具体指标的度量。很多系统在达到 100% 利用率之前性能会严重下降，增加一个利用率目标也是很重要的。饱和度也有预警的作用。

为了避免长尾问题，尽量不要用平均值，而是用分布图的方式来分析更直观

### 警报

1. 每当收到紧急警报时，应该**立即**需要我进行某种操作。每天只能进入紧急状态几次，太多会导致“狼来了”效应。
2. 每个紧急报警都应该是**可以具体操作**的。
3. 每个紧急警报的回复都应该**需要某种智力分析**过程。如果某个紧急警报只是需要一个固定的机械操作，那么它就不应该成为紧急警报。
4. 每个紧急警报都应该是**关于某个新问题**的，不应该彼此重叠。



### 集群上线自动化进化遵循这样一个路径

（a）操作人员触发手动操作（无自动化）。 

（b）操作人员编写，系统特定的自动化。 

（c）外部维护的通用自动化。 

（d）内部维护，系统特定的自动化。 

（e）不需要人为干预的自治系统。



### 自动化程序的不同体现在三个方面

（a）能力，即准确性。
（b）延迟，开始执行后，执行所有步骤需要多久。
（c）相关性，自动化所涵盖的实际流程比例。



## 发版管理

### 发布哲学

密闭性：构建工具必须保证一致性和可重复性。即构建是不受构建机器环境影响的，是可以重复执行的，且结果能保持一致的

追求速度：“测试通过即发布”（Push OnGreen）发布模型

强调策略和流程：多层安全和访问控制机制可以确保在发布过程中只有指定的人才能执行指定的操作。



### 持续构建与交付

构建：定义构建目标，即构建的输出结果。为每个目标定义依赖关系，执行具体构建时，也要自动构建全部依赖

分支：一般不使用主分支来做发布，而是用一个基于主分支的release分支来发。每次出现生产Bug，都是在主分支上先修复，然后cherry   pick 到release分支。 这样做是为了避免引入不必要的新改动

测试：主分支更新后，能自动跑单元测试

打包：将目标构建成一个制品，并打上tag

部署：指定某个版本的制品部署到对应环境



## 有效的故障排查手段

通用的故障排查流程如下



![image-20230801111627526](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230801111627526.png)