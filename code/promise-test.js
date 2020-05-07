const promise = Promise.resolve(123);
promise.catch((val) => {console.log(val)}).then((v) => console.log(666, v))