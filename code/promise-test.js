const promise = Promise.reject(123);
promise.catch((val) => {console.log(val); throw new Error('123')}).catch((v) => console.log(666, v))