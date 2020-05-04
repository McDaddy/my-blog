---
title: 如何利用自签名搞定本地直连https
date: 2020-05-02
tags:
 - Https
 - 证书
 - Nginx
categories:
 - 网络
---

最近由于测试环境开启了Https，导致了原先通过Nginx直接反向代理server地址的本地转发方法失效，只能看着测试环境却无法调试，今天我来尝试用自签名证书的方法解决这个问题。

<!-- more -->

## 利用OpenSSL制作一个本地的自签名证书

具体方法参考[链接](https://blog.csdn.net/nklinsirui/article/details/89432430)

1. 生成私钥

```shell
# genra	生成RSA私钥
# -des3	des3算法
# -out server.key 生成的私钥文件名
# 2048 私钥长度
openssl genrsa -des3 -out server.pass.key 2048
```

![JzV8W8.png](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/JzV8W8.png)

这步要输入两次相同的密码，四位就够了，用1234就行， 第二步还要用

2. 去除私钥中的密码

```shell
openssl rsa -in server.pass.key -out server.key
```

![JzVXTI.png](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/JzVXTI.png)
这步要输入上一步的密码来去除密码

3. 生成CSR(证书签名请求)

```shell
# req 生成证书签名请求
# -new 新生成
# -key 私钥文件
# -out 生成的CSR文件
# -subj 生成CSR证书的参数
openssl req -new -key server.key -out server.csr
```

![JzegaR.png](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/JzegaR.png)

除了Common Name之外的内容都直接回车跳过即可，重点是Common Name要写上这个https的域名或者泛域名

4. 生成自签名SSL证书

```
# -days 证书有效期
openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt
```

> X.509证书包含三个文件：key，csr，crt。
key是服务器上的私钥文件，用于对发送给客户端数据的加密，以及对从客户端接收到数据的解密
csr是证书签名请求文件，用于提交给证书颁发机构（CA）对证书签名
crt是由证书颁发机构（CA）签名后的证书，或者是开发者自签名的证书，包含证书持有人的信息，持有人的公钥，以及签署者的签名等信息
> 备注：在密码学中，X.509是一个标准，规范了公开秘钥认证、证书吊销列表、授权凭证、凭证路径验证算法等。

![JzmRmQ.png](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/JzmRmQ.png)

以上步骤如果嫌麻烦也可以直接用链接里的自动生成脚本，效果一样。

## 配置Nginx

```shell
upstream dcos_server {
  server openapi.default.svc.cluster.local:9529; # vpn address 这里一定要用后端服务的内部地址，因为ip和公网地址都已经被包了ssl
}
server {
  listen 80; # default_server;
  listen 443 ssl; # default_server;

  ssl_certificate /Users/chenweitao/cert/prod/server.crt;
  ssl_certificate_key /Users/chenweitao/cert/prod/server.key;

  ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
  ...
}
```

把刚才生成的私钥文件和自签名证书引到这里来， 现在我们切好host连上VPN重启Nginx尝试连下生产环境。

![JzuNad.png](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/JzuNad.png)

此时Chrome告诉我们服务器返回了异常的错误凭据，点开证书看到这是一个未经过三方认证的证书，言下之意就是它认为这是一个没有被CA认证过的假证书，而假证书很可能是黑客攻击的手段，所以Chrome强制阻止了我们的访问，那么我们下一步就是如何让浏览器去信任这个证书

![JzucZQ.png](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/JzucZQ.png)

## 授信证书
https证书这一整套操作的目的就是为了防止客户端在发起请求时被黑客在中间监听篡改或劫持，那么如果客户端自己认定这个是安全的，那么就可以绕过浏览器的约束。

1. 在系统里找到*钥匙串访问*， 可以用🎩快捷找到

![JzK8Wq.png](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/JzK8Wq.png)

2. 点击登录 -> 左上角加号 -> 上传刚才生成的crt自签名证书 -> 双击上传好的证书 -> 选择*始终信任*

![JzQgde.png](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/JzQgde.png)

此时再试下刷新页面，就能成功进入了。 虽然证书还是被Chrome认定为不安全的假证书，但因为本地授信所以不影响访问

![JzQjWn.png](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/JzQjWn.png)

## 参考
[RSA的主场-证书签名&OpenSSL演示](https://juejin.im/post/5c34a71af265da6130750d60)

[别闹！自签名证书！](https://zhuanlan.zhihu.com/p/41501360)