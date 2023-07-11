## IOC解决了什么问题？

假设我们要实现一个CRUD的功能，我们需要new一个数据库config， new一个数据库客户端实例，new一个调用数据库的Service实例等等，然后把他们组合起来。这就是一种主动组合的关系，需要开发者主动去管理这些实例，并且完成组合

通过**依赖注入**，我们可以让一个class被注入需要的依赖，class只需要定义好需要注入依赖的类型即可。这样当应用启动时，框架会自动分析，各个需要被注入的class需要的依赖，然后自动地去生成实例，管理实例（比如单例的场景）。这样就省去了开发者自己去维护实例的成本，让整个依赖关系都自动化的被维护

所谓**反转控制 Inverse Of Control** 就是从主动创建依赖到被动等待依赖注入，



## Provider

Nest 实现了 IOC 容器，会从入口模块开始扫描，分析 Module 之间的引用关系，对象之间的依赖关系

provider就是那些可以注入到需要依赖注入的类的那些class

provider 一般都是用 @Injectable 修饰的 class，然后在 @Module 的 providers 数组里注册的 class。

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230623003128575.png" alt="image-20230623003128575" style="zoom:50%;" />

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230623003148287.png" alt="image-20230623003148287" style="zoom:50%;" />

而这只是一种简写，完整写法是

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230623003340174.png" alt="image-20230623003340174" style="zoom:50%;" />

当provide是class本身时，是最方便的，在构造器注入时甚至不需要inject的关键字

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230623003601954.png" alt="image-20230623003601954" style="zoom:50%;" />

但实际上注入的标识是Token，就是这个provide。它也可以是字符串。但最终指代的都是useClass里的类

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230623003750107.png" alt="image-20230623003750107" style="zoom:50%;" />

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230623003759398.png" alt="image-20230623003759398" style="zoom:50%;" />

## Module

即模块

可以通过@Global来标明这是全局模块，这样就不需要在使用的模块使用imports关键字来显示引入

## 生命周期

provider、controller、module 都支持启动和销毁的生命周期函数，这些生命周期函数都支持 async 的方式。

调用顺序都是controller -> provider -> module

启动

- onModuleInit
- onApplicationBootstrap

销毁

- beforeApplicationShutdown
- onApplicationShutwon

## AOP

切面编程

执行顺序

Middleware -> Guard - > Interceptor -> Pipe -> Controller

所有的步骤出现错误都可以走到ExceptionFilter

## 装饰器

全部装饰器

- @Module： 声明 Nest 模块
- @Controller：声明模块里的 controller
- @Injectable：声明模块里可以注入的 provider
- @Inject：通过 token 手动指定注入的 provider，token 可以是 class 或者 string
- @Optional：声明注入的 provider 是可选的，可以为空
- @Global：声明全局模块
- @Catch：声明 exception filter 处理的 exception 类型
- @UseFilters：路由级别使用 exception filter
- @UsePipes：路由级别使用 pipe
- @UseInterceptors：路由级别使用 interceptor
- @SetMetadata：在 class 或者 handler 上添加 metadata
- @Get、@Post、@Put、@Delete、@Patch、@Options、@Head：声明 get、post、put、delete、patch、options、head 的请求方式
- @Param：取出 url 中的参数，比如 /aaa/:id 中的 id
- @Query: 取出 query 部分的参数，比如 /aaa?name=xx 中的 name
- @Body：取出请求 body，通过 dto class 来接收
- @Headers：取出某个或全部请求头
- @Session：取出 session 对象，需要启用 express-session 中间件
- @HostParm： 取出 host 里的参数
- @Req、@Request：注入 request 对象
- @Res、@Response：注入 response 对象，一旦注入了这个 Nest 就不会把返回值作为响应了，除非指定 passthrough 为true
- @Next：注入调用下一个 handler 的 next 方法
- @HttpCode： 修改响应的状态码
- @Header：修改响应头
- @Redirect：指定重定向的 url
- @Render：指定渲染用的模版引擎

## ExecutionContext

nestjs是可以支持包括http、ws、rpc等协议的，那么在写装饰器的时候，有的协议是有request，有的没有，那要怎么做兼容？

这里就用到了ExecutionContext这个类。

ExecutionContext是各种装饰器需要实现的具体方法的最后一个参数

当一个请求到达，可以用ExecutionContext类的getType方法，判断请求的类型。

然后通过**switchToHttp**等方法转换成对应的协议类型请求，最后可以通过getArgs方法拿到具体需要的对象，比如Request

ExecutionContext 还提供 getClass、getHandler 方法，可以结合 reflector 来取出其中的 metadata。



## Reflect.Metadata

为什么nestjs可以在启动时分析出各个模块，依赖于被依赖间的关系？

一切的秘密都源自Reflect.metadata

```javascript
Reflect.defineMetadata(metadataKey, metadataValue, target);

Reflect.defineMetadata(metadataKey, metadataValue, target, propertyKey);


let result = Reflect.getMetadata(metadataKey, target);

let result = Reflect.getMetadata(metadataKey, target, propertyKey);
```

Reflect.defineMetadata 和 Reflect.getMetadata 分别用于设置和获取某个类的元数据，如果最后传入了属性名，还可以单独为某个属性设置元数据

而且它还支持装饰器

```javascript
@Reflect.metadata(metadataKey, metadataValue)
class C {

  @Reflect.metadata(metadataKey, metadataValue)
  method() {
  }
}
```

只要封装下，就可以通过自定义装饰器来设置metadata，最后通过`Reflect.getMetadata`来获取数据

```javascript
function Type(type) {
    return Reflect.metadata("design:type", type);
}
function ParamTypes(...types) {
    return Reflect.metadata("design:paramtypes", types);
}
function ReturnType(type) {
    return Reflect.metadata("design:returntype", type);
}

@ParamTypes(String, Number)
class Guang {
  constructor(text, i) {
  }

  @Type(String)
  get name() { return "text"; }

  @Type(Function)
  @ParamTypes(Number, Number)
  @ReturnType(Number)
  add(x, y) {
    return x + y;
  }
}

let obj = new Guang("a", 1);

let paramTypes = Reflect.getMetadata("design:paramtypes", obj, "add"); 
// [Number, Number]
```

事实上，**所有nestjs内置的装饰器都会给被装饰的类或者属性添加metadata**。这样nestjs就可以获得所有需要的依赖信息了。 比如在一个Controller里面@Inject了某个Service，那么nest会从Module开始一路分析到Controller，然后发现Controller的某个属性原信息里有Inject信息，然后就可以关联到具体的Service了

但是有一个例外，就是通过构造器注入，像下面的情况CatsService完全没有和任何装饰器关联，也就是说没有任何关联的metadata存在，那是怎么实现关联的呢？

```javascript
@Controller('cats')
export class CatsController {
  constructor(private readonly catsService: CatsService) {}
  }
```

这里就需要ts的**emitDecoratorMetadata**属性，这个属性打开的作用就是会自动添加一些元数据

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230623225646933.png" alt="image-20230623225646933" style="zoom:50%;" />

```javascript
import "reflect-metadata";
 
class Guang {
  @Reflect.metadata("名字", "光光")
  public say(a: number): string {
    return '加油鸭';
  }
}
```

以这段代码为例，在未开启emitDecoratorMetadata的情况仅有Reflect.metadata在编译后时被保留的。但是在开启之后就加上了三个__metadata，分别是

- design:type 是 Function，很明显，这个是描述装饰目标的元数据，这里装饰的是函数

- design:paramtypes 是 [Number]，很容易理解，就是参数的类型

- design:returntype 是 String，也很容易理解，就是返回值的类型

所以说就是ts自动把元数据类型写进了编译的结果，这样即使不用Reflect.metadata，依然可以达到同样的效果。所以nestjs是必须用ts来编写的

至此可以总结

> nest 的核心实现原理：**通过装饰器给 class 或者对象添加 metadata，并且开启 ts 的 emitDecoratorMetadata 来自动添加类型相关的 metadata，然后运行的时候通过这些元数据来实现依赖的扫描，对象的创建等等功能。**



## Nestjs与Express、Fastify的关系

Nestjs并不关心底层如何实现处理请求和响应，更不会直接和Node的http模块打交道，它把这些工作都交给了成熟的http库比如express、fastify

默认情况下Nestjs是基于Express的，但是它可以通过Adapter自由切换成fastify

FastifyAdapter和ExpressAdapter都是继承自AbstractHttpAdapter，这样就确保了，不论使用哪个底层实现，都有一些必须的公用方法，同时也可以有一些个性化的方法实现

<img src="https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20230627140729203.png" alt="image-20230627140729203" style="zoom:67%;" />

为什么不强依赖Express？ 假如将来有更好的Http库实现，是不是可以再次使用**适配器模式**自由切换到新的库上，那样就更灵活了



## Nestjs的Middleware和Express的Middleware有什么区别和关系

Nestjs的Middleware的基础写法是这样

```javascript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';

@Injectable()
export class AaaMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: () => void) {
    console.log('brefore');
    next();
    console.log('after');
  }
}
```

使用方法是

```javascript
import { AaaMiddleware } from './aaa.middleware';
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule{

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AaaMiddleware).forRoutes({ path: 'hello*', method: RequestMethod.GET });
    consumer.apply(AaaMiddleware).forRoutes({ path: 'world2', method: RequestMethod.GET });
  }
}
```

局部Middleware也可以被注入，但全局的不行

**Express的Middleware**是无法指定具体路由的，也就是说相当于`forRoutes('*')`，普通的Express的Middleware也是可以在Nestjs里用的，在全局的`app.use`中使用

Nestjs的Middleware相比Express的Middleware的优势

1. 可以依赖注入
2. 可以指定适用的路由
3. 可以用rxjs的operator来组织响应的处理流程

所以Express的Middleware更适合处理通用的逻辑，而Nestjs的更适合处理业务逻辑