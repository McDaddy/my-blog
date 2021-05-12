---
title: EsBuildPlugin实测
date: 2020-06-15
tags:
 - webpack
categories:
 - 前端工程化

---

这一篇以为代码实在太少，就一行，所以与其说是实战不如说是实测。

在我们平时本地打生产包的时候，往往要花费大量的时间和内存，时间是本地起watch或者dev服务器的两倍还多，多出来的时间主要就分步在压缩代码的环节上。[彻底告别编译 OOM，用 esbuild 做压缩器](https://zhuanlan.zhihu.com/p/139219361) CC大神的这个新插件给了一些提示。 借此我尝试实测一把

<!-- more -->

直接上对比结果，各跑一次build

TerserPlugin：压缩JS耗时1分39秒

<img src="https://intranetproxy.alipay.com/skylark/lark/0/2020/png/170125/1591857156389-4fe7e975-829b-4d6c-be80-1e4acc1fb59d.png" alt="image.png" style="zoom:67%;" />

EsBuilder：压缩JS耗时12秒， 相比TerserPlugin提速接近88%

<img src="https://intranetproxy.alipay.com/skylark/lark/0/2020/png/170125/1591857122089-2a1a4a1f-ba6c-4e76-9200-b44f2ea1a04b.png" alt="image.png" style="zoom:67%;" />

总耗时，从3分21秒缩短到2分11秒左右，提速35%左右

压缩大小基本没有变化，前后都是32M

<img src="https://intranetproxy.alipay.com/skylark/lark/0/2020/png/170125/1591857356839-fc836c96-cd61-4237-b4a2-bfe479cb5f65.png" alt="image.png" style="zoom:67%;" />

内存方面只是通过观察top命令，前后在打包后期的node占用内存都在1.3个G左右，没有明显的差距，当然这样测试内存不大严谨，可以后续继续观察。

在文章中CC和尤雨溪关于压缩比有所讨论，压缩比可能差距10%左右，但我这边实际测试并没有明显变化