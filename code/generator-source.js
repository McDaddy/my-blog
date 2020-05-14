// const array = [1, 2, 3];
// // 取出array的迭代器
// const iterator = array[Symbol.iterator](); // 注意@@iterator属性是一个方法，执行它之后才能得到真正的迭代器
// console.log("iterator", iterator)
// for (const item of iterator) {
//     console.log("item", item) // 1, 2, 3
// }

// // 实现一个迭代器对象
// // 遵守两点
// // 1. 可迭代协议，必须有@@iterator属性，此属性是一个无参的方法，返回一个真的迭代器
// // 2. 迭代器协议，要有一个next方法， 调用后返回两个属性{ done: boolean, value: any }
// const  obj = {
//     count: 0,
//     value: [1, 2, 3],
//     next: function(v) {  // 注意不能写成箭头函数
//         if (this.count === 3) { // 注意终止条件，否则就会无限next
//             return {
//                 done: true,
//                 value: undefined,
//             }
//         }
//         return {
//             done: false,
//             value: this.value[this.count++ % 3]
//         }
//     },
//     [Symbol.iterator]: function() { return this }, // 注意不能写成箭头函数
// }

// for (const item of obj) {
//     console.log("item", item) // 1, 2, 3
// }


function* sop() {
    console.log('洗澡之前');
    global.a = yield '洗澡';
    console.log('洗完澡了', global.a);
    const b = yield '拍照';
    console.log('拍完了', b);
    const c = yield '发图';
}

let handler = sop(); // 得到gen句柄
// console.log('handler', handler);
// const s1 = handler.next();
// console.log('global.a', typeof global.a) // undefined
// console.log('第一步完成');
// const s2 = handler.next(s1.value);
// handler.next(s2); // 此时的done依然是false

for (const iterator of handler) {
    console.log('item', iterator);
}