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

### 探针

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

rollingUpdate：即滚动更新，pod 是有序的，在 StatefulSet 中更新时是基于 pod 的顺序倒序更新的

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

DaemonSet直译理解就是**守护进程**，可以用来部署些监控类的服务

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
| spec.containers[].imagePullPolicy           | string  | 定义镜像拉取策略，有 Always、Never、IfNotPresent 三个值可选<br />  - Always（默认）：意思是每次都尝试重新拉取镜像<br />  - Never：表示仅适用本地镜像<br />  - IfNotPresent：如果本地有镜像就使用本地镜像，没有就拉取在线镜像。 |
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