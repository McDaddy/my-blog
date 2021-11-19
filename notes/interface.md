## 整体看板

### 关键指标

![image-20211029140207276](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20211029140207276.png)



建议数据结构：

```json
{
  "data": [
    {
      "name": "all",
      "indicators": [
        {
          "title": "销售业绩", // 以销售业绩为例
          "isRealtime": "boolean", // 是否实时数据
          "value": "number", // 值
          "ratio": "number", // 值占比
          "trendPercentage": "number", // 增加减少的比例 如果减少就是负数，最多保留两位小数
          "health": "good/normal/bad" // 对应 红黄绿
        },
        ...
      ]
    },
    {
      "name": "online",
      "indicators": []
    },
    {
      "name": "offline",
      "indicators": []
    }
  ]
}
```



### 整体业绩趋势

![image-20211029141638565](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20211029141638565.png)

建议数据结构

所有折线图通用

- xAxisData是数组，里面是标准时间戳字符串，比如`2021-10-30 00:00:00`就是`1635523200000`
- data是数组，数量决定有多少条线，`name`属性是线的名称，比如`业绩`，`value`是具体值，即一个数字数组，数量**必须**和上面的xAxisData数组一致

```json
{
  "xAxisData": [163549600000, 1635496000],  // x轴的数据，这里是时间
  "data": [
    {
      "name": "string",
      "value": [1, 2]
    },
    {
      "name": "string",
      "value": [3, 4]
    }
  ]
}
```



### 线下门店

![image-20211029141911423](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20211029141911423.png)



建议数据结构

散点图通用数据结构

二维数组

每个子数组代表每个点的横纵坐标，即第一位是横坐标值，第二位是纵坐标值。如果需要展示店铺名称等信息，可以扩展成三位的子数组

```json
{
  "data": [
    [1, 2],
    [3, 4],
    [5, 6]
  ]
}
```

右侧店铺信息结构： 一维数组

```json
{
  "data": [
    {
      "title": "string",
      "value": "number",
      "ratio": "number",
      "trendPercentage": "number"
    }
  ]
}
```



### 线上微店

![image-20211029194025891](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20211029194025891.png)



单柱柱状图通用数据结构

```json
{
  "xAxisData": [163549600000, 1635496000],  // 同上折线图
  "data": [1,2]
}
```





### 商品板块

![image-20211029142609398](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20211029142609398.png)

左侧板块建议数据结构

健康度需要返回具体数值和等级 `优秀/正常/差`

```json
{
  "data": {
    "health": { "value": "number", "level": "good/normal/bad" },
    "details": [
      // 对应采购/销售/库存
      {
        "title": "采购", // 以采购为例
        "indicators": [
          {
            "title": "采购金额",
            "value": "number",
            "trendPercentage": "number"
          },
          {
            "title": "采购数量",
            "value": "number",
            "trendPercentage": "number"
          }
        ],
        "description": ["number", "number"] // 对应 排x位 还差x人
      }
    ],
    ... // 销售/库存
  }
}
```

右侧雷达图建议数据结构

```json
{
  "indicator": [ // 代表维度 需要名称和最大值
    { "name": "key1", "max": "number" },
    { "name": "key2", "max": "number" }
  ],
  "data": [
    {
      "value": ["number", "number"], // 数据每个维度的值，数量必须和上面的维度定义个数相等
      "name": "当前数据" 
    },
    {
      "value": ["number", "number"],
      "name": "平均数据"
    }
  ]
}
```



### 营销板块

![image-20211101114638108](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20211101114638108.png)

建议数据结构

```json
{
  "data": {
    "health": { "value": "number", "level": "good/normal/bad" },
    "details": [
      // 对应售前/中/后 三块
      {
        "title": "售前", // 以售前为例
        "indicators": [
          {
            "title": "优惠投放",
            "value": "number",
            "trendPercentage": "number",
            "health": "good/normal/bad" // 对应 红黄绿
          },
          {
            "title": "领取人次",
            "value": "number",
            "trendPercentage": "number",
            "health": "good/normal/bad"
          }
        ],
        "description": ["number", "number"] // 对应 排x位 还差x人
      },
      ... // 售中/售后
    ]
  }
}
```



### 营销毛利率

![image-20211101132757553](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20211101132757553.png)

建议数据结构，上方数据

```json
{
  "data": [
    {
      "title": "string", // 名称
      "value": "number",
      "trendPercentage": "number"
    }
  ]
}
```

下方柱状图

```json
{
  "xAxisData": ['营销实绩', '商品成本', '优惠券', '积分'],  // 同上
  "data": [1,2,3,4] // 对应的4个数字
}
```







### 营销投入拆解

![image-20211029143058087](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20211029143058087.png)

建议数据结构，每个数组按投入后端做好排序，从大到小排序，总数不超过10个

```json
{
  "preSale": ['string', 'string', ...],  // 活动名称集合
  "onSale": ['string', 'string', ...], 
  "afterSale": ['string', 'string', ...]
}
```



### 会员板块

![image-20211101142400184](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20211101142400184.png)

建议数据结构同上（营销板块）

### 会员结构与贡献度

![image-20211029143426676](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20211029143426676.png)



上方数据结构同营销毛利率

矩阵图和饼图 数据结构一样

```json
{
  "data": [
    {
      "title": "string", // 会员类名称
      "value": "number",  // 人数/人均销售额
    },
    ...
  ]
}
```

### 商品详情

![image-20211101143954638](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20211101143954638.png)

建议数据结构

```json
{
  "data": [
    {
      "title": "全类型",
      "list": [ // 后端直接按照排名顺序放在这个数组里
        { 
          "title": "2021xxxx外套", // 款型
          "image": "https://xx.xx.x.jpg", // 商品图片
          "amount": "number", // 销量
          "performance": "number", // 业绩
          "stockToSalesRatio": "number", // 存销比
          "discount": "number" // 销售折扣
        }
      ]
    },
    {
      "title": "鞋类",
      "list": []
    },
    {
      "title": "服饰类",
      "list": []
    },
    {
      "title": "配件类",
      "list": []
    }
  ]
}
```





## 店铺看板

### 目标达成度

![image-20211101153353600](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20211101153353600.png)

建议数据结构

```json
{
	"achieved": "number", // 已达成
  "unachieved": "number", // 未达成
  "description": ["number", "number"] // 排x位，还差x人
}
```

![image-20211101153930401](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20211101153930401.png)

建议数据结构 6位长度的数组

```json
{
	"data": [
		{
      "title": "微店业绩",
      "value": "number", // 值
      "trendPercentage": "number", // 上升下降百分比
      "health": "good/normal/bad" // 对应 红黄绿
    },
    ...
	]
}
```



### 活动业绩

![image-20211101154448651](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20211101154448651.png)

建议数据结构 同折线图

```json
{
  "xAxisData": ['活动1', '活动2'],  // x轴的数据，这里是活动名称
  "data": [
    {
      "name": "收入",
      "value": [1, 2]  // 对应活动1，活动2
    },
    {
      "name": "销售折扣",
      "value": [3, 4]
    },
    {
      "name": "销售占比",
      "value": [3, 4]
    }
  ]
}
```



### 导购贡献度

![image-20211101155759632](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20211101155759632.png)

建议数据结构

```json
{
  "data": [
    {
      "title": "线下", // 线下线上
      "indicators": [
        {
          "title": "接待数", // 指标名称
          "value": "number" // 值
        }
      ],
      "topSellers": [
        {
          "name": "张三", // 名字
          "image": "https://xx.xx.x.jpg", // 图片
          "salesQuantity": "number", // 销量
          "salesAmount": "number" // 销售额
        }
      ]
    }
  ]
}
```



### 品类排名

![image-20211101160755511](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20211101160755511.png)

建议数据结构

```json
{
  "data": [
    {
      "type": "online/offline", // 线下线上
      "types": [ // 品类数组
        {
          "title": "全量", // 品类名称
          "list": [
            {
              "title": "耐克xxx", // 品名
              "image": "https://xx.x.x.jpg", // 图片
              "discount": "number", // 销售折扣
              "salesQuantity": "number", // 销量
              "stockQuantity": "number" // 存量
            }
          ]
        }
      ]
    }
  ]
}
```



### 行动路径

![image-20211101161747942](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20211101161747942.png)


建议数据结构 雷达图同**商品板块**，右侧数据

```json
{
	"data": [ // 一维数组
    {
      "title": "销售折扣",
      "value": "number", // 百分比值
      "health": "good/normal/bad" // 对应 红黄绿
    },
  ]
}
```





### 会员

![image-20211101163023973](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20211101163023973.png)

建议数据结构

会员结构

```json
{
  "data": [
    {
      "title": "普通会员", // 会员类名
      "value": "number", // 数量
      "ratio": "number" // 占比
    }
  ]
}
```

人均消费

```json
{
  "data": [
    {
      "title": "普通会员", // 会员类名
      "value": "number", // 消费总额
      "frequency": "number", // 消费频次
      "ratio": "number" // 占比
    }
  ]
}
```



下面部分同营销毛利率



### 用户路径

![image-20211101163432446](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20211101163432446.png)

建议数据结构

上方表格

```json
{
	"data": [
		{
			"type": "online/offline", // 线上线下
			"regularPriceProportion": "number", // 正价占比
			"salesAmount": "number", // 销售额
			"perCustomerPrice": "number", // 客单价
			"orderQuantity": "number" // 客单量
		}
	]
}
```

下方两个柱状图

```json
{
  "xAxisData": ['进入商场', '浏览详情', ...],  // 这里是纵轴，但依然是这个名字
  "data": [{ "value": "number", "trendPercentage": "number" }] // 对应的值
}
```



### 直播

![image-20211101171155123](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20211101171155123.png)

建议数据结构

上面数据

```json
{
   "duration": "number", // 时间
   "salesAmount": "number", // 销售额
   "salesContribution": "number", // 销售贡献
}
```

两个折线图

```json
{
  "xAxisData": [163549600000, 1635496000],  // x轴的数据，这里是时间
  "data": [1, 2] // 对应的销售额/购买量
}
```

下面数据

```json
{
  "data": [
  	{
  		"liveDate": "2021-10-07 21:00:00", // 直播时间字符串
  		"consumers": "number", // 消费人数
  		"salesAmount": "number", // 销售金额
  		"details": [
  			{
  			  "itemInfo": "2021xx外套", // 带货信息
  			  "price": "number", // 金额
  			  "sales": "number" // 销量
  			}
  		]
  	}
  ]
}
```



### 全部导购

![image-20211101172842246](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20211101172842246.png)

建议数据结构

```json
{
	"data": [
		{
			"name": "张三", // 销售名字
      "image": "https://xx.x.x.jpg", // 图片
      "salesQuantity": "number", // 销量
      "salesAmount": "number", // 金额
      "receptions": "number", //接待量
      "deals": "number", // 成交数
      "perCustomerPrice": "number", // 客单价
			"orderQuantity": "number", // 客单量
      "salesQuantityTopList": [
        {
          "title": "PUMAxxx外套", // 品名
          "value": "number", // 销量
          "trendPercentage": "number", // 趋势
        }
      ],
      "salesAmountTopList": [
        {
          "title": "PUMAxxx外套", // 品名
          "value": "number", // 金额
          "trendPercentage": "number", // 趋势
        }
      ],
		}
	]
}
```

