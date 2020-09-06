---
title: WebSocket详解
date: 2020-08-28
tags:
 - Websocket
categories:
 - 网络
---

## 为什么要有WebSocket

- 传统要实现服务器推送的方法，无非轮询和长轮询，就是每间隔一段时间向服务器发送请求看有没有新的消息需要返回。
- 这样的缺点主要有
  - 因为需要不断发请求，HTTP的请求和响应会包含较长的头信息，而实际的信息却只占很小一部分，从而造成带宽的浪费
  - 比较新的轮询技术是`Comet`，但是它采用HTTP长连接，导致会消耗服务器资源
  - 浏览器的network看起来会非常乱，因为有太多无效的轮询
- WebSocket的优点包括
  - 带宽开销小，创建连接以后，数据交换的包头部较小
  - 由于是全双工，更加灵活，两端都可以随时收发数据
  - 可以保持连接的状态，一旦连接成功后，后续的通信都是有状态的，可以省略状态信息
  - 更好的二进制支持，WebSocket有定义一种二进制帧，更容易处理二进制内容

<!-- more -->

## WebSocket API

#### WebSocket对象主要包括以下属性

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200827225853073.png" alt="image-20200827225853073" style="zoom:50%;" />

其中`bufferedAmount`表示未发送到服务器的字节数，onXXX表示各个事件的回调，readyState表示连接的状态（只读）：

1. connecting 正在连接中 值为0
2. open 正在连接并可以通讯 值为 1
3. closing 正在关闭 值为 2
4. closed 关闭成功或连接失败 值为3

#### 主要有两个方法

- close 关闭连接
- send 发送数据到队列中，并增加`bufferedAmount`的值

## 一个客户端WebSocket例子

主要注意点

1. WebSocket的url是ws或wss开头的
2. 通过`socket.addEventListener`来监听事件
3. 需要等到readyState等于OPEN才能发送请求
4. 除了字符串外，还可以发送JSON/Blob/ArrayBuffer/ArrayBufferView(比如Uint32Array)对象

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WebSocket 发送二进制数据示例</title>
    <style>
      .block {
        flex: 1;
      }
    </style>
  </head>
  <body>
    <h3>WebSocket 发送二进制数据示例</h3>
    <div style="display: flex;">
      <div class="block">
        <p>待发送的数据：<button onclick="send()">发送</button></p>
        <textarea id="sendMessage" rows="5" cols="15"></textarea>
      </div>
      <div class="block">
        <p>接收的数据：</p>
        <textarea id="receivedMessage" rows="5" cols="15"></textarea>
      </div>
    </div>

    <script>
      const sendMsgContainer = document.querySelector("#sendMessage");
      const receivedMsgContainer = document.querySelector("#receivedMessage");
      const socket = new WebSocket("ws://localhost:8888");

      // 监听连接成功事件
      socket.addEventListener("open", function (event) {
        console.log("连接成功，可以开始通讯");
      });

      // 监听消息
      socket.addEventListener("message", async function (event) {
        console.log("Message from server ", event.data);
        const receivedData = event.data;
        if (receivedData instanceof Blob) {
          receivedMsgContainer.value = await receivedData.text();
        } else {
          receivedMsgContainer.value = receivedData;
        }
      });

      function send() {
        const message = sendMsgContainer.value;
        console.log("send -> socket.readyState", socket.readyState)
        if (socket.readyState !== WebSocket.OPEN) {
          console.log("连接未建立，还不能发送消息");
          return;
        }
        const blob = new Blob([message], { type: "text/plain" });
        if (message) socket.send(message);
        console.log(`未发送至服务器的字节数：${socket.bufferedAmount}`);
      }
    </script>
  </body>
</html>
```

## 服务端WebSocket

### 生命周期

#### 握手协议

WebSocket属于应用层协议，依赖于TCP协议。通过HTTP的`101`状态码握手，由于WebSocket是通过HTTP握手的，所以它是运行在80或443端口的，同时可以为WebSocket添加自定义的头部

这是**客户端的请求**，必须要包括

Connection = Upgrade 表示连接要升级

Upgrade = websocket 表示要升级成WebSocket协议

sec-WebSocket-version 表示客户端支持的WebSocket版本，固定为13

Sec-WebSocket-Key 用于连接校验

此外还包含一些普通的http头

```
GET ws://echo.websocket.org/ HTTP/1.1
Host: echo.websocket.org
Origin: file://
Connection: Upgrade
Upgrade: websocket
Sec-WebSocket-Version: 13
Sec-WebSocket-Key: Zx8rNEkBE4xnwifpuh8DHQ==
Sec-WebSocket-Extensions: permessage-deflate; client_max_window_bits
```

**服务端响应**

返回101表示确认升级到了WebSocket

connection和upgrade和请求一样

Sec-WebSocket-Accept是通过请求传过去的Key经过验证之后返回的结果

```
HTTP/1.1 101 Web Socket Protocol Handshake ①
Connection: Upgrade ②
Upgrade: websocket ③
Sec-WebSocket-Accept: 52Rg3vW4JQ1yWpkvFlsTsiezlqw= ④
```

#### 消息通信基础

WebSocket的数据通信是通过数据帧传输的，为了防止网络安全问题，客户端会为所有帧添加掩码

数据帧的格式：

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-------+-+-------------+-------------------------------+
|F|R|R|R| opcode|M| Payload len |    Extended payload length    |
|I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
|N|V|V|V|       |S|             |   (if payload len==126/127)   |
| |1|2|3|       |K|             |                               |
+-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
|     Extended payload length continued, if payload len == 127  |
+ - - - - - - - - - - - - - - - +-------------------------------+
|                               |Masking-key, if MASK set to 1  |
+-------------------------------+-------------------------------+
| Masking-key (continued)       |          Payload Data         |
+-------------------------------- - - - - - - - - - - - - - - - +
:                     Payload Data continued ...                :
+ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
|                     Payload Data continued ...                |
+---------------------------------------------------------------+
```

主要把握几部分

1. 第一个字节的8位内容是[FIN, RSV, RSV, RSV, OPCODE, OPCODE, OPCODE, OPCODE];
2. 第一位是状态位，表示当前是FIN（结束）与否，1就是结束了，0就是一个延续帧，表示还有后续的帧要来。取第一位的方法是`firstByte >>> 7`直接右移7位
3. 中间三位无视，直接取后4位opCode表示当前的消息类型，取后四位的方法是`firstByte & 0x0f`, 0x0f就是1111，直接后4位与得到的就是后四位。一下是opcode的对应，其中9和A分别代表心跳检测的ping和pong

```
/**
* %x0：表示一个延续帧。当 Opcode 为 0 时，表示本次数据传输采用了数据分片，当前收到的数据帧为其中一个数据分片；
* %x1：表示这是一个文本帧（text frame）；
* %x2：表示这是一个二进制帧（binary frame）；
* %x3-7：保留的操作代码，用于后续定义的非控制帧；
* %x8：表示连接断开；
* %x9：表示这是一个心跳请求（ping）；
* %xA：表示这是一个心跳响应（pong）；
* %xB-F：保留的操作代码，用于后续定义的控制帧。
*/
```

4. 通过状态位和opcode可以得到消息的分片信息，如果FIN=0 表示这个分片，那么server就不会立即返回而是等待后续的帧

```
Client: FIN=1, opcode=0x1, msg="hello"
Server: (process complete message immediately) Hi.
Client: FIN=0, opcode=0x1, msg="and a"
Server: (listening, new message containing text started)
Client: FIN=0, opcode=0x0, msg="happy new"
Server: (listening, payload concatenated to previous message)
Client: FIN=1, opcode=0x0, msg="year!"
Server: (process complete message) Happy new year to you too!
```



5. 然后接下来就是对具体类型的解析，以文本为例，先取出下一个字节的第一位看是否使用MASK掩码。然后取低7位那payload的长度。
   1. 如果值为 0-125，那么就表示负载数据的长度。
   2. 如果是 126，那么接下来的 2 个字节解释为 16 位的无符号整形作为负载数据的长度。
   3. 如果是 127，那么接下来的 8 个字节解释为一个 64 位的无符号整形（最高位的 bit 必须为 0）作为负载数据的长度。

6. 取出MASK位的数据
7. MASK之后全是payload的数据
8. MASK通过计算把payload还原成原始数据
9. 同理，消息的返回也要遵循这个结构，但是不需要MASK



## WebSocket和Http的关系

两者都属于应用层，依赖于传输层的TCP。 都工作在80和443端口上，WebSocket通过http upgrade来实现

## 什么是Socket

socket的本质是对TCP/IP协议栈的封装，提供了一个真对TCP或者UDP编程的接口。换句话说我们是通过socket来使用TCP/IP

- 几乎所有的应用层协议都是通过socket来通信的
- 可以看成传输层给到上层应用层的接口

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200828011824741.png" alt="image-20200828011824741" style="zoom:67%;" />

参考： [你不知道的 WebSocket](https://juejin.im/post/6854573221241421838)