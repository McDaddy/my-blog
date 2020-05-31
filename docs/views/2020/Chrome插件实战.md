---
title: Chrome插件实战---自制一个cookie复制小插件
date: 2020-05-27
tags:
 - Chrome
categories:
 - 工具

---

## 需求起源

平时工作的一个工程在实际部署时是嵌入在别的系统里的，所以在本地运行时不会有登陆校验的口子，所以平时在本地开发拿数据的方式就是，先在宿主部署环境登陆，然后一行行得复制粘贴`cookie`到`local`地址。有时候经常在不同环境切换，频繁的复制粘贴显然有优化的空间。为此我在Google Store里搜索了所有cookie相关的插件，有些插件功能全面但无法顾及到我这个从A站复制到B站特殊需求，找到一个[Copy Cookie](https://chrome.google.com/webstore/detail/copy-cookie/efgblkeenphclkonjikaanjnlconlkfp?hl=en)看起来是完全符合，但实际运行起来会报错。 于是我尝试在这个插件的基础上改造发布一个新插件。

<!-- more -->

## Chrome插件扫盲

### 什么是Chrome插件

Chrome插件其实和一个普通web应用一样都是由`html`+`css`+`js`经过zip打包组成的，插件可以使用Chrome提供的浏览器API，增强浏扩展览器的功能。
 Chrome插件通常是.crx后缀的文件，通过谷歌网上应用商店下载或者在开发者模式中可以直接拖入到浏览器进行安装。

#### 核心文件manifest.json

主要属性包括

- name: 插件显示的名称
- version: 版本号
- description: 显示在商店的一句话描述
- permissions: 列出这个插件所有权限，[Declare Permissions](https://developer.chrome.com/extensions/declare_permissions#host-permissions)
- icon：用于显示的图标可以分尺寸传不同大小
- browser_action：定义插件默认行为，比如我这是个弹出操作的插件，就需要定义`default_popup`来指定弹出页面的HTML

```json
{
    "manifest_version": 2,
    "name": "Cookie Replicator",
    "version": "1.0.0",
    "description": "一款可以在不同域间复制粘贴Cookie的小插件.",
    "permissions": [
        "tabs",
        "\u003Call_urls\u003E",
        "cookies",
        "contextMenus",
        "unlimitedStorage",
        "notifications",
        "storage",
        "clipboardWrite"
    ],
    "browser_action": {
        "default_popup": "popup.html"
    },
    "icons": {
        "16": "images/icon.png",
        "48": "images/icon.png",
        "128": "images/icon.png"
    },
    "author": "kuimo"
}
```

### 插件组成部分

分为三块，分别运行在不同的环境。这三者不是必须都要实现，实现其中任何一个都可以是一个插件，当然也可以两者或三者都实现来组合

1.  后台页面/事件页面(backgrund)
   顾名思义，后台网页是运行在浏览器后台的，随着浏览器的启动开始运行，浏览器关闭结束运行。 事件页面则是需要调用时加载，脚本空闲时被卸载，两者都是运行在后台。比如`广告终结者`
2.  用户界面网页(popup)
   点击插件出来的小弹窗，每次点击弹出开始运行，弹窗关闭后结束，可以与backgrund脚本交互。
3. 内容脚本(content)
   安装插件后每打开一个网页可以将content脚本注入到页面中，内容脚本可以读取浏览器访问的网页的细节，并且可以修改页面。比如`谷歌翻译`插件可以选词翻译。

### 如何开发

这里拿`popup`举例，实际上就是开发一个纯html页面，里面可以带上css和js。`manifest.json`里定义的`popup.html`就是点击插件图标时弹出来的那个框。在这个框里我们会用到很多浏览器相关的操作，比如对`localstorage/cookie`的增删改查、如何读取当前页面的url信息等等。这些都需要调用[Chrome插件API](https://developer.chrome.com/extensions/api_index)。 如果要一个个学习感觉成本比较大。 我这里是直接clone了一个现成的插件，然后在它的基础上改。这样效率比较高。

### 如何打包

建议使用命令打包, 在工程的根目录下（manifest.json）的位置运行打包命令

```shell
npm install crx
crx pack -o myExtension.crx
```

### 如何安装

- 在`chrome://extensions`中打开开发者模式

- 将上一步打包好的crx拖进来，直接就能安装好，图标右下角的橘黄色标志表示这是本地安装的

  <img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200527195343292.png" alt="image-20200527195343292" style="zoom:67%;" />

### 如何调试

右键点击插件图标 --> 审查弹出内容。 然后就会弹出一个我们熟悉的控制台，上面有`Sources`和`Console`，可以像平时开发代码一样调试。这个方法可以用来调试任何从Google Store上下载的插件

![image-20200527195557795](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200527195557795.png)

## 实现插件

我要实现的功能是能从A站拷贝所有的cookie，然后跑到B站的页面点击粘贴，将所有A站下的cookie都填进去并且domain都改成B站的域名。以下是核心代码。

```javascript
// 拷贝当前site的全部cookie，然后存到localStorage，这个storage不属于A站或B站，而是属于extension
const onCopyButtonClick = () => {
    chrome.tabs.query( // 这步拿到当前active的tab
        {
            status: 'complete',
            windowId: chrome.windows.WINDOW_ID_CURRENT,
            active: true,
        },
        tab => {
            chrome.cookies.getAll({ url: tab[0].url }, cookie => {
                localStorage.aviCookieData = JSON.stringify(cookie);
            });
        },
    );
    setTimeout(() => handlePopupUI('copy'), 200);
};

// 粘贴Cookie
const onPasteButtonClick = () => {
  	// 从localStorage里拿到存的cookie
    const aviCookieData = localStorage.aviCookieData
        ? JSON.parse(localStorage.aviCookieData)
        : null;
    if (!aviCookieData)
        return alert('Oh Man! You need to copy the cookies first.');

    let validTabUrl = true;

  	// 拿到B站的url
    chrome.tabs.query(
        {
            status: 'complete',
            windowId: chrome.windows.WINDOW_ID_CURRENT,
            active: true,
        },
        tab => {
            if (tab[0].url) {
                aviCookieData.forEach(({ name, path, value }, index) => {
                    try {
                        const currentUrl = tab[0].url;
                        const url = new URL(currentUrl);
                      	// 逐一粘贴cookie
                        chrome.cookies.set({
                            url: currentUrl,
                            name,
                            path,
                            value,
                            domain: url.domain || url.hostname, // domain设置为B站
                        });
                    } catch (error) {
                        console.error(`There was an error: ${error}`);
                    }
                });
            } else {
                validTabUrl = false;
                return alert('Tab with invalid URL. Are you kidding me ???');
            }
        },
    );
    setTimeout(() => {
        if (validTabUrl) onResetButtonClick('paste');
    }, 200);
};

```

[完整代码](https://github.com/McDaddy/cookie-replicator)

### 如何发布

发布插件需要注册成为谷歌开发者，还要交5美元才能上传。然后还要准备一系列材料截图之类的。太麻烦了就不搞了。

## 参考

[说说Chrome插件从开发调试到打包发布](https://juejin.im/post/5b55a98ce51d4519873f57af)

[chrome插件调试技巧](https://blog.spoock.com/2016/04/03/chrome-extension-debugging/)