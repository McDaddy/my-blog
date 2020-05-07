class MyPromise {
  constructor(promiseHandler) {
    this.status = "pending";
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
      if (this.status !== "pending") {
        return;
      }
      if (value instanceof MyPromise) {
        val.then(
          value => {},
          err => {}
        )
      } else {
        this.status = "fulfilled";
        this.val = value;
        this.resolveHandleList.forEach((handler) => {
          handler(value);
        });
        this.resolveHandleList = [];
      }
    });
  };

  triggerReject = (error) => {
    setTimeout(() => {
      if (this.status !== "pending") {
        return;
      }
      this.status = "rejected";
      // this.val = error;
      this.rejectHandleList.forEach((handler, i) => {
        handler(error);
      });
      this.rejectHandleList = [];
    });
  };

  // then的意义就是注册后面的handle函数 resolveHandler 是不需要return值的
  // 每个then接受两个参数，resolveHandler, rejectHandler
  // then永远都要返回一个promise 这一点catch也一样
  // resolveHandler, rejectHandler这两个方法return(或自然结束)或者throw error时。就是这个promise被resolve或reject的时机
  then = (resolveHandler, rejectHandler) => {
    const { status, val } = this;
    return new MyPromise((nextResolveHandler, nextRejectHandler) => {
      // 这一步是为了融合当前then的下一个接着的then
      const unionResolveHandler = (value) => {
        if (typeof resolveHandler !== "function") {
          // 如果then的第一个参数不是function，那么就要忽略它，带着上一步的结果往下走
          nextResolveHandler(value);
        } else {
          // 否则先执行当前then的resolveHandler，拿到结果传给下一个then的resolveHandler
          const res = resolveHandler(value);
          if (res instanceof MyPromise) {
            res.then(nextResolveHandler, nextRejectHandler);
          } else {
            nextResolveHandler(res);
          }
        }
      };

      const unionRejectHandler = (reason) => {
        // console.log("MyPromise -> unionRejectHandler -> reason", reason)
        if (typeof rejectHandler !== "function") {
          nextRejectHandler(reason);
        } else {
          let res = null;
          try {
            console.log('before reject');
            res = rejectHandler(reason);
            console.log('after reject', res);
            if (res instanceof MyPromise) {
              res.then(nextResolveHandler, nextRejectHandler);
            } else {
              console.log('resolve next', res);
              nextResolveHandler(res);
            }
          } catch (error) {
            console.log('catch ', error);
            nextRejectHandler(error);
          }
        }
      };

      switch (status) {
        case "pending": {
          // 注册handler
          this.resolveHandleList.push(unionResolveHandler);
          this.rejectHandleList.push(unionRejectHandler);
        }
        case "fulfilled": {
          unionResolveHandler(value);
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
    // if (error instanceof MyPromise) {
    //   return value;
    // }
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
    return new CustomPromise((resolve, reject) => {
      list.forEach((item) => {
        CustomPromise.resolve(item).then(
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
}

// test case

// MyPromise.resolve('hello world').then(val => {
//   console.log('resolve', val);
// })

// MyPromise.reject('hello world').catch(err => {
//   console.log('reject', err);
// })

MyPromise.reject("hello world")
  .catch((err) => {
    console.log("reject", err);
    return 12
  }).then((val) => {
    console.log("resolve", val);
  });

// const promise = new MyPromise((resolve, reject) => {
//   setTimeout(() => {
//     console.log("promise resolved");
//     resolve(123);
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

// MyPromise.resolve('hello world').then(val => {
//   console.log('resolve', val);
// })
