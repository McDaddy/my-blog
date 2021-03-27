---
title: Tailwind实战体验
date: 2021-03-26
tags:
 - CSS
categories:
 - 前端工程化



---

## 什么是Tailwind

- 它是一个css框架，且极速流行中（css框架趋势榜稳居第一）
- 它是一个`utility class`的集合，说白了就是一个`className`对应一个css属性的键值对配置，e.g. `flex => display: flex`
- 一种`CSS-in-Js`的实现形式
- 本质就是一个`mixin`的集合（在Erda中已经广泛使用的sass mixin是一回事）

使用起来非常简单

```html
// before
// page.tsx
<div className="page-box">content</div>

// page.scss
.page-box {
	display: flex;
	padding-left: 4px;
	padding-right: 4px;
}

// after
// page.tsx
<div className="flex px-1">content</div>
```



## 原子类

即`utility class`，是`tailwind`的核心概念，也是它区别与其他css框架的根本。

比如对比`Bootstrap`，`Bootstrap`给我们提供了一个个预设好的样式组合，比如一个`Card`，一个`Navigation`，优势是只需写一个类名就可以得到一系列酷炫的具体样式，开发者即使css水平有限也不妨碍写出好看的样式。但如果它的预设和自身项目的设计图出入太大，想要去自定义它就会非常恶心，所以这种css框架比较适合快速建站，对样式没有什么特殊要求的项目使用

相比之下，原子类其实就是反其道而行之，把所有的样式都拆散，把自主权还给开发者，整个原生的`tailwind`没有任何一个组合样式类，开发者相当于是在写HTML的标签中写样式，当然它也不同于纯粹的`css-in-js`， 它能够提供统一的样式管理、自适应等功能



## 有什么特性

1. 方便性

也许`flex => display: flex` 你并不觉得提供了多少便利，但如果是`grid-cols-3`或者`shadow`，可以帮助我们减少很多css书写成本

```css
.grid-cols-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.shadow {
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}
```

2. 语义化

这点我们在Erda目前的sass mixin应该都有体会，只要看类名就知道这个元素的样式是怎么样的，就好像我们看到div和span一样，直觉得就能知道这是怎样的显示效果

3. 基于`rem`的布局

rem布局虽然目前对我们的作用还不大，但这东西有备无患

4. 响应式

告别麻烦的媒体查询，假设一个需求 **响应式布局，一大堆子元素，在大屏幕三等分，中等屏幕二等分，小屏幕一等分？** 如何实现

```html
// before
<div class="container">
  <div class="item"></div>
  ...
</div>

// css/sass/less
@media (min-width: 1024px) {
  .container {
    grid-template-columns: repeat(3,minmax(0,1fr));
  }
}

@media (min-width: 768px) {
  .container {
    grid-template-columns: repeat(2,minmax(0,1fr));
  }
}

.conainer {
  display: grid;
  gap: 1rem;
}

// after 一行搞定
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div class="item"></div>
  ...
</div>
```

5. 可以帮助我们统一管理主题和图片

可以防止组员自己*创造*颜色，而图片来说，统一化管理，不会东一处西一处

6. 支持扩展

可以支持项目定义自己的公用类型，也可以去加载社区的插件，一键暗黑模式也可以轻松实现

7. 支持生产模式的`purge`

即在生产模式下，可以只打包被用到的样式类，一种样式永远只存在一次（注意：className不能写成拼接形式，如果className={`pb-`${num}}, num动态传入各种值，在开发模式下没问题， 但在生产模式postcss无法识别到具体的类名，就会忽略这个类，从而丢失了样式）

8. 支持vscode插件

安装vscode插件，开发效率大幅提升，可以不再去翻阅官方文档

![Kapture 2021-03-28 at 01.07.27](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/Kapture 2021-03-28 at 01.07.27.gif)

## 能解决什么Sass/Less不能解决的问题

- 再也不用为`className`起什么名字费脑子
- 解决了样式与页面本身的强耦合，当我要迁移一个页面到另一处时，我完全不需要担心样式遗漏和污染，每一个class都不是为了某个特定的页面服务的，而是全局的
- 解决样式重复书写的问题，当大面积重构工程时会发现，不同的开发人员在开发自己的页面时，如果不能在公共样式文件中找到合适的样式就会自己写。对于在项目中出现多少次的样式才需要被提出来作为公共类这是有分歧的，也是很难实际操作的。所以最终会看到散落在各处相同的样式片段，既是维护成本又增加了上线代码的体积
- 前端工程化的统一，如果可以成为团队标准，首先成员间的css写法习惯的差距将被抹平也不需考虑`stylelint`，其次跨项目的迁移代码也会变得非常容易，现今如果要跨项目迁移模块，除了要拷贝页面本身的scss文件，还要考虑目标项目是否包含了自身相同的公共样式，操作难度很大
- code review更加轻松，之前样式文件的分离导致了除了scss语法外，几乎没法去review样式，语义化的形式让人可以轻松构想出页面的结构。
- Sass、Less？ 不存在的，让它们成为过去时

## 不足

- 上手简单，但是要做到不查阅文档顺畅书写需要一些时间的适应和记忆，当然有vscode插件的帮助会好很多
- html的结构会变得更长，有时一行的className会撑满一个屏幕