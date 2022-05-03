---
title: Erda Form内测发布
date: 2022-02-01
tags:
 - 组件库
 - 表单
categories:
 - 前端工程化
---

# Erda Form内测发布

Erda Form是一个基于`formily`封装的高性能场景化的Form组件。**也许与你之前遇到的Form都不一样**

## Form痛点集合

- 无法支持具体场景，比如域之间的联动
  - A域触发B域的变化，势必需要在页面上增添一个新的state。如果复杂表单，state难以控制与维护
  - 逻辑散乱，表单的逻辑遍布了整个页面，无法做到内聚
  - 在配置化的使用场景下，表单布局很不灵活
    - 表单中插入一些无关的片段
    - 不规则的表单排布，甚至嵌套排布
    - 分步表单
    - 自增表单
- 性能问题，更改单个域会引起整个表单甚至页面的重渲染
- 配置表单时，组件的属性做不到ts校验



## formily简介

### 什么是`formily`?

formily是阿里的一个表单解决方案，是阿里底座级的开发工具



### 为什么需要formily?

- Formily基本支持中台所能遇到的所有场景
- O(1)级别的渲染性能
- 开箱即用，并且有针对`antd`的封装
- 支持组件协议，自定义组件接入成本低

缺点是入门上手的门槛比较高，学习成本大



### formily有什么特性

#### **json-schema 同时描述数据与UI**

什么是[json-schema](https://json-schema.org/draft/2020-12/json-schema-validation.html)?  *是一种描述JSON数据结构的方式*

如何描述下面的数据结构？

```json
{
  "productId": 1,
  "productName": "A green door",
  "price": 12.50,
  "tags": [ "home", "green" ]
}
```

用json来描述json数据结构

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/product.schema.json",
  "title": "Product",
  "description": "A product from Acme's catalog",
  "type": "object",
  "properties": {
    "productId": {
      "description": "The unique identifier for a product",
      "type": "integer"
    },
    "productName": {
      "description": "Name of the product",
      "type": "string"
    },
    "price": {
      "description": "The price of the product",
      "type": "number",
      "exclusiveMinimum": 0
    },
    "tags": {
      "description": "Tags for the product",
      "type": "array",
      "items": {
        "type": "string"
      },
      "minItems": 1,
      "uniqueItems": true
    }
  },
  "required": [ "productId", "productName", "price" ]
}
```

想象一下，这就是一个product的表单，那是不是就可以完美描述我们需要维护提交的form表单数据，同时因为json-schema自带校验功能，我们只需要遵照它的规范来写字段条件就可以完成对表单的校验

那么同时，如果我们想在配置中完成对UI的描述，那么就需要去扩展这个协议。formily的做法是增加了一系列`x-`开头的属性，做到不污染原始的json-schema规则。

- x-decorator：包裹字段的组件
- x-component: 字段组件
- x-component-props: 字段组件的props
- ……

```javascript
const schema = {
  type: 'object',
  properties: {
    input: {
      title: '输入框',
      type: 'string',
      'x-decorator': 'FormItem',
      'x-component': 'Input',
    },
  }
}
```



#### **effect集中控制整个表单的逻辑**

如果我们要实现字段联动，不再需要在页面中额外定义state，而是在`createForm`时做一个集中的管理，这与我们日常熟悉的表单联动有比较大的区别

```javascript
import React from 'react'
import { createForm, onFieldValueChange } from '@formily/core'
import { createSchemaField } from '@formily/react'
import { Form, FormItem, Input, Select } from '@formily/antd'
import { Button } from 'antd'

const form = createForm({
    effects() {
      onFieldValueChange('select', (field) => {
        form.setFieldState('input', (state) => {
          //对于初始联动，如果字段找不到，setFieldState会将更新推入更新队列，直到字段出现再执行操作
          state.display = field.value
        })
      })
    },
})

const SchemaField = createSchemaField({
  components: {
    Input,
    FormItem,
    Select,
  },
})

const schema = {
  type: 'object',
  properties: {
    select: {
      title: '控制者',
      type: 'string',
      'x-decorator': 'FormItem',
      'x-component': 'Select',
      enum:[
        { label: '显示', value: 'visible' },
        { label: '隐藏', value: 'none' },
        { label: '隐藏-保留值', value: 'hidden' },
      ]
    },
    input: {
      title: '受控者',
      type: 'string',
      'x-decorator': 'FormItem',
      'x-component': 'Input',
    },
  }
}

export default () => (
  <Form form={form} labelCol={6} wrapperCol={10}>
    <SchemaField schema={schema} />
    <Button onClick={() => console.log(form.values)}>提交</Button>
  </Form>
)
```



#### 路径系统

为了解决字段寻址的问题，我们在实际操作中

- 很多时候表单的数据不是一层的，也许会有多层
- 有时候需要批量地处理字段

而这些都被封装在`@formily/path`这个包中 

```javascript
// 如何在初始化时，根据条件批量禁用部分字段
createForm({
  effects: () => {
    onFormMount(() => {
      form.setValues(eventDetail);
      if (eventDetail) {
        form.setFieldState('a.b.c', (state) => {
          state.componentProps = { ...state.componentProps, disabled: true };
        });
        if (eventDetail.source === 'default') {
          form.setFieldState('*(!description,customRemark)', (state) => {
            state.componentProps = { ...state.componentProps, disabled: true };
          });
        }
      }
    });
  },
});
```



#### 生命周期

formily提供了针对Form和Field两者几乎所有生命周期的函数事件钩子，这样就实现了对整个form全局的掌控



#### 协议驱动

使用json-schema来描述数据和UI，从而我们可以做到用一份静态的json配置来实现一个动态form表单，而上面的effects，可以通过`x-reactions`来实现

```json
{
  "type": "object",
  "properties": {
    "source": {
      "type": "string",
      "title": "Source",
      "x-component": "Input",
      "x-component-props": {
        "placeholder": "请输入"
      }
    },
    "target": {
      "type": "string",
      "title": "Target",
      "x-component": "Input",
      "x-component-props": {
        "placeholder": "请输入"
      },
      "x-reactions": [
        {
          "dependencies": ["source"],
          "when": "{{$deps[0] == '123'}}",
          "fulfill": {
            "state": {
              "visible": true
            }
          },
          "otherwise": {
            "state": {
              "visible": false
            }
          }
        }
      ]
    }
  }
}
```

这就是一个非常纯粹的后端驱动前端的协议，前端在这里扮演的只是一个解析生成器的角色，通过后端返回的json配置，动态生成一个组件，而当这个组件生成渲染完毕之后，随即和后端解绑了，该调接口调接口，该调三方调三方。因为你返回JSON配置的服务，未必和真正的后端业务服务是一起的，这样就非常得轻量，结构清晰，同时性能又非常好。



#### 分层架构

优雅的分层设计

![img](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/O1CN01iEwHrP1NUw84xTded_!!6000000001574-55-tps-1939-1199.svg)



## formily原理简析

### 精确渲染

这是formily性能优秀的关键。之前form解决方案性能差的一个主要原因是form在联动或者校验之类的操作时，无法避免全量渲染，即我目标只想通过改变A和B，但不幸，整个页面都被重新render了，虽然React有diff算法，可以避免实际的DOM操作，但是计算量不可避免，所以就需要一个精确渲染的方案。

#### 1.x

先回顾下formily 1.x的方案。概念是所谓的**分布式状态管理**，即每个字段都自己管自己的状态，每次输入时，都只渲染当前字段，变更值后更新自己的状态同时自动同步到formState，然后FormState再把最新的状态下行同步给所有子字段，如果哪个字段是被联动的，那就会二次触发这个循环。看起来这是一个无限循环，那么怎么停下来呢？ 答案就是做**脏数据检查**，简单得说就是判断前后两次state是不是一样。

假设有100个字段且都有默认值，那么在初始化时，每个字段都会做一次上行的同步，然后form再下行同步给100个字段（包括自己），如此下来，总共要做100的平方次同步计算。同时，一个state可能有N个属性， 脏数据检查需要对比每个属性是否变化，假设只有10个属性，那么一个form初始化就要做1w * 10 = 10w次的对比计算。 从而产生性能问题。后期1.x通过利用immer的特性和惰性同步两个优化，基本把这个性能问题解决了。

![img](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/v2-e409fb4fd90afe57369544794ec7991c_720w.jpg)



#### 2.x

然后formily 2.x完全重写了这块逻辑，原因是之前这个方案，不论如何优化，都是需要一个主动的同步过程，即A变了主要一个机制主动去通知B。那么有没有一种方案可以做到**响应式**，即这个通知是被动产生的，不需要主动去触发。作者从mobx那里得到了灵感

这里我们先回顾和了解下Mobx，首先对比下它和redux的使用区别

redux的过程

- 派发action
- reducer接收action，依据原有的state，结合action和payload，产生一个新的state，返回给store
- UI和store绑定，接收到store状态的更新，进而更新视图

mobx的过程

- 在store中定义被观察的状态，做一个深度代理
- 在UI中，可以直接操作状态，mobx会有一个响应式的监听
- 监听到变化后，要么产生computed values，要么触发Reaction（其实就是个effect）
- UI与store绑定，会根据状态更改的粒度去更新UI

**步骤简单，心智负担小**

它不需要去定义繁琐的action，所有的改动都是自然而然的，和我们操作代码的习惯一般，在我们直接修改状态的同时，就把更新与副作用都实现了。 从某种意义上来说，redux是主动的，因为需要主动发起action，而mobx是被动的，副作用是手动修改状态后被动发生的。这点和vue的响应式思想是很类似的

**性能高效**

举个例子， 假设下面的message是一个组件的props

```javascript
let message = mobx.observable({
    title: "Foo",
  	age: 19,
    author: {
        name: "Michel"
    },
    likes: [
        "John", "Sara"
    ]
});

mobx.autorun(() => {
    console.log(message.title) // 打印两次
})
console.log(message.title)
mobx.autorun(() => {
    console.log(message.age) // 只会打印一次
})
message.title = 'abc'
```

- 如果是通过redux和组件关联，那么假设，组件里只用到message中的author属性，那么message.title改变后，这个组件是会被重新渲染的，即使组件中根本没用到这个属性。因为整个message是一个新的state。虽然通过dom diff可以避免实际的dom操作，但是渲染这个步骤是确实发生了
- 如果是通过mobx和组件关联，同样情况下，改变title，不会使得只引用author的组件重新渲染，这就是说它高效的原因



**那么Mobx是怎么实现响应式的么？**

**深度代理**

首先，做到响应式，肯定不是一层能响应，比如`{ a:1 }`改变a的值可以响应，同时如`{ a: { b: 1} }`当修改b的时候也要能做到响应式，这里就需要一个深度代理

```javascript
function deepProxy(val, handler) {
  // 如果是非对象就直接返回其本身，或者说只代理对象
  if (typeof val !== "object") {
    return val;
  }
  // 从直觉上讲，我们应该先创建自身的proxy，然后遍历属性，创建各自的proxy然后添加回自身
  // 但是这样会有一个问题，当创建子属性的proxy后，赋值回来的时候，因为父的proxy已经建立好了
  // 此时就会无缘无故触发了父的set方法，比如一个val有100个属性，那么就相当于这个proxy被修改了100次，触发100次set
  // 所以，只能做一个类似后续遍历的操作，先把子都代理好，然后再来代理父
  for (const key in val) {
    val[key] = deepProxy(val[key], handler);
  }
  return new Proxy(val, handler()); // 子都搞定了，最后创建自身的proxy
}

function createObservable(val) {
  // 统一定义proxy的handler
  const handler = () => ({
    get(target, key) {
      return Reflect.get(target, key);
    },
    set(target, key, value) {
      return Reflect.set(target, key, value);
    },
  });
  return deepProxy(val, handler);
}

const obj = createObservable({ a: { b:2 } });
obj.a.b = 3 // 此时obj.a.b的set会被调用
console.log(obj);
```

**依赖收集**

有了代理之后，相当于知道了哪些对象是可被观察的同时是可响应的。但可被观察对象不代表改变了就会触发副作用，需要代码来决定去监听某些部分的变化。比如下面的代码，除了初始化，仅会在author变化时执行，而其他属性变化时不会执行

```javascript
autorun(() => {
  console.log(message.author);
})
```

大致原理

- 每次调用autorun，会把回调函数暂存到nowFn
- autorun会在初始化执行一次handler，而handler中一定会调用到属性的get，即`.`
- 每次创建代理对象时，创建一个reaction对象，当触发get时，调用collect方法收集依赖
- reaction中定义一个store，是为了如果某个属性，被多个autorun回调，那么就要存成一个数组
- handler第一次执行结束，nowFn重新变成null
- 当set值时，调用reaction.run方法，取出所有存起来的handler回调一起执行
- **注意** 收集依赖时`console.log(obj.a.b)`a和b的get都会被调用
- **注意** 改值时，`obj.a.b = 3` 只会在b的set上执行，而a是不会被执行到的，所以只会执行b上面的reaction收集回调
- 如果写成`obj.a = 3`，此时b的reaction就不会执行了，会执行a的reaction，而此时虽然不是直接改b，但是因为b已经不存在，所以会打印undefined

```javascript
// 全局定义，只有一个
let nowFn = null;

class Reaction {
  constructor() {
    this.store = [];
  }

  collect() {
    // 这个判断是和end清除nowFn结合使用
    // 如果我是在autorun之外触发了get，那就不应该被收集依赖，这里就确保只有autorun里面的变量被收集
    if (nowFn) {
      this.store.push(nowFn);
    }
  }

  run() {
    if (this.store.length) {
      this.store.forEach((w) => w());
    }
  }

  static start(handler) {
    nowFn = handler;
  }

  static end() {
    nowFn = null;
  }
}

const autorun = (handler) => {
  Reaction.start(handler);
  handler();
  Reaction.end();
};

function createObservable(val) {
  const handler = () => {
    const reaction = new Reaction(); // 每次创建代理都有一个reaction实例
    return {
      get(target, key) {
        reaction.collect(); // handler首次执行时收集依赖
        return Reflect.get(target, key);
      },
      set(target, key, value) {
        const r = Reflect.set(target, key, value);
        reaction.run(); // 修改变量时执行存储的回调
        return r;
      },
    };
  };
  return deepProxy(val, handler);
}

const obj = createObservable({ a: { b: 2 } });

autorun(() => {
    console.log(obj.a.b);
})

obj.a = 3
```

在fomily中，在createForm时，我们传入了effects，这就做到了在初始化实现依赖收集，哪些字段是关联的都在一开始被确定下来。这样，如上的例子中，select字段变化了，会因为响应式自动触发注册的回调，而不需要去广播这个变化，而被关联的字段input也会被精确更新。

## Erda Form

既然formily如此牛逼，那是不是直接推formily就好了？我认为还是有些遗憾

- json-schema的配置方法和Erda的render form差距比较大，切换成本太高
- 很多共用属性需要重复配置，比如x-decorator，form grid等，这些可以通过手段减免掉
- ts提示不友好，无法保证我们输入的组件属性都是正确的



在如何createForm上面和formily保持一致，没有任何改变，封装主要是针对字段配置，不需要写`x-` 非常像nusi的form builder

```javascript
const formFieldsList = createFields([
    {
      component: Input,
      name: 'id',
      title: '事件id',
      required: true,
      customProps: {
        maxLength: 16,
      },
      validator: EN_UNDERLINE_REG,
    },
])
  
// 等价于以下， 自动封装了布局信息
const schema = {
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': { layout: 'vertical' },
      properties: {
        grid: {
          type: 'void',
          'x-component': 'FormGrid',
          'x-component-props': {
            maxColumns: 1,
          },
          properties: {
            id: {
              title: '事件id',
              type: 'string',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-component-props': { maxLength: 16 },
              'x-validator': EN_UNDERLINE_REG
            },
          },
        },
      },
    },
  },
}
```

同时在封装后，可以实现组件props的校验

## What else？

嵌套表单

动态表单