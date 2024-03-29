## 操作系统

为什么要有操作系统？

如果没有操作系统，想象下下面的场景如何处理

- 多个软件如何同时运行（多任务的需求）？
- 多个软件如何共同使用计算机上的存储空间（内存管理、文件系统的需求）？
- 多个软件如何共同使用同一个外部设备（设备管理的需求）？
- 多个软件如何相互通讯，如何进行数据交换（进程间通讯、共享内存的需求）？
- 病毒、恶意软件如何治理（安全管理的需求）？

所以操作系统的核心职能就是**软件治理**。而软件治理的一个很重要的部分，就是让多个软件可以共同合理使用计算机的资源，不至于出现争抢的局面

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230821162611975.png" alt="image-20230821162611975" style="zoom:67%;" />

上面是计算机启动的全流程

- 从BIOS开始，可以理解为是硬件的一部分，是写死在硬件上的程序
- 引导区的引导程序，仅仅是非常短的一段代码，作用是把系统控制权交到外置存储上去。这段程序不写在BIOS上是为了可以随时变更
- OS引导程序，操作系统的入口
- OS Shell程序，操作系统最终的用户接口呈现，可以是bash，也可以是图形界面
- 最后就是在sh的基础上运行各个软件



### 内存如何分配

想象下，如果所有软件都同时启动，那么可能会引发以下问题

1. 每个软件都会疯狂吃内存，即使再大的内存也会被软件瓜分，导致后来的软件无法被分配资源（因为操作系统不知道该释放谁的资源）
2. 大家都在共同的物理内存地址下，所以可以非常方便得访问到其他软件占用的地址，从而破坏别的进程，造成巨大的系统风险

为了解决上面的问题，操作系统使用了**保护模式**的内存管理模式

保护模式下，内存访问不再是直接通过物理内存，而是基于**虚拟内存**。虚拟内存模式下，整个内存空间被分成很多个连续的内存页。每个内存页大小是固定的，比如 64K。

这样，每次 CPU 访问某个虚拟内存地址中的数据，它都会先计算出这是要访问哪个内存页，然后 CPU 再通过一个地址映射表，把虚拟的内存地址转为物理的内存地址，然后到这个物理内存地址去读取数据。地址映射表是一个数组，下标是内存页页号，值是该内存页对应的物理内存首地址。

当然，也有可能某一个内存页对应的物理内存地址还不存在，这种情况叫缺页，没法读取数据，这时 CPU 就会发起一个缺页的中断请求。

![image-20230821164050331](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230821164050331.png)

这个缺页的中断请求会被操作系统接管。发生缺页时，操作系统会为这个内存页分配物理的内存，并恢复这个内存页的数据。如果没有空闲的物理内存可以分配，**它就会选择一个最久没有被访问的内存页进行淘汰**。

当然，淘汰前会把这个内存页的数据**保存起来**（外置存储），因为下次 CPU 访问这个被淘汰的内存页时一样会发生缺页中断请求，那时操作系统还要去恢复数据。（**所以逻辑内存页的数量理论上是无限的**）

通过这种机制，系统只需要按需加载程序片段，这样就可以同时跑多个软件了。当内存不足就淘汰最久没被访问的即可

同时，因为是虚拟的逻辑内存地址，软件就无法访问到其它软件的物理地址了，做到了天然的隔离



### 系统调用

可以理解为我们写的代码是如何运行在操作系统上的，说白了就是我们的软件如何才能使用操作系统的能力

而操作系统和我们的软件不是运行在一个进程里的，怎么才能访问呢？

比如我们的代码想要执行一个write操作，我们是无法直接操作内存的，而是要交给操作系统来做。

这里就要用到**中断**这个机制

中断的设计初衷是 CPU 响应硬件设备事件的一个机制。当某个输入输出设备发生了一件需要 CPU 来处理的事情，它就会触发一个中断；但是 CPU 也提供了指令允许软件触发一个中断，我们把它叫**软中断**。

大部分情况下，操作系统的能力通过软中断向我们写的软件开放，这个就是**系统调用**。

即有一个中断向量表，里面就是一个中断类型和其对应的操作系统内核代码的入口k-v结构，当我们需要调用操作系统什么能力时候就去这个表里去找相关的中断来调用。

那我们能不能直接去调用内核函数呢？答案是不能，因为我们的代码是运行在**用户态**，而系统调用的函数是运行在**内核态**。两者是有权限的限制的，不允许用户态直接去执行内核态中的函数

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230823211247351.png" alt="image-20230823211247351" style="zoom:80%;" />

### 多任务

如何用一个CPU核心同时处理多个任务？答案：时间片轮转

这个其实人人都知道，但它是怎么做到任务切换？

#### 执行上下文 

就是指程序执行需要依赖的内置存储， 其实就是**CPU寄存器和RAM（内存）**

其中寄存器数量有限，可以枚举，每次切换任务就是把当前寄存器信息存到内存，然后恢复下一个任务再上一次执行时寄存器的信息的过程

而内存通过保护模式的逻辑内存页，任务之间是做到相互隔离的。当切换任务时，会把接下来用到的内存地址从A执行B，而这AB的地址记录在哪里呢？还是寄存器。

所以**执行上下文的切换，本质就是保存和恢复寄存器的过程**

#### 线程与进程



<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230828225648006.png" alt="image-20230828225648006" style="zoom:50%;" />

进程内的同步和互斥主要是通过以下这些手段

- 锁（Mutex）
- 读写锁（RWMutex）
- 信号量（Semaphore）
- 等待组（WaitGroup）
- 条件变量（Cond）

进程间没有等待组和条件变量，而且并不牢靠，因为一个进程挂掉，可能导致锁没有释放，就导致别的进程饿死

进程间的**资源共享**从传统视角来看主要可以通过

1. 文件系统，但是像iOS有文件沙箱，导致这个策略不可行
2. 剪切板，但容易受到木马攻击

所以实际上一般通过网络来共享数据，比如socket