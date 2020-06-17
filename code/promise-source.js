const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

class MyPromise {
  constructor(promiseHandler) {
    this.status = PENDING;
    this.val = undefined;
    this.resolveHandleList = [];
    this.rejectHandleList = [];
    try {
      promiseHandler(this.triggerResolve, this.triggerReject);
    } catch (error) {
      this.triggerReject(error);
    }
  }

  triggerResolve = (value) => {
    setTimeout(() => {
      // 如果调用resolve时已经不是pending了那就返回，因为状态不能逆转
      if (this.status !== PENDING) {
        return;
      }
      this.status = FULFILLED;
      this.val = value;
      this.resolveHandleList.forEach((handler) => {
        handler(value);
      });
      this.resolveHandleList = [];
    });
  };

  triggerReject = (error) => {
    setTimeout(() => {
      if (this.status !== PENDING) {
        return;
      }
      debugger
      this.status = REJECTED;
      this.val = error;
      this.rejectHandleList.forEach((handler) => {
        handler(error);
      });
      this.rejectHandleList = [];
    });
  };

  // then的意义就是注册后面的handle函数, 不是执行, 执行是发生在上一个promise完成之后，这里只是注册
  // resolveHandler是不需要return值的
  // 每个then接受两个参数，resolveHandler, rejectHandler
  // then永远都要返回一个promise 这一点catch也一样
  // resolveHandler, rejectHandler这两个方法return(或自然结束)或者throw error时。就是这个promise被resolve或reject的时机
  then = (resolveHandler, rejectHandler) => {
    const { status, val } = this;
    return new MyPromise((onResolve, onReject) => {
      // 这一步是为了融合当前then的下一个接着的then
      // 因为当前的then会返回一个Promise，如果不调用这个onResolve，那么这个Promise就永远没法被resolve或者reject，也就不能被继续then
      const unionResolveHandler = (value) => {
        // 这里隐式得考虑了resolveHandler没有传的情况，这种情况相当于catch或者promise.then(null, null)，如果promise的返回不是异常那么就会直接resolve掉
        if (typeof resolveHandler !== "function") {
          // 如果then的第一个参数不是function，那么就要忽略它，带着上一步的结果往下走
          onResolve(value);
        } else {
          // 否则先执行当前then的resolveHandler，拿到结果传给下一个then的resolveHandler
          const res = resolveHandler(value);
          if (res instanceof MyPromise) {
            res.then(onResolve, onReject);
          } else {
            onResolve(res);
          }
        }
      };

      const unionRejectHandler = (reason) => {
        if (typeof rejectHandler !== "function") {
          onReject(reason);
        } else {
          let res = null;
          try {
            res = rejectHandler(reason);
            if (res instanceof MyPromise) {
              res.then(onResolve, onReject);
            } else {
              onResolve(res);
            }
          } catch (error) {
            console.log('catch ', error);
            onReject(error);
          }
        }
      };

      switch (status) {
        case PENDING: {
          // 注册handler
          this.resolveHandleList.push(unionResolveHandler);
          this.rejectHandleList.push(unionRejectHandler);
          break;
        }
        case FULFILLED: {
          // 为什么这里会有fulfilled状态，是因为同一个promise可以被多次then，同理rejected
          // 这种情况比较难模拟，第二次调then需要异步触发
          // promise.then((v) => { console.log('resolve1', v )});
          // setTimeout(() => {
          //   promise.then((v) => { console.log('resolve2', v )});
          // }, 1000);
          unionResolveHandler(val);
          break;
        }
        case REJECTED: {
          unionRejectHandler(val);
          break;
        }
      }
    });
  };

  catch = (nextRejectHandler) => {
    return this.then(null, nextRejectHandler);
  };

  static resolve(value) {
    if (value instanceof MyPromise) {
      return value;
    }
    return new MyPromise((onResolve) => onResolve(value));
  }

  static reject(error) {
    return new MyPromise((onResolve, onReject) => onReject(error));
  }

  static all(list) {
    return new MyPromise((resolve, reject) => {
      let count = 0;
      const values = [];

      for (const [i, myPromiseInstance] of list.entries()) {
        MyPromise.resolve(myPromiseInstance).then(
          (res) => {
            values[i] = res;
            count++;
            if (count === list.length) resolve(values);
          },
          (err) => {
            reject(err);
          }
        );
      }
    });
  }

  static race(list) {
    return new MyPromise((resolve, reject) => {
      list.forEach((item) => {
        MyPromise.resolve(item).then(
          (res) => {
            resolve(res);
          },
          (err) => {
            reject(err);
          }
        );
      });
    });
  }

	finally(callback) {
  	return this.then(
      value => MyPromise.resolve(callback()).then(() => value),   // MyPromise.resolve执行回调,并在then中return结果传递给后面的Promise
      reason => MyPromise.resolve(callback()).then(() => { throw reason })  // reject同理
  	)
	}
}

// test case

// MyPromise.resolve('hello world').then(val => {
//   console.log('resolve', val);
// })

// MyPromise.reject('hello world').catch(err => {
//   console.log('reject', err);
// })

// MyPromise.reject("hello world")
//   .catch((err) => {
//     console.log("reject", err);
//     return 12;
//   }).then((val) => {
//     console.log("resolve1", val);
//   }).catch(() => {
//     console.log(12993);
//   }).finally(() => {
//     console.log('finally');
//   });

// const promise = new MyPromise((resolve, reject) => {
//   setTimeout(() => {
//     console.log("promise resolved");
//     resolve('kuimo');
//   }, 1000);
// });

// promise
//   .then((val) => {
//     console.log("then", val);
//     return "hello";
//   })
//   .then((v) => {
//     console.log("resolve", v);
//   })
//   .catch((error) => {
//     console.log("error", error);
//   });

// promise.then((v) => { console.log('resolve1', v )});
// setTimeout(() => {
//   promise.then((v) => { console.log('resolve2', v )});
// }, 1110);

MyPromise.resolve(123).catch((e) => { console.log('e', e); }).then((v) => {
  console.log('value', v);
  throw new Error('eee')
})