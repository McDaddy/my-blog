## 理论篇

Docker为什么能颠覆早期的PaaS平台？

Docker 项目给 PaaS 世界带来的“降维打击”，其实是提供了一种非常便利的打包机制。这种机制直接打包了**应用运行所需要的整个操作系统**，从而保证了本地环境和云端环境的**高度一致**，避免了用户通过“试错”来匹配两种不同运行环境之间差异的痛苦过程。而这一切的核心就是**Docker镜像**



### 什么是容器？

容器其实是一种**沙盒技术**。顾名思义，沙盒就是能够像一个集装箱一样，把你的应用“装”起来的技术。这样，应用与应用之间，就因为有了边界而不至于相互干扰；而被装进集装箱的应用，也可以被方便地搬来搬去



### 那么容器该怎么实现？

> 第一个要解决的问题是如何实现容器其实就是如何实现应用之间的**边界**。

一个应用可以简单理解为一个计算机中的进程，而一个进程就是**一个程序在计算机中运行起来的执行环境（数据和状态）的总和**。

**容器技术的核心功能，就是通过约束和修改进程的动态表现，从而为其创造出一个“边界”。**

对于 Docker 等大多数 Linux 容器来说，**Cgroups 技术**是用来制造约束的主要手段，而**Namespace 技术**则是用来修改进程视图的主要方法

**Namespace机制**：它其实只是 Linux 创建新进程的一个可选参数。在 Linux 系统中创建线程的系统调用是 clone()，比如：

```
int pid = clone(main_function, stack_size, SIGCHLD, NULL); 
```

这个系统调用就会为我们创建一个新的进程，并且返回它的进程号 pid。而当我们用 clone() 系统调用创建一个新进程时，就可以在参数中指定 CLONE_NEWPID 参数，比如：

```
int pid = clone(main_function, stack_size, CLONE_NEWPID | SIGCHLD, NULL); 
```

这个新建出来的进程的pid就是1，虽然在实际的宿主机里，这个进程可能是100

所以Namespace技术本质就是一个**障眼法**。而容器其实只是一种特殊的进程。实际上在宿主机上并没有一个**真正的**Docker容器在运行，Docker 项目帮助用户启动的，还是原来的应用进程，只不过在创建这些进程时，Docker 为它们加上了各种各样的 Namespace 参数。基于这点，所以称Docker是一种**轻量级**的虚拟化技术，其实就是对比虚拟机得来



<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230528162557445.png" alt="image-20230528162557445" style="zoom:33%;" />

这张图可以清晰得体现出Docker对比传统虚拟机的**优势**

因为虚拟机必须通过Hypervisor来创建真实的虚拟机，而每个虚拟机都需要一个完整真实的Guest OS，然后才能执行用户的程序，这里面的额外资源**开销**必然是更多的

相比下，容器化仅仅是通过上面的障眼法做逻辑上的隔离，也不需要独立的操作系统，因此基本是没有任何额外开销的

但是仅仅有Namespace肯定是不够的，因为这样**隔离得不彻底。**

- 首先，既然容器只是运行在宿主机上的一种特殊的进程，那么多个容器之间使用的就还是**同一个宿主机的操作系统内核**。
  所以不可能在linux内核的宿主机上跑windows的容器，反之亦然。甚至Linux内核有高低版本差的情况也可能不能跑
- 其次，在 Linux 内核中，有很多资源和对象是不能被 Namespace 化的，最典型的例子就是：时间。
  因为共享了宿主机的时间，所以一旦某个容器改了时间，那么整个宿主机的时间也会随之被改变，这就是不符合预期的了。如果在生产环境上暴露了容器，那么将是非常大的安全隐患



>  接下来第二个要解决的问题是**限制**

一个Docker进程实际上是与宿主机上别的进程共享资源的，如何保证它所需的资源不受侵占？这是一个沙盒必须要有的功能

**Linux Cgroups 就是 Linux 内核中用来为进程设置资源限制的一个重要功能。**

**Linux Cgroups 的全称是 Linux Control Group。它最主要的作用，就是限制一个进程组能够使用的资源上限，包括 CPU、内存、磁盘、网络带宽等等。简单粗暴地理解呢，它就是一个子系统目录加上一组资源限制文件的组合**。



在 Linux 中，Cgroups 给用户暴露出来的操作接口是文件系统，即它以文件和目录的方式组织在操作系统的 /sys/fs/cgroup 路径下

![image-20230528211431027](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230528211431027.png)

可以看到，在 /sys/fs/cgroup 下面有很多诸如 cpuset、cpu、 memory 这样的子目录，也叫子系统。这些都是这台机器当前可以被 Cgroups 进行限制的**资源种类**。而在子系统对应的资源种类下，就可以看到该类资源具体可以被限制的方法。

![image-20230528211628399](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230528211628399.png)

以CPU为例，通过修改cfs_period 和 cfs_quota 这样的关键词，可以用来限制进程在长度为 cfs_period 的一段时间内，只能被分配到总量为 cfs_quota 的 CPU 时间

```bash
# 先在cpu下新建一个container分组

$ cat /sys/fs/cgroup/cpu/container/cpu.cfs_quota_us 
-1  # cfs_quota 默认-1表示没有CPU限制
$ cat /sys/fs/cgroup/cpu/container/cpu.cfs_period_us 
100000 # cfs_period 默认是100 ms（100000 us）

$ echo 20000 > /sys/fs/cgroup/cpu/container/cpu.cfs_quota_us # 表示单位cfs_period中只能使用20ms的CPU
$ echo 226 > /sys/fs/cgroup/cpu/container/tasks  # 把进程PID加入到这个组的tasks里面
#最后就会发现这个进程无论怎么死循环，最多只能占用20%的CPU资源
```

这样就能做到对资源的限制了

但cgroup的限制还是有限的，比如对**/proc**目录，它是用来记录当前内核运行状态的一系列特殊文件。用户可以通过访问这些文件，查看系统以及当前正在运行的进程的信息，比如 CPU 使用情况、内存占用率等，这些文件也是 top 指令查看系统信息的主要数据来源。

在容器中使用top命令可以看到和宿主机一样的CPU和内存信息。原因是**/proc 文件系统不了解 Cgroups 限制的存在**。

### 为什么进入容器看不到宿主机的文件目录？

同上，还是Namespace起的作用，上面的Namespace是创建一个PID为1的新进程，让容器以为自己是根进程，这次用到的是**Mount Namespace**，作用就是在挂载目录时，利用**chroot**或(pivot_root)这个命令，把根目录从宿主机的根换成了镜像中操作系统的根

**这个挂载在容器根目录上、用来为容器进程提供隔离后执行环境的文件系统，就是所谓的“容器镜像”。它还有一个更为专业的名字，叫作：rootfs（根文件系统）**

所以对 Docker 项目来说，它最核心的原理实际上就是为待创建的用户进程：

1. 启用 Linux Namespace 配置；
2. 设置指定的 Cgroups 参数；
3. 切换进程的根目录（Change Root）

**rootfs 只是一个操作系统所包含的文件、配置和目录，并不包括操作系统内核。** rootfs是解决云端和本地环境一致性的主要手段，**由于 rootfs 里打包的不只是应用，而是整个操作系统的文件和目录，也就意味着，应用以及它运行所需要的所有依赖，都被封装在了一起。**

Docker的一大好处是，每次修改镜像的内容，并不需要从头保存镜像的内容，而是增量保存

每个镜像其实都是分layer做增量的

```
$ docker image inspect ubuntu:latest
...
     "RootFS": {
      "Type": "layers",
      "Layers": [
        "sha256:f49017d4d5ce9c0f544c...",
        "sha256:8f2b771487e9d6354080...",
        "sha256:ccd4d61916aaa2159429...",
        "sha256:c01d74f99de40e097c73...",
        "sha256:268a067217b5fe78e000..."
      ]
    }
```



<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230528223606903.png" alt="image-20230528223606903" style="zoom: 33%;" />

每个镜像都分为三个部分

- 只读层：ro+wh，即 readonly+whiteout。这些层，都以增量的方式分别包含了操作系统的一部分。
- 可读写层：在没有写入文件之前，这个目录是空的。而一旦在容器里做了写操作，修改产生的内容就会以增量的方式出现在这个层中。如果要删除只读层里的一个文件呢？

比如，你要删除只读层里一个名叫 foo 的文件，那么这个删除操作实际上是在可读写层创建了一个名叫.wh.foo 的文件。这样，当这两个层被联合挂载之后，foo 文件就会被.wh.foo 文件“遮挡”起来，“消失”了。这个功能，就是“ro+wh”的挂载方式，即只读 +whiteout 的含义。我喜欢把 whiteout 形象地翻译为：“白障”。

- Init层：Init 层是 Docker 项目单独生成的一个内部层，专门用来存放 /etc/hosts、/etc/resolv.conf 等信息，需要这样一层的原因是，这些文件本来属于只读的 Ubuntu 镜像的一部分，但是用户往往需要在启动容器时写入一些指定的值比如 hostname，所以就需要在可读写层对它们进行修改。可是，这些修改往往只对当前的容器有效，我们并不希望执行 docker commit 时，把这些信息连同可读写层一起提交掉。

### docker exec 是怎么做到进入容器里的？

可以通过docker ps得到容器ID，再通过docker inspect 拿到容器的运行时具体信息，比如它的真实PID。

每个进程在`/proc`下都有一个对应的文件夹，一个进程的每种 Linux Namespace，都在它对应的 /proc/[进程号]/ns 下有一个对应的虚拟文件，并且链接到一个真实的 Namespace 文件上。

![image-20230530002555868](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230530002555868.png)

可以利用一个Linux的系统调用`setns() `，它接受两个参数，一个是进程的Namespace文件描述符fd，第二个是要在这个Namespace里运行的进程，比如/bin/sh

所以我们在`docker exec -it xxxx /bin/sh` 时，就等于是讲/bin/sh这个进程附加到这个运行中的容器的Namespace中，这样执行出来的结果就是之前障眼法后的环境了。这样也就等于进入了容器



### 什么是控制器模式？

控制器模式是为了统一地实现对各种不同的对象或者资源进行的编排操作而实现的设计方法。也可以称为**控制循环**

使用伪代码表示如下

```
for {
  实际状态 := 获取集群中对象 X 的实际状态（Actual State）
  期望状态 := 获取集群中对象 X 的期望状态（Desired State）
  if 实际状态 == 期望状态{
    什么都不做
  } else {
    执行编排动作，将实际状态调整为期望状态
  }
}
```

实际状态：k8s收集到的资源的当前状态

期望状态：YAML文件中定义的状态

当两者相同时什么也不做，当两者不同时执行增删改操作

一个控制器分为两部分，即控制方和被控制方

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230605165457749.png" alt="image-20230605165457749" style="zoom:33%;" />

这种模式和**事件驱动**最大的区别就是事件驱动是一次性的行为，如果操作失败了就很难控制。而控制器模式因为是声明式的定义会一直循环，直到符合期望为止。**注意**上面的伪代码其实是一个无限循环，所以k8s可以帮助我们去监控资源的状态， 而不需要我们手动去触发事件



### 什么是声明式API

这里的API其实指的是API对象

- 首先，所谓“声明式”，指的就是我只需要提交一个定义好的 **API 对象**来“声明”，我所期望的状态是什么样子。
- 其次，“声明式 API”允许有多个 API 写端，以 *PATCH* 的方式对 API 对象进行修改，而无需关心本地原始 YAML 文件的内容。
- 最后，也是最重要的，有了上述两个能力，Kubernetes 项目才可以基于对 API 对象的增、删、改、查，在完全无需外界干预的情况下，完成对“实际状态”和“期望状态”的调谐（Reconcile）过程。

说白了就是通过控制器模式，只要设定了期望的结果，那么k8s就会自动帮助我们达到这个预期，不论是新建还是修改都可以通过`kubectl apply `来通知api-server我的预期是什么



### CRD

Custom Resource Definition。指的是允许用户在 Kubernetes 中添加一个跟 Pod、Node 类似的、新的 API 资源类型，即：自定义 API 资源。



## 安装Dokcer

在**CentOS 7**中安装Dokcer步骤

1. 添加yum的源

```shell
yum-config-manager --add-repo http://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo（阿里仓库）
```

如果没有`yum-config-manager`命令的需要先安装

```shell
yum install -y yum-utils device-mapper-persistent-data lvm2
```

2. 查看可用版本有哪些

```shell
yum list docker-ce --showduplicates | sort -r
```

得到下面的结果

![image-20230504120547213](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230504120547213.png)

3. 挑选一个版本安装，直到显示Complete!

```shell
yum -y install docker-ce-18.03.1.ce
```

4. 启动Docker并配置开机启动

```shell
systemctl start docker
systemctl enable docker # 开机启动
```

5. 验证结果，得到如下结果即为成功

```shell
docker version
```

![image-20230504120830026](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230504120830026.png)



## 安装k8s

### Kubeadm

kubeadm是一个由社区推动的，用于简化k8s安转的项目

`kubeadm init` 做了哪些工作？

- 环境检查：主要检查Linux内核版本，cgroups是否可用，是否安装了docker，端口是否可用等一系列问题
- 生成证书：生成k8s对外提供服务的各种证书和目录，因为k8s暴露出去的服务都是需要https访问的，所以就需要预先生成好证书
- 生成访问`kube-apiserver`所需的配置文件：即`/etc/kubernetes/xxx.conf`

```bash
ls /etc/kubernetes/
admin.conf  controller-manager.conf  kubelet.conf  scheduler.conf
```

这些文件就是记录上Master节点的各种信息外加上面生成的证书信息，这样如`scheduler/kubelet`等组件就可以直接读这些配置，用来和apiserver建立安全连接

- 为Master组件生成Pod配置文件：这里指kube-apiserver、kube-controller-manager、kube-scheduler。会把相关的配置yaml放在/etc/kubernetes/manifests中，等到kubelet启动后就会自动部署
- 为集群生成一个bootstrap Tooken，用来给Worker节点加入时使用
- 安装默认插件： kube-proxy 和 DNS 这两个插件



1. 开始前如果有防火墙需要先关闭，需要时也要执行后续的操作

```shell
# 关闭防火墙
systemctl stop firewalld
systemctl disable firewalld

# 关闭selinux
sed -i 's/enforcing/disabled/' /etc/selinux/config  # 永久
setenforce 0  # 临时

# 关闭swap
swapoff -a  # 临时
sed -ri 's/.*swap.*/#&/' /etc/fstab    # 永久

# 关闭完swap后，一定要重启一下虚拟机！！！
# 根据规划设置主机名
hostnamectl set-hostname <hostname>

# 在master添加hosts
cat >> /etc/hosts << EOF
192.168.113.120 k8s-master
192.168.113.121 k8s-node1
192.168.113.122 k8s-node2
EOF


# 将桥接的IPv4流量传递到iptables的链
cat > /etc/sysctl.d/k8s.conf << EOF
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
EOF

sysctl --system  # 生效


# 时间同步
yum install ntpdate -y
ntpdate time.windows.com
```

2. 设置阿里云yum源

```
cat > /etc/yum.repos.d/kubernetes.repo << EOF
[kubernetes]
name=Kubernetes
baseurl=https://mirrors.aliyun.com/kubernetes/yum/repos/kubernetes-el7-x86_64
enabled=1
gpgcheck=0
repo_gpgcheck=0

gpgkey=https://mirrors.aliyun.com/kubernetes/yum/doc/yum-key.gpg https://mirrors.aliyun.com/kubernetes/yum/doc/rpm-package-key.gpg
EOF
```

3. 安装 kubeadm、kubelet、kubectl

```shell
yum install -y kubelet-1.23.6 kubeadm-1.23.6 kubectl-1.23.6

systemctl enable kubelet # 自启动

# 配置关闭 Docker 的 cgroups，修改 /etc/docker/daemon.json，加入以下内容
"exec-opts": ["native.cgroupdriver=systemd"]

# 重启 docker
systemctl daemon-reload
systemctl restart docker
```

### 部署k8s Master

执行下面的命令

```shell
kubeadm init \
      --apiserver-advertise-address=<本机ip> \
      --image-repository registry.aliyuncs.com/google_containers \
      --kubernetes-version v1.23.6 \
      --service-cidr=10.96.0.0/12 \
      --pod-network-cidr=10.244.0.0/16
```

最后得到这样的日志就表示初始化成功了

![image-20230504151612130](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230504151612130.png)

然后执行图中的三句命令

```shell
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

此时，执行命令`kubectl get nodes`应该可以得到如下节点信息

![image-20230504151744056](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230504151744056.png)

如果显示的是如下的信息，说明kubelet没有启动，可以通过查看服务运行状态来判断启动情况

![image-20230504151914051](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230504151914051.png)

使用命令`systemctl status kubelet`，下图表示kubelet并没有启动

![image-20230504152008934](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230504152008934.png)

使用命令`systemctl start kubelet`启动kubelet，然后再次查看

![image-20230504152117236](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230504152117236.png)

### 加入Node节点

首先要在Master上执行下面的命令，获得加入集群的command

```shell
kubeadm token create --print-join-command 
```

把输出的结果直接在node上运行，此时再执行`kubectl get nodes`就能得到一主一从的两个节点了

![image-20230504154326766](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230504154326766.png)

### 安装网络组件

经过上面的步骤，虽然节点都加入了，但是都是**NotReady**的状态，原因是有部分pod没有启动成功（Pending状态的pod）

我们可以通过`kubectl get pods -n kube-system`来查看`kube-system`空间下的pod运行情况

![image-20230504160027556](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230504160027556.png)

这两个没启动的原因是因为没有安装网络组件

```shell
# 随便找一个文件夹，下载这个文件
curl https://docs.projectcalico.org/v3.16/manifests/calico.yaml -O

# vim calico.yaml 把里面的CALICO_IPV4POOL_CIDR参数换成刚才kubeadm init时传入的service-cidr

# 删除镜像 docker.io/ 前缀，避免下载过慢导致失败
sed -i 's#docker.io/##g' calico.yaml

kubectl apply -f calico.yaml 
```

经过这波操作，所有的kube-system下的pods就都启动成功了

![image-20230504162100593](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230504162100593.png)

### 验证k8s集群

通过下面的命令，快速在默认空间下创建一个nginx服务

```shell
kubectl create deployment nginx --image=nginx # 创建nginx的部署
kubectl expose deployment nginx --port=80 --type=NodePort # 暴露端口
kubectl get pod,svc # 查看pod和服务
```

可以看到有nginx的pod和svc被创建

![image-20230504162901086](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230504162901086.png)

此时我们用Master或者Node的ip + 32738端口就可以访问到这个nginx的服务了

![image-20230504162947782](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230504162947782.png)



## kubectl

![image-20230504165152591](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230504165152591.png)

kubectl的**所有命令本质上**都是向Master的**api-server**发起一个**REST**的请求

### 在任意节点使用kubectl

此刻我们在Node节点使用`kubectl get nodes`发现是会报错的

![image-20230504164913404](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230504164913404.png)

根据上图我们知道所有的kubectl命令***本质***都是发起了一个**restful**的请求，那我们就必须知道这个请求应该往哪里发，而现在Node节点并没有这个信息，解决问题的方法就是把在Master节点做`kubeadm init`时创建的`/etc/kubernetes/admin.conf`拷贝到Node节点上去，因为这个文件里包含了这个地址信息

![image-20230504165528864](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230504165528864.png)

通过命令，完成跨机器拷贝。然后把配置export到**KUBECONFIG**环境变量中

```shell
scp /etc/kubernetes/admin.conf root@k8s-node1:/etc/kubernetes

echo "export KUBECONFIG=/etc/kubernetes/admin.conf" >> ~/.bash_profile
source ~/.bash_profile
```

经过这波操作，在Node节点上也可以执行相同的kubectl命令了

### 资源类型与别名

| 资源类型                   | 缩写别名 |
| :------------------------- | :------- |
| `clusters`                 |          |
| `componentstatuses`        | `cs`     |
| `configmaps`               | `cm`     |
| `daemonsets`               | `ds`     |
| `deployments`              | `deploy` |
| `endpoints`                | `ep`     |
| `event`                    | `ev`     |
| `horizontalpodautoscalers` | `hpa`    |
| `ingresses`                | `ing`    |
| `jobs`                     |          |
| `limitranges`              | `limits` |
| `namespaces`               | `ns`     |
| `networkpolicies`          |          |
| `nodes`                    | `no`     |
| `statefulsets`             |          |
| `persistentvolumeclaims`   | `pvc`    |
| `persistentvolumes`        | `pv`     |
| `pods`                     | `po`     |
| `podsecuritypolicies`      | `psp`    |
| `podtemplates`             |          |
| `replicasets`              | `rs`     |
| `replicationcontrollers`   | `rc`     |
| `resourcequotas`           | `quota`  |
| `cronjob`                  |          |
| `secrets`                  |          |
| `serviceaccount`           | `sa`     |
| `services`                 | `svc`    |
| `storageclasses`           |          |
| `thirdpartyresources`      |          |

### 格式化输出

| 作用                     | 命令    |
| ------------------------ | ------- |
| 输出 json 格式           | -o json |
| 仅打印资源名称           | -o name |
| 以纯文本格式输出所有信息 | -o wide |
| 输出 yaml 格式           | -o yaml |

### 

### create

创建对象

```shell
$ kubectl create -f ./my-manifest.yaml           # 创建资源
$ kubectl create -f ./my1.yaml -f ./my2.yaml     # 使用多个文件创建资源
$ kubectl create -f ./dir                        # 使用目录下的所有清单文件来创建资源
$ kubectl create -f https://git.io/vPieo         # 使用 url 来创建资源
# 根据重启次数排序列出 pod
$ kubectl get pods --sort-by='.status.containerStatuses[0].restartCount'

# 获取所有具有 app=cassandra 的 pod 中的 version 标签
$ kubectl get pods --selector=app=cassandra rc -o \
  jsonpath='{.items[*].metadata.labels.version}'
  
# 获取所有节点的 ExternalIP
$ kubectl get nodes -o jsonpath='{.items[*].status.addresses[?(@.type=="ExternalIP")].address}'
```



### get

显示和查找资源

```shell
$ kubectl get nodes                             # 列出所有节点
$ kubectl get services                          # 列出所有 namespace 中的所有 service
$ kubectl get rs                          # 列出replicaSet
$ kubectl get pods --all-namespaces             # 列出所有 namespace 中的所有 pod
$ kubectl get pods -o wide                      # 列出所有 pod 并显示详细信息
$ kubectl get deploy my-dep                 # 列出指定 deployment
$ kubectl get pods --include-uninitialized      # 列出该 namespace 中的所有 pod 包括未初始化的
$ kubectl get pods -w                           # watch 相当于持续监听 
```

### describe

使用详细输出来描述命令

```shell
$ kubectl describe nodes my-node
$ kubectl describe pods my-pod
```

### scale

扩缩容资源

```shell
$ kubectl scale --replicas=3 rs/foo                                 # Scale a replicaset named 'foo' to 3
$ kubectl scale --replicas=3 -f foo.yaml                            # Scale a resource specified in "foo.yaml" to 3
$ kubectl scale --current-replicas=2 --replicas=3 deployment/mysql  # If the deployment named mysql's current size is 2, scale mysql to 3
$ kubectl scale --replicas=5 rc/foo rc/bar rc/baz                   # Scale multiple replication controllers
```

### delete

删除资源

```shell
$ kubectl delete -f ./pod.json                                              # 删除 pod.json 文件中定义的类型和名称的 pod
$ kubectl delete pod,service baz foo                                        # 删除名为“baz”的 pod 和名为“foo”的 service
$ kubectl delete pods,services -l name=myLabel                              # 删除具有 name=myLabel 标签的 pod 和 serivce
$ kubectl delete pods,services -l name=myLabel --include-uninitialized      # 删除具有 name=myLabel 标签的 pod 和 service，包括尚未初始化的
$ kubectl -n my-ns delete po,svc --all                                      # 删除 my-ns namespace 下的所有 pod 和 serivce，包括尚未初始化的
```

### logs

```bash
kubectl logs pod-id
```





## Pod

典型的pod资源文件

```yaml
apiVersion: v1 # api 文档版本
kind: Pod  # 资源对象类型，也可以配置为像Deployment、StatefulSet这一类的对象
metadata: # Pod 相关的元数据，用于描述 Pod 的数据
  name: nginx-demo # Pod 的名称
  labels: # 定义 Pod 的标签
    type: app # 自定义 label 标签，名字为 type，值为 app
    test: 1.0.0 # 自定义 label 标签，描述 Pod 版本号
  namespace: 'default' # 命名空间的配置
spec: # 期望 Pod 按照这里面的描述进行创建
  containers: # 对于 Pod 中的容器描述
  - name: nginx # 容器的名称
    image: nginx:1.7.9 # 指定容器的镜像
    imagePullPolicy: IfNotPresent # 镜像拉取策略，指定如果本地有就用本地的，如果没有就拉取远程的
    command: # 指定容器启动时执行的命令
    - nginx
    - -g
    - 'daemon off;' # nginx -g 'daemon off;'
    workingDir: /usr/share/nginx/html # 定义容器启动后的工作目录
    ports:
    - name: http # 端口名称
      containerPort: 80 # 描述容器内要暴露什么端口
      protocol: TCP # 描述该端口是基于哪种协议通信的
    - env: # 环境变量
      name: JVM_OPTS # 环境变量名称
      value: '-Xms128m -Xmx128m' # 环境变量的值
    reousrces:
      requests: # 最少需要多少资源
        cpu: 100m # 限制 cpu 最少使用 0.1 个核心
        memory: 128Mi # 限制内存最少使用 128兆
      limits: # 最多可以用多少资源
        cpu: 200m # 限制 cpu 最多使用 0.2 个核心
        memory: 256Mi # 限制 最多使用 256兆
  restartPolicy: OnFailure # 重启策略，只有失败的情况才会重启
```

### 为什么需要Pod

为什么需要Pod这个概念，Pod是k8s中最小的API对象，为什么不是直接去管理容器？

我们可以把镜像想象成一个`.exe`可执行程序，当双击执行之后它就变成了一个**进程**，而管理这些进程的k8s就是**操作系统**

在真实操作系统中有一个**进程组**的概念，就是指某一群进程他们是强相关的，必须部署在一起。 而在容器间也会有这样的需求，

比如说：有三个容器必须部署在同一台节点运行，且各种需要2G内存，目前只有有两个节点，一个有5G内存，一个有6G，所有我们单独控制容器，那么就会把三个容器依次部署到节点1，最后发现资源不足，然后只能回滚去尝试第二个节点，这就非常麻烦且浪费资源。如果我们能把它们打包，一开始就知道需要6G的内存，那么就会直接找到节点2来部署。

**这个打包的概念其实就是Pod**。一个Pod可以包含一个到多个容器，它主要有以下几个优点

1. 可以让Pod中的容器们直接用localhost进行通信，不需要考虑网络问题。一个Pod只有一个IP，所有的网络资源都是容器间共享的
2. 可以让容器们共享volume
3. 可以让容器们共享各种Linux Namespace

### Pod 的实现原理

Pod其实是一个**逻辑概念**，这个和容器是类似的，k8s处理的本质还是各种Namespace和Cgroups，并不存在真实的Pod边界或者隔离环境

Pod的**本质**是**一组**共享了某些资源的**容器**

在k8s中Pod的实现是需要使用一个**中间容器**的，这个容器叫作 Infra 容器。在这个 Pod 中，Infra 容器永远都是第一个被创建的容器，其他用户定义的容器都是通过`Join Network Namespace` 的方式，与 Infra 容器关联在一起。Infra容器的景象是`k8s.gcr.io/pause`

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230602144553482.png" alt="image-20230602144553482" style="zoom:33%;" />

Infra容器相当于是Hold住了一个Network Namespace，其他用户容器加入后，大家就共享了这个Namespace，所有容器的网络环境是一致的。

对于用户容器来说，可以理解为所有的进出流量都是通过Infra来完成的。而Pod的生命周期也是和Infra一致的，与用户容器无关

### 单进程模式

一个容器本质就是一个**进程**，或者说是**单进程模式**。

并不是说一个容器里只能运行一个进程，而是说一个容器必然是通过EntryPoint + CMD启动的，容器的状态(运行中/失败/等)都是依据这个PID=1的进程来决定的，假如我们通过docker exec进入容器又启动了一个新的进程比如nginx，那么这个nginx不论它是成功还是报错，从容器外部都是**无法感知**的。

因此往往各个实际应用进程都会被包装成独立容器（image），可以细粒度得去管控各个进程的状态。

### Sidecar

想象一个场景，我们需要一个Tomcat容器来发布一个War包，这个War包是不断更新的

如果通过Docker可能有两种方案

1. 把War放在Tomcat的镜像中，重新打包。这样就每次更新都要重新发布整体镜像
2. 只发布Tomcat镜像，通过volume去挂载War。虽然这样可以动态更新War，但是在分布式的架构下，就要保证每个节点都上挂载相同的文件，那样也是很难实现的

通过Pod我们就可以很简单得解决这个问题

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: javaweb-2
spec:
  initContainers:
  - image: geektime/sample:v2
    name: war
    command: ["cp", "/sample.war", "/app"]
    volumeMounts:
    - mountPath: /app
      name: app-volume
  containers:
  - image: geektime/tomcat:7.0
    name: tomcat
    command: ["sh","-c","/root/apache-tomcat-7.0.42-v2/bin/start.sh"]
    volumeMounts:
    - mountPath: /root/apache-tomcat-7.0.42-v2/webapps
      name: app-volume
    ports:
    - containerPort: 8080
      hostPort: 8001 
  volumes:
  - name: app-volume
    emptyDir: {}
```

在一个Pod中配置两个容器

**initContainer**： 配置和container基本一样，**区别是它会先于containter启动，而且是顺序的。只有当它启动完成并退出，container才会开始启动**

通过这个InitContainer，这个镜像里面就包含最新的War，它所做的就是复制这个War到volume里

等到container启动，它会发现volume里面已经有War存在了，**因为volume是共享的**。然后就可以顺利启动了

这种方式就可以每次更新只发布一个war的镜像即可。这就是通过**组合**实现了Tomcat与War的解耦

这个所谓的“组合”操作，正是容器设计模式里最常用的一种模式，它的名字叫：**sidecar**。sidecar 指的就是我们可以在一个 Pod 中，启动一个辅助容器，来完成一些独立于主进程（主容器）之外的工作。

### 主要配置

**凡是调度、网络、存储，以及安全相关的属性，基本上是 Pod 级别的。**

**NodeSelector：**是一个供用户将 Pod 与 Node 进行绑定的字段，如下就是Pod只能部署在有disktype=ssd这个标签的节点上

```yaml
apiVersion: v1
kind: Pod
...
spec:
 nodeSelector:
   disktype: ssd
```

**HostAliases：定义了 Pod 的 hosts 文件（比如 /etc/hosts）里的内容**

```
apiVersion: v1
kind: Pod
...
spec:
  hostAliases:
  - ip: "10.1.2.3"
    hostnames:
    - "foo.remote"
    - "bar.remote"
...

cat /etc/hosts
# Kubernetes-managed hosts file.
127.0.0.1 localhost
...
10.244.135.10 hostaliases-pod
10.1.2.3 foo.remote
10.1.2.3 bar.remote
```

**ImagePullPolicy**

默认是Always，而如果它的值被定义为 Never 或者 IfNotPresent，则意味着 Pod 永远不会主动拉取这个镜像，或者只在宿主机上不存在这个镜像时才拉取。

**lifecycle**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: lifecycle-demo
spec:
  containers:
  - name: lifecycle-demo-container
    image: nginx
    lifecycle:
      postStart:
        exec:
          command: ["/bin/sh", "-c", "echo Hello from the postStart handler > /usr/share/message"]
      preStop:
        exec:
          command: ["/usr/sbin/nginx","-s","quit"]
```

postStart: 指的是在容器启动后，立刻执行一个指定的操作。需要明确的是，postStart 定义的操作，虽然是在 Docker 容器 ENTRYPOINT 执行之后，但它并不严格保证顺序。也就是说，在 postStart 启动时，ENTRYPOINT 有可能还没有结束。如果执行失败，容器也会启动失败

preStop： 发生的时机，则是容器被杀死之前（比如，收到了 SIGKILL 信号）。而需要明确的是，preStop 操作的执行，是同步的。所以，它会阻塞当前的容器杀死流程，直到这个 Hook 定义操作完成之后，才允许容器被杀死，这跟 postStart 不一样。

### Status

- Pending：Pod 的 YAML 文件已经提交给了 Kubernetes，API 对象已经被创建并保存在 Etcd 当中。但是，这个 Pod 里有些容器因为某种原因而不能被顺利创建。比如，调度不成功。
- Runing：Pod 已经调度成功，跟一个具体的节点绑定。它包含的容器都已经创建成功，并且至少有一个正在运行中
- Succeeded： Pod 里的所有容器都正常运行完毕，并且已经退出了。这种情况在运行一次性任务时最为常见。
- Failed： Pod 里至少有一个容器以不正常的状态（非 0 的返回码）退出。可以通过describe命令查看Events或者logs命令查看日志
- Unknown： 异常状态，意味着 Pod 的状态不能持续地被 kubelet 汇报给 kube-apiserver，这很有可能是主从节点（Master 和 Kubelet）间的通信出现了问题。

### 恢复策略

- Always：在任何情况下，只要容器不在运行状态，就自动重启容器；
- OnFailure: 只在容器 异常时才自动重启容器；
- Never: 从来不重启容器。



### 探针

探针的主要意义是容器的Running状态不能代表应用是正常启动的，需要通过这种测试的方法来确定容器的状态

#### startupProbe

k8s 1.16 版本新增的探针，用于判断应用程序是否已经启动了。

当配置了 startupProbe 后，会先禁用其他探针，直到 startupProbe 成功后，其他探针才会继续。

作用：由于有时候不能准确预估应用一定是多长时间启动成功，因此配置另外两种方式不方便配置初始化时长来检测，而配置了 statupProbe 后，只有在应用启动成功了，才会执行另外两种探针，可以更加方便的结合使用另外两种探针使用。

可以通过几种方式来配置

- httpGet

如果接口返回的状态码在 200~400 之间，则认为容器健康

```yaml
startupProbe:
  httpGet:
    path: /api/startup
    port: 80
    scheme: HTTP  # 可以指定协议
    httpHeaders: # 可以指定header
      - name: xxx
        value: xxx
```

当前访问到了不存在的路径，整个Pod就因此一直无法启动成功

![image-20230504204227259](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230504204227259.png)

pod被重启了5次之后状态变成了**Completed**，而之前虽然是**Running**，但是**Ready**一直都是0

![image-20230504204417045](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230504204417045.png)

- tcpSocket

下面就是检查80端口是否能通

```yaml
startupProbe:
  tcpSocket:
    port: 80
```

- execAction

执行一个shell命令，返回0（成功）则表示健康

```shell
startupProbe:
  exec:
    command:
      - cat
      - /health
```

#### livenessProbe

参数和startupProbe一样，如果在配置了startupProbe的情况下，必须当startupProbe成功后才会生效

用于探测容器中的应用是否运行，如果探测失败，kubelet 会根据配置的重启策略进行重启，若没有配置，默认就认为容器启动成功，不会执行重启策略。



#### readinessProbe

用于探测容器内的程序是否健康，它的返回值如果返回 success，那么就认为该容器已经完全启动，并且该容器是**可以接收外部流量的**。

参数也是一样的，和livenessProbe的区别是如果执行失败，**不会触发重启**，会一直去尝试直到执行成功



#### 其他参数

- initialDelaySeconds: 60 # 初始化时间
- timeoutSeconds: 2 # 超时时间
- periodSeconds: 5 # 监测间隔时间
- successThreshold: 1 # 检查 1 次成功就表示成功
- failureThreshold: 2 # 监测失败 2 次就表示失败



### 生命周期

![image-20230505151641534](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230505151641534.png)

- 初始化阶段： 会有0到N个容器进行初始化
- Pause容器是跟随整个Pod的生命周期的，负责对外的网络、文件系统等
- StartUpProbe启动探针：仅在Pod启动时生效
- ReadinessProbe就绪探针：仅当无StartUpProbe配置或StartUpProbe结束后生效，只有当其执行通过后，流量才会接入
- livenessProbe存活探针：会存在于启动后的整个生命周期，如果失败就会重启
- postStart钩子：启动Pod时的钩子函数，但是无法确定与Pod中的commad的执行顺序，所以一般不使用
- preStop钩子：销毁前的钩子函数，可以用来做些资源回收销毁的动作

```yaml
preStop:
  exec:
    command:
      - sh
      - -c
      - 'sleep 20; kill pgrep java'
```

如果这个销毁的动作需要很长的时间，可以通过设置**terminationGracePeriodSeconds**来延长容器保留时间



## 资源调度

### Label与Selector

label: 在各类资源的 metadata.labels 中进行配置

创建临时label

```shell
kubectl label po <资源名称> app=hello
```

修改已经存在的标签

```shell
kubectl label po <资源名称> app=hello2 --overwrite
```

查看labels

```
# selector 按照 label 单值查找节点
kubectl get po -A -l app=hello

# 查看所有节点的 labels
kubectl get po --show-labels
```



### Deployment

#### **一个单 Pod 的 Deployment 与一个 Pod 最主要的区别是什么？**

一个Pod一旦在一个节点开始运行，那么不论怎么重启都是在这个节点上绑定了，不会跑到别的节点上去，只有通过Deployment来管理才会动态变更



对应于**无状态**应用，一个deployment会对应1-N个**ReplicaSet**（副本集），一个ReplicaSet里面有N个Pod

Deployment 为 Pod 和 Replica Set 提供声明式更新。Pod的声名内容就对应其中的`template`属性

![image-20230505162622104](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230505162622104.png)

可以通过下面两种方式创建

```shell
# 创建一个 deployment
kubectl create deploy nginx-deploy --image=nginx:1.7.9

# 或执行
kubectl create -f xxx.yaml --record
# --record 会在 annotation 中记录当前命令创建或升级了资源，后续可以查看做过哪些变动操作。
```

在replica为1的情况下，创建一个deployment就会对应产生一个deploy一个pod一个replicaSet

![image-20230505162903505](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230505162903505.png)

从上图可以看出deployment/replicaSet/pod的命名是有**层级关系**的

> deploy nginx-deploy -> rs nginx-deploy-78d8bf4fd7 -> Pod nginx-deploy-78d8bf4fd7-md5p2 

但是实际情况三者一般不会1:1:1，而是 1个deploy对应N个replicaSet，因为一旦deploy出现更新，那么就会生成一个新的rs，新的rs完全ready后老的rs也不会销毁。一个rs会对应N个Pod，这个N取决于replica的配置数量

**典型的deployment yaml**

deployment的restartPolicy**必须**是Always，不然就没法做到在控制循环中确保实例个数

```yaml
apiVersion: apps/v1 # deployment api 版本
kind: Deployment # 资源类型为 deployment
metadata: # 元信息
  labels: # 标签
    app: nginx-deploy # 具体的 key: value 配置形式
  name: nginx-deploy # deployment 的名字
  namespace: default # 所在的命名空间
spec:
  replicas: 1 # 期望副本数
  revisionHistoryLimit: 10 # 进行滚动更新后，保留的历史版本数
  selector: # 选择器，用于找到匹配的 RS
    matchLabels: # 按照标签匹配
      app: nginx-deploy # 匹配的标签key/value
  strategy: # 更新策略
    rollingUpdate: # 滚动更新配置
      maxSurge: 25% # 进行滚动更新时，更新的个数最多可以超过期望副本数的个数/比例
      maxUnavailable: 25% # 进行滚动更新时，最大不可用比例更新比例，表示在所有副本数中，最多可以有多少个不更新成功
    type: RollingUpdate # 更新类型，采用滚动更新
  template: # pod 模板
    metadata: # pod 的元信息
      labels: # pod 的标签
        app: nginx-deploy
    spec: # pod 期望信息
      containers: # pod 的容器
      - image: nginx:1.7.9 # 镜像
        imagePullPolicy: IfNotPresent # 拉取策略
        name: nginx # 容器名称
      restartPolicy: Always # 重启策略
      terminationGracePeriodSeconds: 30 # 删除操作最多宽限多长时间
```

#### 为什么Deploy不直接控制Pod，而是要有一个中间的rs？

会产生一个新的rs的**前提**是template发生改变，如果只是改变replica的数量，只会在当前rs上进行增删Pod

这样的好处就是对版本做了分别的控制，如果没有rs，那么在滚动更新中不同版本的Pod相当于就是混杂在一起的。通过rs可以直观得看到v1的Pod状态和v2的状态

ReplicaSet其实可以理解为Pod**版本管理**，当我们使用命令去回滚deploy时，实际只是把当前的rs数量降到0，把旧的rs从0升到期望的过程

```
$ kubectl rollout undo deployment/nginx-deployment --to-revision=2
deployment.extensions/nginx-deployment
```



#### --record

在命令后面添加`--record`，就可以记录接下来所有的操作，后面就可以通过命令来查看历史

```
$ kubectl rollout history deployment/nginx-deployment
deployments "nginx-deployment"
REVISION    CHANGE-CAUSE
1           kubectl create -f nginx-deployment.yaml --record
2           kubectl edit deployment/nginx-deployment
3           kubectl set image deployment/nginx-deployment nginx=nginx:1.91
```

#### 状态

```bash
$ kubectl get deployments
NAME               DESIRED   CURRENT   UP-TO-DATE   AVAILABLE   AGE
nginx-deployment   3         0         0            0           1s
```

1. DESIRED：用户期望的 Pod 副本个数（spec.replicas 的值）
2. CURRENT：当前处于 Running 状态的 Pod 的个数
3. UP-TO-DATE：当前处于最新版本的 Pod 的个数，所谓最新版本指的是 Pod 的 Spec 部分与 Deployment 里 Pod 模板里定义的**完全一致**，打个比方：期望是3，因为滚动更新，CURRENT可能也是3，但是两个是旧的一个是新的，此时UP-TO-DATE就是1
4. AVAILABLE：当前已经可用的 Pod 的个数，即：**既是** Running 状态，**又是**最新版本，**并且**已经处于 Ready（健康检查正确）状态的 Pod 的个数。



#### 滚动更新

主要聚焦在更新策略

```yaml
replicas: 1 # 期望副本数
revisionHistoryLimit: 10 # 进行滚动更新后，保留的历史版本数
selector: # 选择器，用于找到匹配的 RS
  matchLabels: # 按照标签匹配
    app: nginx-deploy # 匹配的标签key/value
strategy: # 更新策略
  rollingUpdate: # 滚动更新配置
    maxSurge: 25% # 进行滚动更新时，更新的个数最多可以超过期望副本数的个数/比例
    maxUnavailable: 25% # 进行滚动更新时，最大不可用比例更新比例，表示在所有副本数中，最多可以有多少个不更新成功
  type: RollingUpdate # 更新类型，采用滚动更新
```

只有修改了 deployment 配置文件中的 template 中的属性后，才会触发更新操作

```shell
# 修改 nginx 版本号
kubectl set image deployment/nginx-deploy nginx=nginx:1.9.1

# 或者通过 
kubectl edit deployment/nginx-deploy 

# 查看滚动更新的过程
kubectl rollout status deploy <deployment_name>
# 也可以通过描述查看事件
kubectl describe deploy <deployment_name>
```

当触发了滚动更新后，k8s会新建一个rs，然后在上面启动新的Pod，当新的Pod启动完毕后，老的rs就会被撤掉，从下图就能看出，老的rs在更新完成后current/ready/desired都会是0，而新的rs的这些数量就是目标的值

![image-20230505181552479](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230505181552479.png)



**多个滚动更新并行**

假设当前有 5 个 nginx:1.7.9 版本，你想将版本更新为 1.9.1，当更新成功第三个以后，你马上又将期望更新的版本改为 1.9.2，那么此时会立马删除之前的三个，并且立马开启更新 1.9.2 的任务



#### 回滚

可以通过命令来得到deploy的历史版本记录

```shell
kubectl rollout history deployment/nginx-deploy
```

![image-20230505182502137](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230505182502137.png)

通过命令得到具体revision的详情，假设下面就能看到版本1中的image版本是1.7.9 （上一步改成了1.9.1）

```shell
 kubectl rollout history deployment/nginx-deploy --revision=1
```

![image-20230505182608610](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230505182608610.png)

通过命令进行回滚操作

```shell
kubectl rollout undo deployment/nginx-deploy # 可以回退到上一个版本

# 也可以回退到指定的 revision
kubectl rollout undo deployment/nginx-deploy --to-revision=1
```

可以通过设置 .spec.revisonHistoryLimit 来指定 deployment 保留多少 revison，如果设置为 0，则不允许 deployment 回退了。

#### 扩容缩容

扩容与缩容只是直接创建副本数，没有更新 pod template 因此不会创建新的 rs

可以通过 kube scale 命令可以进行自动扩容/缩容，以及通过 kube edit 编辑 replcas 也可以实现扩容/缩容

#### 暂停与恢复

由于每次对 pod template 中的信息发生修改后，都会触发更新 deployment 操作，那么此时如果频繁修改信息，就会产生多次更新，而实际上只需要执行最后一次更新即可，当出现此类情况时我们就可以暂停 deployment 的 rollout

可以通过下面命令，就可以实现暂停，直到你下次恢复后才会继续进行滚动更新。接下来的任何edit操作都不会触发重新的部署

```shell
kubectl rollout pause deployment <name>
```

通过命令，就可以实现恢复rollout，此时就会有新的rs产生

```shell
kubectl rollout resume deploy <name>
```



### StatefulSet

StatefulSet对应的是**有状态**的服务，它下面没有rs的概念

![image-20230506141122134](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230506141122134.png)

#### 有状态是指哪些状态呢？

1. **拓扑状态**。这种情况意味着，应用的多个实例之间不是完全对等的关系。这些应用实例，必须按照某些顺序启动，比如应用的主节点 A 要先于从节点 B 启动。而如果你把 A 和 B 两个 Pod 删除掉，它们再次被创建出来时也必须严格按照这个顺序才行。并且，新创建出来的 Pod，必须和原来 Pod 的**网络标识一样**，这样原先的访问者才能使用同样的方法，访问到这个新 Pod。
2. **存储状态**。这种情况意味着，应用的多个实例分别绑定了不同的存储数据。对于这些应用实例来说，Pod A 第一次读取到的数据，和隔了十分钟之后再次读取到的数据，应该是同一份，哪怕在此期间 Pod A 被重新创建过。这种情况最典型的例子，就是一个数据库应用的多个存储实例。

总结起来，第一就是保持网络标识不变，即使删除重建还是可以用之前的标识来访问，第二就是保持存储状态，即使Pod删除重建，它对应的数据卷状态还是保持的，能读到的内容还是一致的

StatefulSet 的**核心功能**，就是通过某种方式记录这些状态，然后在 Pod 被重新创建时，能够为新 Pod 恢复这些状态



**典型配置文件**

```yaml
---
apiVersion: v1
kind: Service
metadata:
  name: nginx
  labels:
    app: nginx
spec:
  ports:
  - port: 80
    name: web
  clusterIP: None
  selector:
    app: nginx
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: web
spec:
  serviceName: "nginx"
  replicas: 2
  selector:
   matchLabels:
     app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.7.9
        ports:
        - containerPort: 80
          name: web
```

可以通过`kubectl create -f` 命令来进行创建

结果会发现产生了一个statefulSet，同时产生了两个关联的Pod，注意这两个Pod的名称并不是像deploy那样的结构(deploy名-rs码-pod码)，这里的结构是`sts名-从0开始的整数`

![image-20230506143942411](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230506143942411.png)



可以通过以下命令进入一个busybox的容器（因为宿主机是无法直接访问集群内的网络的，所以要起一个容器来访问，busybox有nslookup的功能）

```bash
kubectl run -i --tty --image busybox:1.28.4 dns-test --restart=Never --rm /bin/sh

# 进入容器后执行命令
nslookup web-0.nginx
```

内部可以访问的服务名就是`pod名.svc名`

![image-20230506144726331](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230506144726331.png)

**为什么通过`<pod-name>.<svc-name>`的形式就能稳定访问到特定的Pod？**

首先这是**Headless Service**的实现方式，Headless Service就是配置了`clusterIP: None`的Service，这种Service只能通过DNS记录来暴露它所代理的Pod。它所代理的Pod都会有如此的一条DNS记录。这就是这个Pod的唯一网络身份记录

```
<pod-name>.<svc-name>.<namespace>.svc.cluster.local
```

接下来即使删除了Pod，重新创建仍然会沿用之前从0开始编号的Pod id，所以名字对Pod来说是固定不变的，它的网络标识也是固定不变的，所以就可以稳定访问

> StatefulSet 这个控制器的主要作用之一，就是使用 Pod 模板创建 Pod 的时候，对它们进行编号，并且按照编号顺序逐一完成创建工作。而当 StatefulSet 的“控制循环”发现 Pod 的“实际状态”与“期望状态”不一致，需要新建或者删除 Pod 进行“调谐”的时候，它会严格按照这些 Pod 编号的顺序，逐一完成这些操作。

**如何维持上面说的存储状态？**

在StatefulSet里，每个Pod被分配的PVC也会和Pod一样被编号，结构是`PVC名-Pod名-序号`，这个序号和Pod的序号是完全一致的，加入Pod被删除重建，那么重建结束后的Pod会找到与自身序号相同的PVC匹配，进而找到绑定的PV



#### 扩容缩容

```shell
# 扩容
$ kubectl scale statefulset web --replicas=5

# 缩容
$ kubectl patch statefulset web -p '{"spec":{"replicas":3}}'
```



#### 镜像更新

可以通过命令`kubectl edit sts <sts名称>`来编辑配置，打开之后发现在运行时k8s会帮我们加上很多我们没有在create时添加的属性，这些都是本身的默认值，同时还会有一个`status`属性，这是运行时的状态属性

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230506160940843.png" alt="image-20230506160940843" style="zoom:67%;" />

#### 灰度发布

**更新策略** 金丝雀更新

**updateStratege**

**rollingUpdate**：即滚动更新，pod 是有序的，在 StatefulSet 中更新时是基于 pod 的顺序倒序更新的

partion里面的数字就是**只更新***大于等于*这个数字的Pod，而之前的Pod保持不变

例如我们有 5 个 pod，如果当前 partition 设置为 2，那么此时滚动更新时，只会更新那些 序号 >= 2 的 pod

最后的结果可以通过`kubectl describe sts web`来查看，它是从序号最大的开始删除一个创建一个

![image-20230506163508519](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230506163508519.png)

利用该机制，我们可以通过控制 partition 的值，来决定只更新其中一部分 pod，确认没有问题后再主键增大更新的 pod 数量，最终实现全部 pod 更新

**onDelete**

只有在 pod 被删除时会进行更新操作



### DaemonSet

典型配置文件

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd
spec:
  template:
    metadata:
      labels:
        app: logging
        id: fluentd
      name: fluentd
    spec:
      containers:
      - name: fluentd-es
        image: agilestacks/fluentd-elasticsearch:v1.3.0
        volumeMounts:
         - name: containers
           mountPath: /var/lib/docker/containers
         - name: varlog
           mountPath: /varlog
      volumes:
         - hostPath:
             path: /var/lib/docker/containers
           name: containers
         - hostPath:
             path: /var/log
           name: varlog


```

DaemonSet直译理解就是**守护进程**，可以用来部署些监控类的服务，它控制的Pod有以下特征

1. 这个 Pod 运行在 Kubernetes 集群里的每一个节点（Node）上；
2. 每个节点上只有一个这样的 Pod 实例；
3. 当有新的节点加入 Kubernetes 集群后，该 Pod 会自动地在新节点上被创建出来；而当旧节点被删除后，它上面的 Pod 也相应地会被回收掉。

DaemonSet不需要指定replica，**默认会在除了Master之外的所有节点都部署一个Pod**，如果需要指定部署的节点，就需要用到**nodeSelector**

可以通过命令给节点打标，然后在template中配置nodeSelector，这样就只会在指定标签的节点部署，同时如果动态扩容也会自动部署

```bash
# 先为 Node 打上标签
kubectl label nodes k8s-node1 type=microsvc

# 然后再 daemonset 配置中设置 nodeSelector
spec:
  template:
    spec:
      nodeSelector:
        type: microsvc
```

滚动更新和StatefulSet一致，但建议使用onDelete策略，这样会比较节约资源

### **ControllerRevision**

像StatefulSet和DaemonSet都是没有replicaSet管理Pod的，而replicaSet其实就是一个版本管理器。所以他们两个是怎么管理版本的呢？

这里需要用到ControllerRevision，它其实就是一个历史记录的对象，可以通过命令来获取

```bash
$ kubectl get controllerrevision -n kube-system -l name=fluentd-elasticsearch
NAME                               CONTROLLER                             REVISION   AGE
fluentd-elasticsearch-64dc6799c9   daemonset.apps/fluentd-elasticsearch   2 
```

然后通过命令来做回滚操作

```bash
$ kubectl rollout undo daemonset fluentd-elasticsearch --to-revision=1 -n kube-system
daemonset.extensions/fluentd-elasticsearch rolled back
```

这个操作结束后，当前的revision并不是1，而是3，因为这个操作是把1时的状态重新执行了一次（等价于执行一次 kubectl apply -f “旧的 DaemonSet 对象”），相当于把它更新到一个旧版本。而这个操作本身又形成了一个新的ControllerRevision





### HPA 自动扩容/缩容

通过观察 pod 的 cpu、内存使用率或自定义 metrics 指标进行自动的扩容或缩容 pod 的数量。

通常用于 Deployment，不适用于无法扩/缩容的对象，如 DaemonSet

控制管理器每隔30s（可以通过–horizontal-pod-autoscaler-sync-period修改）查询metrics的资源使用情况

首先这个资源必须有配置`resources.limits`，即至少需要多少资源（多少CPU或内存），当实际占用资源超过设定的值才会生效

然后通过命令来开启hpa，min最少扩容到N个，max最多扩容到N

cpu-percent表示阈值百分比，比如设置了`requests.limits.cpu = 100m`，当服务没有负载的时候用的CPU可能是0，当负载上升后，达到20m时，就相当于达到了预设的20%，此时就会开始触发hpa的扩容，反之就是触发缩容

```bash
kubectl autoscale deploy nginx-deploy --cpu-percent=20 --min=2 --max=5

kubectl get hpa # 查看hpa信息
```



### Services

服务发现，主要用来实现集群的横向流量，也就是集群内部间的访问

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230506205908331.png" alt="image-20230506205908331" style="zoom:67%;" />

有了微服务之后，各个微服务之间都可以通过服务名互相访问。这里的一个微服务可能是部署在N个节点上的N个Pod的集合，可以通过一个统一的服务名被访问

#### Endpoints

它和Service是0对1或者1对1的关系，一般情况下创建一个Service的同时会自动创建一个endpoint与Service同名，一个ep下面绑了N个终端地址

![image-20230506210514613](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230506210514613.png)

一般情况下endpoints都是用来指代service的selector对应的pod的终端地址的，但如果一个service它不配置selector，那么可以单独为这个service创建一个ep。然后把这个ep的地址指向一个外部的地址，这样就可以让所有集群内部的应用都通过一个Service来访问到一个外部的资源了

```yaml
apiVersion: v1
kind: Endpoints
metadata:
  labels:
    app: svc-external # 与 service 一致
  name: svc-external # 与 service 一致
subsets:
- addresses:
  - ip: <target ip> # 目标外部 ip 地址
  ports: # 与 service 一致
  - name: http # 这个就是svc的port名称
    port: 80
    protocol: TCP
```





#### 典型的配置

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-svc
  labels:
    app: nginx-svc
spec:
  ports:
  - name: http # service 端口配置的名称
    protocol: TCP # 端口绑定的协议，支持 TCP、UDP、SCTP，默认为 TCP
    port: 80 # service 自己的端口
    targetPort: 9527 # 目标 pod 的端口
  - name: https
    port: 443
    protocol: TCP
    targetPort: 443
  selector: # 选中当前 service 匹配哪些 pod，对哪些 pod 的东西流量进行代理
    app: nginx
  type: NodePort
```

主要需要配置

selector：只对有这个标签的Pod进行流量代理

ports：出口配置

- name：可以是任意名称，就是给这个出口一个名字

- port：别人访问这个service的端口号

- targetPort: Service要代理的Pod暴露服务的端口号

type：service的类型，有三种

- ClusterIP：默认值，只能在集群内部使用，不能在集群外被发现
- NodePort：会在所有安装了 kube-proxy 的节点都绑定一个端口，此端口可以代理至对应的 Pod，集群外部可以使用任意节点 ip + NodePort 的端口号访问到集群中对应 Pod 中的服务。当类型设置为 NodePort 后，可以在 ports 配置中增加 nodePort 配置指定端口，需要在下方的端口范围内，如果不指定会随机指定端口
- ExternalName：代理集群外的服务
- LoadBalancer： 使用云厂商的负载均衡服务



### Ingress

Ingress 可以理解为也是一种 LB 的抽象，它的实现也是支持 nginx、haproxy 等负载均衡服务的

在实际使用中**一般情况**下都需要配置一个域名，但是一般的云厂商可以在不配域名的情况下分配出一个**VIP**出来作为访问的入口

**典型配置**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress # 资源类型为 Ingress
metadata:
  name: nginx-ingress
  annotations:
    kubernetes.io/ingress.class: "nginx"
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules: # ingress 规则配置，可以配置多个
  - host: k8s.cn # 域名配置，可以使用通配符 *
    http:
      paths: # 相当于 nginx 的 location 配置，可以配置多个
      - pathType: Prefix # 路径类型，按照路径类型进行匹配 ImplementationSpecific 需要指定 IngressClass，具体匹配规则以 IngressClass 中的规则为准。Exact：精确匹配，URL需要与path完全匹配上，且区分大小写的。Prefix：以 / 作为分隔符来进行前缀匹配
        backend:
          service: 
            name: nginx-svc # 代理到哪个 service
            port: 
              number: 80 # service 的端口
        path: /api # 等价于 nginx 中的 location 的路径前缀匹配
```



### Projected Volume

projected翻译为**投射**，所以这也翻译为投射数据卷。总共有4种

1. Secret
2. ConfigMap
3. Downward API
4. ServiceAccountToken

其中Downward API的作用是让Pod可以获取自身的Pod配置信息

```yaml
containers:
  - name: client-container
    image: k8s.gcr.io/busybox
    command: ["sh", "-c"]
    args:
    - while true; do
        if [[ -e /etc/podinfo/labels ]]; then
          echo -en '\n\n'; cat /etc/podinfo/labels; fi;
        sleep 5;
      done;
    volumeMounts:
      - name: podinfo
        mountPath: /etc/podinfo
        readOnly: false
volumes:
    - name: podinfo
      projected:
        sources:
        - downwardAPI:
            items:
              - path: "labels"
                fieldRef:
                  fieldPath: metadata.labels
```

比如这样， Pod中的容器就可以在` /etc/podinfo/labels `中拿到Pod自身的metadata.labels了

以下是其它支持的字段内容

```
1. 使用 fieldRef 可以声明使用:
spec.nodeName - 宿主机名字
status.hostIP - 宿主机 IP
metadata.name - Pod 的名字
metadata.namespace - Pod 的 Namespace
status.podIP - Pod 的 IP
spec.serviceAccountName - Pod 的 Service Account 的名字
metadata.uid - Pod 的 UID
metadata.labels['<KEY>'] - 指定 <KEY> 的 Label 值
metadata.annotations['<KEY>'] - 指定 <KEY> 的 Annotation 值
metadata.labels - Pod 的所有 Label
metadata.annotations - Pod 的所有 Annotation
 
2. 使用 resourceFieldRef 可以声明使用:
容器的 CPU limit
容器的 CPU request
容器的 memory limit
容器的 memory request
```

但有个前提是注入的信息**必须**是Pod启动前就定义好的，不能动态投射运行时加入的信息，如果需要动态获取就要考虑使用sidecar来实现



### ConfigMap

一般用于去存储 Pod 中应用所需的一些配置信息，或者环境变量，将配置与Pod分开，避免因为修改配置导致还需要重新构建镜像与容器。

可以用命令创建

```bash
kubectl create cm <cm-name> --from-file /xxxx/xx  # 通过文件夹或文件内容创建
kubectl create cm --from-literal=username=root # 通过单行输入创建
```

使用方法

- 通过`configMapKeyRef`把configmap映射到环境变量
- 通过存储卷把configMap映射到容器中指定文件目录下

```yaml
kind: Pod
spec:
  containers:
    - env:
      - name: PARAM # 映射到环境变量
        valueFrom:
          configMapKeyRef:
            name: xxxx  # cm的名字
            key: keyName  # 从xxxx中拿到key为keyName的值，然后赋值给PARAM
      volumeMounts:
       - name: db-config # 把下面的volume挂载进来
         mountPath: "/usr/local/mysql/conf" # 映射路径
         readOnly: true
  volumes:
    - name: db-config
      configMap: test-cm # 和外面定义的configMap名字一致
        items:
         - key: "db.properties" # test-cm中key为db.properties的内容
           path: "db.properties" # 转化成的文件名，会添加到/usr/local/mysql/conf里面去
```

#### SubPath

使用 ConfigMap 或 Secret 挂载到目录的时候，会将容器中源目录给覆盖掉，此时我们可能只想覆盖目录中的某一个文件，但是这样的操作会覆盖整个文件夹，因此需要使用到 SubPath

配置方式：
定义 volumes 时需要增加 items 属性，配置 key 和 path，且 path 的值不能从 / 开始
在容器内的 volumeMounts 中增加 subPath 属性，该值与 volumes 中 items.path 的值相同

```yaml
containers:
  ......
  volumeMounts:

  - mountPath: /etc/nginx/nginx.conf # 挂载到哪里
    name: config-volume # 使用哪个 configmap 或 secret
    subPath: etc/nginx/nginx.conf # 与 volumes.[0].items.path 相同
    volumes:
volumes: 
 - configMap:
    name: nginx-conf # configMap 名字
    items: # subPath 配置
     - key: nginx.conf # configMap 中的文件名
       path: etc/nginx/nginx.conf # subPath 路径 注意没有开头的/
```

由于 configmap 我们创建通常都是基于文件创建，并不会编写 yaml 配置文件，因此修改时我们也是直接修改配置文件，而 replace 是没有 --from-file 参数的，因此无法实现基于源配置文件的替换，此时我们可以利用下方的命令实现

该命令的重点在于 --dry-run 参数，该参数的意思打印 yaml 文件，但不会将该文件发送给 apiserver，再结合 -oyaml 输出 yaml 文件就可以得到一个配置好但是没有发给 apiserver 的文件，然后再结合 replace 监听控制台输出得到 yaml 数据即可实现替换

```
kubectl create cm --from-file=nginx.conf --dry-run -oyaml | kubectl replace -f-
```



### Volumes

#### HostPath

将节点上的文件或目录挂载到 Pod 上，此时该目录会变成持久化存储目录，即使 Pod 被删除后重启，也可以重新加载到该目录，该目录下的文件不会丢失，这点和Docker基本是一样的

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-pd
spec:
  containers:
  - image: nginx
    name: nginx-volume
    volumeMounts:
    - mountPath: /test-pd # 挂载到容器的哪个目录
      name: test-volume # 挂载哪个 volume
  volumes:
  - name: test-volume
    hostPath:
      path: /data # 节点中的目录
      type: Directory # 检查类型，在挂载前对挂载目录做什么检查操作，有多种选项，默认为空字符串，不做任何检查
```

#### EmptyDir

EmptyDir 主要用于一个 Pod 中**不同的** Container 共享数据使用的，由于只是在 Pod 内部使用，因此与其他 volume 比较大的区别是，当 Pod 如果被删除了，那么 emptyDir 也会被删除。

存储介质可以是任意类型，如 SSD、磁盘或网络存储。可以将 emptyDir.medium 设置为 Memory 让 k8s 使用 tmpfs（内存支持文件系统），速度比较快，但是重启 tmpfs 节点时，数据会被清除，且设置的大小会计入到 Container 的内存限制中。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-pd
spec:
  containers:
  - image: nginx
    name: nginx-emptydir
    volumeMounts:
    - mountPath: /cache
      name: cache-volume
  volumes:
  - name: cache-volume
    emptyDir: {}
```

#### NFS

nfs 卷能将 NFS (网络文件系统) 挂载到你的 Pod 中。 不像 emptyDir 那样会在删除 Pod 的同时也会被删除，nfs 卷的内容在删除 Pod 时会被保存，卷只是被卸载。 这意味着 nfs 卷可以被预先填充数据，并且这些数据可以在 Pod 之间共享。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-pd
spec:
  containers:
  - image: nginx
    name: test-container
    volumeMounts:
    - mountPath: /my-nfs-data
      name: test-volume
  volumes:
  - name: test-volume
    nfs:
      server: my-nfs-server.example.com # 网络存储服务地址
      path: /my-nfs-volume # 网络存储路径
      readOnly: true # 是否只读
```

nfs它本身是一个服务，是需要服务器去安装的，完成后就可以通过暴露出去的服务来访问nfs的内容了

```bash
# 安装 nfs
yum install nfs-utils -y

# 启动 nfs
systemctl start nfs-server

# 查看 nfs 版本
cat /proc/fs/nfsd/versions

# 重新加载
exportfs -f
systemctl reload nfs-server
```

#### PV与PVC

持久卷（PersistentVolume，PV） 是集群中的一块存储，可以由管理员事先制备， 或者使用存储类（Storage Class）来动态制备。 持久卷是集群资源，就像节点也是集群资源一样。PV 持久卷和普通的 Volume 一样， 也是使用卷插件来实现的，只是它们拥有独立于任何使用 PV 的 Pod 的生命周期。 此 API 对象中记述了存储的实现细节，无论其背后是 NFS、iSCSI 还是特定于云平台的存储系统。

持久卷申领（PersistentVolumeClaim，PVC） 表达的是用户对存储的**请求**。概念上与 Pod 类似。 Pod 会耗用节点资源，而 PVC **申领**会耗用 PV 资源。Pod 可以请求特定数量的资源（CPU 和内存），同样 PVC 申领也可以请求特定的大小和访问模式 （例如，可以要求 PV 卷能够以 ReadWriteOnce、ReadOnlyMany 或 ReadWriteMany 模式之一来挂载）。

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230517205916313.png" alt="image-20230517205916313" style="zoom:50%;" />

##### 生命周期

###### 构建

静态构建：集群管理员创建若干 PV 卷。这些卷对象带有真实存储的细节信息， 并且对集群用户可用（可见）。PV 卷对象存在于 Kubernetes API 中，可供用户消费（使用）。

动态构建：如果集群中已经有的 PV 无法满足 PVC 的需求，那么集群会根据 PVC 自动构建一个 PV，该操作是通过 StorageClass 实现的。想要实现这个操作，前提是 PVC 必须设置 **StorageClass**，否则会无法动态构建该 PV，可以通过启用 DefaultStorageClass 来实现 PV 的构建。



###### 绑定 

当用户创建一个 PVC 对象后，主节点会监测新的 PVC 对象，并且寻找与之匹配的 PV 卷，找到 PV 卷后将二者绑定在一起。

如果找不到对应的 PV，则需要看 PVC 是否设置 StorageClass 来决定是否动态创建 PV，若没有配置，PVC 就会一致处于未绑定状态，直到有与之匹配的 PV 后才会申领绑定关系。



###### 使用

Pod 将 PVC 当作存储卷来使用，集群会通过 PVC 找到绑定的 PV，并为 Pod 挂载该卷。

Pod 一旦使用 PVC 绑定 PV 后，为了保护数据，避免数据丢失问题，PV 对象会受到保护，在系统中无法被删除。



###### 回收策略

当用户不再使用其存储卷时，他们可以从 API 中将 PVC 对象删除， 从而允许该资源被回收再利用。PersistentVolume 对象的回收策略告诉集群， 当其被从申领中释放时如何处理该数据卷。 目前，数据卷可以被 Retained（保留）、Recycled（回收）或 Deleted（删除）。

**保留Retain**:

回收策略 Retain 使得用户可以手动回收资源。当 PersistentVolumeClaim 对象被删除时，PersistentVolume 卷仍然存在，对应的数据卷被视为"已释放（released）"。 由于卷上仍然存在这前一申领人的数据，**该卷还不能用于其他申领**。 管理员可以通过下面的步骤来手动回收该卷：
删除 PersistentVolume 对象。与之相关的、位于外部基础设施中的存储资产 （例如 AWS EBS、GCE PD、Azure Disk 或 Cinder 卷）在 PV 删除之后仍然存在。

根据情况，手动清除所关联的存储资产上的数据。
手动删除所关联的存储资产。
如果你希望重用该存储资产，可以基于存储资产的定义创建新的 PersistentVolume 卷对象。

**删除Delete：**

对于支持 Delete 回收策略的卷插件，删除动作会将 PersistentVolume 对象从 Kubernetes 中移除，**同时也会**从外部基础设施（如 AWS EBS、GCE PD、Azure Disk 或 Cinder 卷）中移除所关联的存储资产。 动态制备的卷会继承其 StorageClass 中设置的回收策略， 该策略默认为 Delete。管理员需要根据用户的期望来配置 StorageClass； 否则 PV 卷被创建之后必须要被编辑或者修补。



##### PV

查看

```bash
kubectl get pv
```

**状态**

Avaliable：空闲未绑定

Bound：已经和PVC绑定

Release：PVC被删除，资源已回收，但是PV未被重新使用

Failed：自动回收失败



**典型配置**

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv0001
spec:
  capacity:
    storage: 5Gi # pv 的容量
  volumeMode: Filesystem # 存储类型为文件系统
  accessModes: # 访问模式：ReadWriteOnce、ReadWriteMany、ReadOnlyMany
    - ReadWriteOnce # 可被单节点独写
  persistentVolumeReclaimPolicy: Recycle # 回收策略
  storageClassName: slow # 创建 PV 的存储类名，需要与 pvc 的相同
  mountOptions: # 加载配置
    - hard
    - nfsvers=4.1
  nfs: # 连接到 nfs
    path: /data/nfs/rw/test-pv # 存储路径
    server: 192.168.113.121 # nfs 服务地址
```



##### PVC

好处就是业务不需要考虑真正的存储是怎么实现的，只需要在PVC上说明要求，它自动回去匹配合适的PV

**典型配置**

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nfs-pvc
spec:
  accessModes:
    - ReadWriteOnce # 权限需要与对应的 pv 相同
  volumeMode: Filesystem
  resources:
    requests:
      storage: 8Gi # 资源可以小于 pv 的，但是不能大于，如果大于就会匹配不到 pv
  storageClassName: slow # 名字需要与对应的 pv 相同
#  selector: # 使用选择器选择对应的 pv
#    matchLabels:
#      release: "stable"
#    matchExpressions:
#      - {key: environment, operator: In, values: [dev]}
```

PVC绑定PV有几个条件

1. accessMode 必须相同
2. request的资源大小要小于等于PV的capacity
3. storageClassName 必须相同
4. 上面都符合的情况下，还可以用selector做精确匹配



Pod绑定PVC

```yaml
# 在 pod 的挂载容器配置中，增加 pvc 挂载
containers:
  ......
  volumeMounts:
    - mountPath: /tmp/pvc
      name: nfs-pvc-test
volumes:
  - name: nfs-pvc-test
    persistentVolumeClaim:
      claimName: nfs-pvc # pvc 的名称
```

##### StorageClass

k8s 中提供了一套自动创建 PV 的机制，就是基于 StorageClass 进行的，通过 StorageClass 可以实现仅仅配置 PVC，然后交由 StorageClass 根据 PVC 的需求动态创建 PV。



## 高级调度

### Job

可以理解为执行成功就退出的Pod

Job的restartPolicy**只能**是OnFailure或者Never，如果设置了Never，在执行失败后Job Controller就会重新启动一个新的Pod。如果设置为OnFailure那才是普通的重启

#### 并行Job

在 Job 对象中，负责并行控制的参数有两个：

1. spec.parallelism，它定义的是一个 Job 在任意时间最多可以启动多少个 Pod 同时运行；
2. spec.completions，它定义的是 Job 至少要完成的 Pod 数目，即 Job 的最小完成数，或者说目标完成数

### CronJob

在 k8s 中周期性运行计划任务，与 linux 中的 crontab 相同

注意点：CronJob 执行的时间是 controller-manager 的时间，所以一定要确保 controller-manager 时间是准确的

简单讲就是起一个Pod，然后在这个Pod里面定时执行command

**典型配置**

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: hello
spec:
  concurrencyPolicy: Allow # 并发调度策略：Allow 允许并发调度，Forbid：不允许并发执行，Replace：如果之前的任务还没执行完，就直接执行新的，放弃上一个任务
  failedJobsHistoryLimit: 1 # 保留多少个失败的任务
  successfulJobHistoryLimit: 3 # 保留多少个成功的任务
  suspend: false # 是否挂起任务，若为 true 则该任务不会执行
#  startingDeadlineSeconds: 30 # 间隔多长时间检测失败的任务并重新执行，时间不能小于 10
  schedule: "* * * * *" # 调度策略
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: hello
            image: busybox:1.28
            imagePullPolicy: IfNotPresent
            command:
            - /bin/sh
            - -c
            - date; echo Hello from the Kubernetes cluster
          restartPolicy: OnFailure
```



### InitContainter

在真正的容器启动之前，先启动 InitContainer，在初始化容器中完成真实容器所需的初始化操作，完成后再启动真实的容器。

相对于 postStart 来说，首先 InitController 能够保证一定在 EntryPoint 之前执行，而 postStart 不能，其次 postStart 更适合去执行一些命令操作，而 InitController 实际就是一个容器，可以在其他基础容器环境下执行更复杂的初始化功能。

```yaml
# 在 pod 创建的模板中配置 initContainers 参数：
spec:
  initContainers:
  - image: nginx
    imagePullPolicy: IfNotPresent
    command: ["sh", "-c", "echo 'inited;' >> ~/.init"]
    name: init-test
```



### 污点 Taint

k8s 集群中可能管理着非常庞大的服务器，这些服务器可能是各种各样不同类型的，比如机房、地理位置、配置等，有些是计算型节点，有些是存储型节点，此时我们希望能更好的将 pod 调度到与之需求更匹配的节点上。

此时就需要用到污点（Taint）和容忍（Toleration），这些配置都是 key: value 类型的。



污点：是标注在节点上的，当我们在一个节点上打上污点以后，k8s 会认为尽量不要将 pod 调度到该节点上，除非该 pod 上面表示可以容忍该污点，且一个节点可以打多个污点，此时则需要 pod 容忍所有污点才会被调度该节点。

```bash
# 为节点打上污点
kubectl taint node k8s-master key=value:NoSchedule

# 移除污点 后面加一个减号
kubectl taint node k8s-master key=value:NoSchedule-

# 查看污点
kubectl describe no k8s-master
```

污点的影响：

- NoSchedule：不能容忍的 pod **不会**被调度到该节点，但是已经存在的节点不会被驱逐
- NoExecute：不能容忍的节点会被**立即清除**，能容忍且没有配置 `tolerationSeconds` 属性，则可以一直运行，设置了 tolerationSeconds: 3600 属性，则该 pod 还能继续在该节点运行 3600 秒



**容忍**：是标注在 pod 上的，当 pod 被调度时，如果没有配置容忍，则该 pod 不会被调度到有污点的节点上，只有该 pod 上标注了满足某个节点的所有污点，则会被调度到这些节点

```yaml
# pod 的 spec 下面配置容忍 和container同级
tolerations:
- key: "污点的 key"
  value: "污点的 value"
  offect: "NoSchedule" # 污点产生的影响
  operator: "Equal" # 表是 value 与污点的 value 要相等，也可以设置为 Exists 表示存在 key 即可，此时可以不用配置 value
```

比较操作类型operator为 Equal，则意味着必须与污点值做匹配，key/value都必须相同，才表示能够容忍该污点

比较操作类型operator为 Exists，容忍与污点的比较只比较 key，不比较 value，不关心 value 是什么东西，只要 key 存在，就表示可以容忍。



### 亲和力 Affinity

和污点容忍的主要区别是，这个是Pod主动去选择想部署在哪个节点Node，列出硬条件和非必须条件，符合条件的Node就优先部署就是亲和性，不符合条件的就不去部署或尽量不部署就是反亲和性，而污点是Node主动告诉Pod我这里不能部署或者调度，除非满足容忍

#### NodeAffinity

节点亲和力：进行 pod 调度时，优先调度到符合条件的亲和力节点上

- RequiredDuringSchedulingIgnoredDuringExecution：硬亲和力，即支持必须部署在指定的节点上，也支持必须不部署在指定的节点上

- PreferredDuringSchedulingIgnoredDuringExecution：软亲和力：尽量部署在满足条件的节点上，或尽量不要部署在被匹配的节点上

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: with-node-affinity
spec:
  affinity: # 亲和力配置
    nodeAffinity: # 节点亲和力
      requiredDuringSchedulingIgnoredDuringExecution: # 节点Node必须匹配下方配置
        nodeSelectorTerms: # 选择器
        - matchExpressions: # 匹配表达式
          - key: topology.kubernetes.io/zone # 匹配 label 的 key
            operator: In # 匹配方式，只要匹配成功下方的一个 value 即可
            values:
            - antarctica-east1 # 匹配的 value
            - antarctica-west1 # 匹配的 value
      preferredDuringSchedulingIgnoredDuringExecution: # 节点尽量匹配下方配置
      - weight: 1 # 权重[1,100]，按照匹配规则对所有节点累加权重，最终之和会加入优先级评分，优先级越高被调度的可能性越高
        preference:
          matchExpressions: # 匹配表达式
          - key: another-node-label-key # label 的 key
            operator: In # 匹配方式，满足一个即可 In NotIn Exists DoesNotExist Gt Lt 可以做到亲和力和反亲和力
            values:
            - another-node-label-value # 匹配的 value
#      - weight: 20
        ......
```

#### PodAffinity

Pod 亲和力：将与指定 pod 亲和力相匹配的 pod 部署在同一节点。

- PreferredDuringSchedulingIgnoredDuringExecution：尽量将应用部署在一块

- RequiredDuringSchedulingIgnoredDuringExecution： 必须将应用部署在一块



```yaml
apiVersion: v1
kind: Pod
metadata:
  name: with-pod-affinity
spec:
  affinity: # 亲和力配置
    podAffinity: # pod 亲和力配置
      requiredDuringSchedulingIgnoredDuringExecution: # 当前 pod 必须匹配到对应条件 pod 所在的 node 上
      - labelSelector: # 标签选择器
          matchExpressions: # 匹配表达式
          - key: security # 匹配的 key
            operator: In # 匹配方式
            values: # 匹配其中的一个 value
            - S1
        topologyKey: topology.kubernetes.io/zone
    podAntiAffinity: # pod 反亲和力配置
      preferredDuringSchedulingIgnoredDuringExecution: # 尽量不要将当前节点部署到匹配下列参数的 pod 所在的 node 上
      - weight: 100 # 权重
        podAffinityTerm: # pod 亲和力配置条件
          labelSelector: # 标签选择器
            matchExpressions: # 匹配表达式
            - key: security # 匹配的 key
              operator: In # 匹配的方式
              values:
              - S2 # 匹配的 value
          topologyKey: topology.kubernetes.io/zone
  containers:
  - name: with-pod-affinity
    image: pause:2.0
```



## 身份认证与权限

Kubernetes 中提供了良好的多租户认证管理机制，如 RBAC、ServiceAccount 还有各种策略等。

通过该文件可以看到已经配置了 RBAC 访问控制`/usr/lib/systemd/system/kube-apiserver.service`

### 认证

所有 Kubernetes 集群有两类用户：由 Kubernetes 管理的Service Accounts （服务账户）和（Users Accounts） 普通账户。

普通账户是假定被外部或独立服务管理的，由管理员分配 keys，用户像使用 Keystone 或 google 账号一样，被存储在包含 usernames 和 passwords 的 list 的文件里。

需要注意：在 Kubernetes 中不能通过 API 调用将普通用户添加到集群中。

- 普通帐户是针对（人）用户的，服务账户针对 Pod 进程。
- 普通帐户是全局性。在集群所有namespaces中，名称具有惟一性。
- 通常，群集的普通帐户可以与企业数据库同步，新的普通帐户创建需要特殊权限。服务账户创建目的是更轻量化，允许集群用户为特定任务创建服务账户。
- 普通帐户和服务账户的审核注意事项不同。

### 授权

#### **Role**

代表一个角色，会包含一组权限，没有拒绝规则，只是附加允许。它是 Namespace 级别的资源，只能作用于 Namespace 之内。

```bash
# 查看已有的角色信息
kubectl get role -n ingress-nginx -oyaml
```

通过配置一个个apiGroup来组织各种资源的权限

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  labels:
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: ingress-nginx
  name: nginx-ingress
  namespace: ingress-nginx
roles:
- apiGroups:
  - ""
  resources:
  - configmaps
  - pods
  - secrets
  - namespaces
  verbs:
  - get
- apiGroups:
  - ""
  resourceNames:
  - ingress-controller-label-nginx
  resources:
  - configmaps
  verbs:
  - get
  - update
- apiGroups:
  - ""
  resources:
  - configmaps
  verbs:
  - create
```

#### **ClusterRole**

功能与 Role 一样，区别是资源类型为**集群类型**(即集群中所有相应资源)，而 Role 只在 Namespace

```bash
# 查看某个集群角色的信息
kubectl get clusterrole view -oyaml
```

有四个内置的ClusterRole

1. cluster-admin；
2. admin；
3. edit；
4. view

其中cluster-admin是整个k8s中最高的权限角色

#### RoleBinding

Role 或 ClusterRole 只是用于制定权限集合，具体作用与什么对象上，需要使用 RoleBinding 来进行绑定。

作用于 Namespace 内，可以将 Role 或 ClusterRole 绑定到 User、Group、Service Account 上。

```bash
# 查看 rolebinding 信息
kubectl get rolebinding --all-namespaces

# 查看指定 rolebinding 的配置信息
kubectl get rolebinding <role_binding_name> --all-namespaces -oyaml
```



```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  ......
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name nginx-ingress-role
subjects:
- kind: ServiceAccount
  name: nginx-ingress-serviceaccount
  namespace: ingress-nginx
```



#### ClusterRoleBinding

与 RoleBinding 相同，但是作用于集群之上，可以绑定到该集群下的任意 User、Group 或 Service Account





## K8S 的资源清单

| 参数名                                      | 类型    | 字段说明                                                     |
| ------------------------------------------- | ------- | ------------------------------------------------------------ |
| apiVersion                                  | String  | K8S APl 的版本，可以用 kubectl api versions 命令查询         |
| kind                                        | String  | yam 文件定义的资源类型和角色                                 |
| metadata                                    | Object  | 元数据对象，下面是它的属性                                   |
| metadata.name                               | String  | 元数据对象的名字，比如 pod 的名字                            |
| metadata.namespace                          | String  | 元数据对象的命名空间                                         |
| Spec                                        | Object  | 详细定义对象                                                 |
| spec.containers[]                           | list    | 定义 Spec 对象的容器列表                                     |
| spec.containers[].name                      | String  | 为列表中的某个容器定义名称                                   |
| spec.containers[].image                     | String  | 为列表中的某个容器定义需要的镜像名称                         |
| spec.containers[].imagePullPolicy           | string  | 定义镜像拉取策略，有 Always、Never、IfNotPresent 三个值可选  - Always（默认）：意思是每次都尝试重新拉取镜像 <br /> - Never：表示仅适用本地镜像<br />  - IfNotPresent：如果本地有镜像就使用本地镜像，没有就拉取在线镜像。 |
| spec.containers[].command[]                 | list    | 指定容器启动命令，因为是数组可以指定多个，不指定则使用镜像打包时使用的启动命令。 |
| spec.containers[].args[]                    | list    | 指定容器启动命令参数，因为是数组可以指定多个。               |
| spec.containers[].workingDir                | string  | 指定容器的工作目录                                           |
| spec.containers[].volumeMounts[]            | list    | 指定容器内部的存储卷配置                                     |
| spec.containers[].volumeMounts[].name       | string  | 指定可以被容器挂载的存储卷的名称                             |
| spec.containers[].volumeMounts[].mountPath  | string  | 指定可以被容器挂载的存储卷的路径                             |
| spec.containers[].volumeMounts[].readOnly   | string  | 设置存储卷路径的读写模式，ture 或者 false，默认是读写模式    |
| spec.containers[].ports[]                   | list    | 指定容器需要用到的端口列表                                   |
| spec.containers[].ports[].name              | string  | 指定端口的名称                                               |
| spec.containers[].ports[].containerPort     | string  | 指定容器需要监听的端口号                                     |
| spec.containers[].ports[].hostPort          | string  | 指定容器所在主机需要监听的端口号，默认跟上面 containerPort 相同，注意设置了 hostPort 同一台主机无法启动该容器的相同副本（因为主机的端口号不能相同，这样会冲突） |
| spec.containers[].ports[].protocol          | string  | 指定端口协议，支持 TCP 和 UDP，默认值为 TCP                  |
| spec.containers[].env[]                     | list    | 指定容器运行前需设置的环境变量列表                           |
| spec.containers[].env[].name                | string  | 指定环境变量名称                                             |
| spec.containers[].env[].value               | string  | 指定环境变量值                                               |
| spec.containers[].resources                 | Object  | 指定资源限制和资源请求的值（这里开始就是设置容器的资源上限） |
| spec.containers[].resources.limits          | Object  | 指定设置容器运行时资源的运行上限                             |
| spec.containers[].resources.limits.cpu      | string  | 指定 CPU 的限制，单位为 Core 数，将用于 docker run –cpu-shares 参数 |
| spec.containers[].resources.limits.memory   | string  | 指定 mem 内存的限制，单位为 MIB、GiB                         |
| spec.containers[].resources.requests        | Object  | 指定容器启动和调度时的限制设置                               |
| spec.containers[].resources.requests.cpu    | string  | CPU请求，单位为core数，容器启动时初始化可用数量， 100m就是0.1核，1000m就是一核 |
| spec.containers[].resources.requests.memory | string  | 内存请求，单位为MIB、GiB，容器启动的初始化可用数量           |
| spec.restartPolicy                          | string  | 定义 pod 的重启策略，可选值为 Always、OnFailure、Never，默认值为 Always。<br />  - Always：pod 一旦终止运行，则无论容器是如何终止的，kubelet 服务都将重启它。<br />  - OnFailure：只有 pod 以非零退出码终止时，kubelet 才会重启该容器。如果容器正常结束（退出码为0），则 kubectl 将不会重启它。<br />  - Never：Pod 终止后，kubelet 将退出码报告给 master，不会重启该 pod |
| spec.nodeSelector                           | Object  | 定义 Node 的 label 过滤标签，以 key：value 格式指定          |
| spec.imagePullSecrets                       | Object  | 定义 pull 镜像时使用 secret 名称，以 name：secretkey 格式指定 |
| spec.hostNetwork                            | Boolean | 定义是否使用主机网络模式，默认值为 false。设置 true 表示使用宿主机网络，不使用 docker 网桥，同时设置了 true将无法在同一台宿主机上启动第二个副本 |
|                                             |         |                                                              |