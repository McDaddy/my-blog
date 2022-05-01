---
title: 不定期更新的CSS经验库
date: 2020-07-07
tags:
 - CSS
categories:
 - CSS

---

作为一个中台的前端开发，大多数情况下只要掌握布局等通用CSS技巧就可以应付日常的主要工作，但难免还是会遇到一些疑难杂症。这里做一个不定期的知识更新

<!-- more -->

## CSS选择器的优先级

下面这种情况，当class选择器数量相同时，写在后面的生效

```html
<div class="main">
<div class="outer">
  <p>This is in the outer div.</p>
  <div class="inner">
    <p class="final">This text is in the inner div.</p>
  </div>
</div>
</div>
```

```css
.outer .inner .final { // 不生效，拥有.final class数目最多，但写在前面被后面覆盖了
  color: red;
}

.main .inner .final { // 生效，拥有.final class数目最多， 且在同时最多的情况下写在后面
  color: green;
}

.final { // 不生效，因为同时拥有.final 但class数目少
  color: blue;
}
```



## Flex详解

虽然已经是非常熟悉的东西了，但还是有知识点可以扣

1. `flex-wrap`默认是`no-wrap`， 默认不换行，即使item是设了width, 但如果里面元素的内容没有大到撑开，那么就会被自动压缩。但如果里面元素的内容需要被撑开，那么它就会溢出父元素
   <img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200707192022442.png" alt="image-20200707192022442" />

   <img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200707192742961.png" alt="image-20200707192742961" style="zoom:80%;" />

2. 父容器有高度，子元素不设高度和行高时，设flex-wrap为wrap。子元素会自动撑满整个父元素的高度。如果子元素有自己的高度，那么就有可能溢出。这点和子元素的width不同，它不依赖子元素的实际高度（是否被内部撑开），只要设了子的高度，那么就实际渲染多高，不像width，即使设了宽度，只要内部撑开，就会被压缩

   <img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200707201314187.png" alt="image-20200707201314187" style="zoom:80%;" />![image-20200707201442446](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200707201442446.png)

   

3. `order`属性可以调整item的顺序，默认item的order值是0，可以任意调整每个元素的值的调整顺序
   <img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200707235014505.png" alt="image-20200707235014505" style="zoom:80%;" />

4. `align-content`的作用是用来分配交叉轴上空间的，默认值是`stretch`所以上面我不设item的height，item会自动撑满整个父元素高度，前提是这个属性要和wrap配合使用，在有换行的情况下才有意义，否则这个属性没有作用。 换句话说，可以把这个弹性盒子里的所有元素考虑成一个元素，这个属性控制的是这个元素在盒子中的对齐关系。而当没有wrap或者不换行是，那么这个内容就是个当行，而单行时，只听align-items，align-content无效。
   <img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200708104218755.png" alt="image-20200708104218755" style="zoom:80%;" />

   

5. `align-items`控制的是当行的对齐，当不设置时，默认是`stretch`，即如果不设item高度或自己没高度时默认撑满高度，当设了其他值之后就会按照item的实际高度来显示
   <img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200708110147838.png" alt="image-20200708110147838" style="zoom:80%;" />

6. `align-self`就是单独给某个item设置可以覆盖父元素align策略的属性

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200708110355428.png" alt="image-20200708110355428" style="zoom:80%;" />

7. `flex-grow`表示如果有额外的空间，每个项目应该如何放大。默认值是**0**，表示不会自动扩大。所以如果item的width都很小或不设，设置其中一个item的flex-grow为任何大于1的值都会撑满所有剩余空间。注意这个属性只有当有剩余空间时才有效，否则还是元素本身的宽度

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200708110943323.png" alt="image-20200708110943323" style="zoom:80%;" />

8. `flex-shrink`和grow是相反的概念。 表示当空间不足时如何压缩每个item，`flex shrink factor` 默认值是1表示所有item都是被均匀压缩比例相同。设成小于1的值不仅不会压缩还会放大，如果设成2，那么在空间不足时会缩为相对于其他item被压缩的比例二分之一，就比方说大家都是200宽其他元素从200被压到了100，那么这个被设成2的就会被压成50，但如果压缩的宽度已经小于内容宽度，这个属性就没用了，除非item都带上overflow

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200708112006005.png" alt="image-20200708112006005" style="zoom:80%;" />

9. `flex-basis`,表示设置flex-grow和flex-shrink之前，item实际的宽度，默认是**auto**，也就是根据item的width或内容决定

   1. 当有剩余空间时，设置flex-basis，width不起作用
      <img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200709184937503.png" alt="image-20200709184937503" style="zoom:80%;" />

   2. 当没有剩余空间时，**设置flex-basis，width不起作用**，item会随比例缩小，7比其他的宽一些是因为它是150，别的是100，同比例缩小
      <img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200709185104038.png" alt="image-20200709185104038" style="zoom:80%;" />

   3. 当flex-basis设为**0**时，item上的宽度完全无效，item的实际宽度取决于内容的实际宽度（前提是没有overflow），第二flex-grow是不是0，如果是0那就是内容的宽度，不是的话在有剩余空间的情况下由剩余空间分配决定。

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200708140000658.png" alt="image-20200708140000658" style="zoom:80%;" />

9. `flex`有4种值, 他的组合顺序是`flex-grow`、 `flex-shrink`和 `flex-basis`

   1. initial: 即默认值相当于 flex: 0 1 auto
   2. auto: item可以按需增长缩小 flex: 1 1 auto
   3. none: 固定item flex: 0 0 auto
   4. 数字：设置flex-basis为0， 比如1，相当于flex: 1 1 0。<u>**注意**</u>  在设数字的情况下，item本身的width是无效的。 在没有剩余空间的情况下，如果内容无法撑开的话这个item设了1反而会被压扁

   

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20200708140744370.png" alt="image-20200708140744370" style="zoom:80%;" />

10. overflow 在flex中的影响， 有时候会出现非常诡异的宽高，我即使设置width但是没有生效，此时如果元素是个flex元素，可能问题不在它本身，而是在它的兄弟节点，如果兄弟节点配置了flex-basis为auto或者flex: auto，此时不管兄弟节点有没有配overflow, 当兄弟节点的内容大于了本来的剩余空间之后，还会继续扩张。原因是当flex-basis为auto时，认为元素的宽度是由元素自己决定，如果元素的实际宽度大了，就会不受控去挤占别的空间
11. 想要flex元素的表现符合预期，**最好在**每个子元素（设置了任意flex/flex-bais/flex-grow/flex-shrink） 外面加overflow
12. 只要设置了flex-basis（非auto）， 那么width将无效



[CSS Flexbox 可视化手册](https://zhuanlan.zhihu.com/p/56046851?edition=yidianzixun&utm_source=yidianzixun&yidian_docid=0LDQZWhi&yidian_s=&yidian_appid=oppobrowser2)

## line-height

`line-height` 1.8什么意思？ 1.8不带单位意思就是1.8em，也等同于180%， 同时lineHeight是可以继承的，如果子元素不设lineHeight而继承父元素的。那么1.8等于子元素自己当前字体的1.8倍，1.8em时等同于父元素的lineHeight计算值。所以尽量不要带em单位。 normalize.css设置line-height默认为1.15，当字体line-height的normal大于1.15就会存在文字显示不全的问题



## Fixed元素的width

`position: fixed`的元素，当设置它的width为百分比时，它会无条件去按照屏幕宽度计算，如果想要限制它的实际值，需要在它的父元素上设置一个具体的数值，注意不是一个类似百分比的计算值，而`必须`是一个具体的值。然后给这个fixed元素设置width为inherit。



## z-index

如何创建层叠上下文

- relative/absoult + z-index的组合

- 把透明度 opacity 设置成比 1 小的值

- 把 position 设置为 fixed 或者 sticky （这种情况无需提供 z-index)

- 把 mix-blend-mode 设置为 multiply、hard-light、difference（normal不行🙅）

- 把 z-index 添加到一个带有 **display：flex** 或者 **display： grid** 的容器里

- 使用 transform， filter， clip-path，或者 perpective

- 把 `will-change` 设置为 `opacity` 或者 `transform`

- 通过 `isolation: isolation` 直接创建上下文（这步最简单最纯粹）

z-index只在同层叠上下文有效，如果是跨域了上下文，即使设置成无限大也没用

[z-index 特喵到底是什么？](https://juejin.cn/post/6951640002526707743)



## client-height vs offset-height vs scroll-height

一张图说明：

- client-height: 可视区域内，元素的高度，包含padding的高度，但**不包括**border和scroll bar的高度
- offset-height: client-height + border +scroll bar的高度，所以没有滚动条和border的话，和client-height是一样的
- scroll-height: 不管可见不可见， 就是content高度 + padding

![image-20211126142315263](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20211126142315263.png)



## 如何防止内容撑开容器高度

有时候一个容器的高度会因为内容而撑开，为了限制它的高度，让内容按需滚动。一种方法是逐层设置`h-full`这样，容器就有明确的高度可以`overflow-auto`,另一种方法是

```css
.parent {
    overflow: auto;
    position: relative;
}

.child {
    position: absolute;
}
```



## overflow属性

一般情况下，我们都了解`auto`和`hidden`的区别，但不知道它的默认值是什么

事实上overflow的默认值是`visible`，即溢出了仍然能看到，常见的误区是以为设置成auto也能看到溢出，但这种情况只限定于普通定位，如果溢出的部分是绝对定位等，那么auto也会导致元素看不到，此时还会以为是层叠上下文的问题走不少弯路。

同时还有两个值，`inherit`表示继承父的overflow属性值，`initial`等同于visible
