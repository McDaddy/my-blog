---
title: 不定期的跟着lodash写代码
date: 2020-08-13
tags:
 - JavaScript
categories:
 - 工具

---

如题，lodash是个非常好的工具库实现，通过学习lodash帮助自己加深对JS原生的理解

<!-- more -->

## isArrayLike

```javascript
const isLength = require("./isLength");

/**
 * 判断value是不是array-like
 * 条件：
 *  1. 不是一个function
 *  2. 有length属性
 *  3. length 大于等于0 且小于等于Number.MAX_SAFE_INTEGER
 *
 * isArrayLike([1, 2, 3])
 * // => true
 *
 * isArrayLike(document.body.children)
 * // => true
 *
 * isArrayLike('abc')
 * // => true
 *
 * isArrayLike(Function)
 * // => false
 * @param {*} value
 */
function isArrayLike(value) {
    return value != null && typeof value !== 'function' && isLength(value.length);
}

console.log(isArrayLike([])); // true
console.log(isArrayLike('abc')); // true
console.log(isArrayLike({})); // false
```

> 原来’abc’也是ArrayLike， 即使不是一个对象，也可以是ArrayLike

## isEmpty

```javascript
/**
 * 用来检查一个对象/数组/map/set是不是空
 * 当传入对象时，当这个对象没有自己的可枚举属性，那么就是空对象
 * 
 * 所有array或者array-like的对象，只判断length是不是0
 * map和set 只判断size是不是0
 *
 * 如果传进来数字， 不管是什么都是返回true
 * 
 * @example
 * isEmpty(null)
 * // => true
 *
 * isEmpty(true)
 * // => true
 *
 * isEmpty(1)
 * // => true
 *
 * isEmpty([1, 2, 3])
 * // => false
 *
 * isEmpty('abc')
 * // => false
 *
 * isEmpty({ 'a': 1 })
 * // => false

 * @param {*} value
 */
function isEmpty(value) {
    if (value == null) {
        return false;
    }
    if (isArrayLike(value) && 
        (Array.isArray(value) || typeof value === 'string' || typeof value.splice === 'function' || // isBuffer(value) isBuffer是判断是不是node的buffer
           isArguments(value)  )) {
        return  !value.length;
    }
    const tag = getTag(value);
    if (tag === '[object Map]' || tag === '[object Set]') {
        return !value.size;
    }
    if (isPrototype(value)) {
        return !Object.keys(value).length // 不太明白
    }
    for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
            return false;
        }
    }
    return true;
}

module.exports = isEmpty;
```

