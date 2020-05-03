class MyPromise {
  constructor(promiseHandler) {
    this.status = "pending";
    this.val = undefined;
    this.resolveHandleList = [];
    this.rejectHandleList = [];
    try {
        promiseHandler(this.triggerResolve, this.triggerReject);
    } catch (error) {
        this.triggerReject(error)
    }
  }

  triggerResolve = (value) => {
    setTimeout(() => {
      if (value instanceof MyPromise) {
        value.then();
      } else {
        this.status = "fulfilled";
        this.resolveHandleList.forEach((handler, i) => {
          handler(value);
        });
        this.resolveHandleList = [];
      }
    });
  };

  triggerReject = (error) => {
    setTimeout(() => {
      this.status = "rejected";
      this.rejectHandleList.forEach((handler, i) => {
        handler(value);
      });
      this.rejectHandleList = [];
    });
  };

  // then的意义就是注册后面的handle函数
  then = (nextResolveHandler, nextRejectHandler) => {
    this.resolveHandleList.push(nextResolveHandler);
    return new MyPromise((resolve,reject) => {
        
    })
  };

  catch = (nextRejectHandler) => {
    this.rejectHandleList.push(nextRejectHandler);
  };

  static resolve() {}

  static all() {}

  static race() {}
}

const promise = new MyPromise((resolve, reject) => {
  setTimeout(() => {
    console.log("promise resolved");
    resolve(123);
  }, 1000);
});

promise.then((val) => {
  console.log("then", val);
}).catch((error) => {
    console.log('error', error)
});
