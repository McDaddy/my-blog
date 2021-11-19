## 接口返回规范

统一按照erda的返回结果体，后面的文档只列出`data`的结构定义

```json
{
	"data": string || number || boolean || array || object, // 具体由后端组织的结构体
  "err": {
    "code": string,
    "msg": string,
  },
  "userIDs": number[],
  "userInfo": { id: number, name: string, nick: string }[]  
  "success": boolean,
}
```





## 埋点验证

应用类型和平台前端写死，不需要后端返回

应用类型及平台：

```javascript
APP-iOS  // iOS应用
APP-Android  // 安卓应用
WEB-WEB  // PC web
Applet-WeChat  // 微信小程序
```



### SDK版本接口

接口入数： 无

接口出参 `data`

```javascript
// 如果名称和值是同样的，那就直接一个string数组
{
  title: string, // 名称
  value: string, // sdk值
}[] // 数组   
```



### 列表接口

接口入参 (?: 表示是可选的参数)

```javascript
{
  appType?: string[], // 平台及应用类型，见上
  sdkVersion?: string[],
  appKey?: string,
  eventId?: string,
  deviceId?: string,
  updateDataRange?: [string, string],
  pageNo: number,
  pageSize: number,
}
```



接口出参 `data`

```javascript
{
  list: {
    id: string, // 唯一键
    appKey: string,
    eventId: string,
    deviceId: string,
    uploadDate: string, // yyyy-MM-dd hh24:mm:ss
    data: string
  }[],
  total: number
}
```



### 批量导出

接口入参

```javascript
{
  ids: string[]
}
```

接口出参： `blob`



## 埋点管理-事件管理

### 列表接口

接口入参 (?: 表示是可选的参数)

```javascript
{
  appType?: string[], // 平台及应用类型，见上
  source?: string, // 来源
  sdkVersion?: string[],
  isUploaded?: string,
  event?: string, // 事件id或名称
  collectionStatus?: string, // 采集状态
  pageNo: number,
  pageSize: number,
}
```

接口出参 `data`

```javascript
{
  list: { 
    eventId: string,
    eventName: string,
    source: string, // default或userDefined
    collectionStatus: string, // collecting 或者 uncollected
    isUploaded: boolean,
  }[],
  total: number
}
```



### 事件详情接口

接口入参 (?: 表示是可选的参数)

```javascript
{
	eventId: string, // 可拼接在Url中
}
```

接口出参 `data`

```javascript
{
	eventId: string,
  eventName: string,
  collectionStatus: string, // collecting 或者 uncollected
  description: string,
  customRemark: string,
  source: string, // default或userDefined
  paramQuantity: number, // 参数数量
  sdkVersion: string[],
  appType: string[],
  createBy: string,
  createDate: string,
  updatedBy: string,
  updateDate: string
}
```



### 新增事件接口

接口入参 (?: 表示是可选的参数)

```javascript
{
	eventId: string,
  eventName: string,
  collectionStatus: string, // collecting 或者 uncollected
  description?: string,
  customRemark?: string
}
```



### 编辑事件接口

接口入参 (?: 表示是可选的参数)

```javascript
{
	eventId: string,
  eventName: string,
  description?: string,
  customRemark?: string
}
```



### 删除事件接口

接口入参 (?: 表示是可选的参数)

```javascript
{
	eventId: string, // 可拼接在Url中
}
```



### 采集状态开关接口

接口入参 (?: 表示是可选的参数)

```javascript
{
	eventId: string, // 可拼接在Url中
  isCollecting: boolean
}
```



## 埋点管理-参数管理



### 列表接口

接口入参 (?: 表示是可选的参数)

```javascript
{
  appType?: string[], // 平台及应用类型，见上
  source?: string, // 来源
  sdkVersion?: string[],
  isUploaded?: string,
  event?: string, // 事件id或名称
  param?: string, // 参数id或参数名称
  paramType?: string, // common/custom 对应 公共参数/个性参数 
  collectionStatus?: string, // 采集状态
  pageNo: number,
  pageSize: number,
}
```

接口出参 `data`

```javascript
{
  list: {
    paramId: string,
    paramName: string,
    dataType: string,
    paramType: string, // common/custom 对应 公共参数/个性参数 
    source: string, // default或userDefined
    collectionStatus: string, // collecting 或者 uncollected
    isUploaded: boolean,
  }[],
  total: number
}
```



### 参数详情接口

接口入参 (?: 表示是可选的参数)

```javascript
{
	paramId: string, // 可拼接在Url中
}
```

接口出参 `data`

```javascript
{
	paramId: string,
  paramName: string,
  dataType: string, // 后端提供完整类型给前端写死
  paramType: string, // common/custom 对应 公共参数/个性参数
  eventId: string,
  collectionStatus: string, // collecting 或者 uncollected
  description: string,
  customRemark: string,
  source: string, // default或userDefined
  sdkVersion: string[],
  appType: string[],
  createBy: string,
  createDate: string,
  updatedBy: string,
  updateDate: string
}
```



### 新增参数接口

接口入参 (?: 表示是可选的参数)

```javascript
{
	paramId: string,
  paramName: string,
  dataType: string, // 后端提供完整类型给前端写死
  paramType: string, // common/custom 对应 公共参数/个性参数 
  collectionStatus: string, // collecting 或者 uncollected
  description?: string,
  customRemark?: string,
  sdkVersion: string[],
  eventId: string,
  appType: string[],
}
```



### 编辑参数接口

接口入参 (?: 表示是可选的参数)

```javascript
{
	paramId: string,
  paramName: string,
  dataType: string, // 后端提供完整类型给前端写死
  paramType: string, // common/custom 对应 公共参数/个性参数 
  collectionStatus: string, // collecting 或者 uncollected
  description?: string,
  customRemark?: string,
  sdkVersion: string[],
  appType: string[],
  eventId: string,
}
```



### 删除参数接口

接口入参 (?: 表示是可选的参数)

```javascript
{
	paramId: string, // 拼接在Url中
}
```



### 采集状态开关接口

接口入参 (?: 表示是可选的参数)

```javascript
{
	paramId: string, // 可拼接在Url中
  isCollecting: boolean
}
```

