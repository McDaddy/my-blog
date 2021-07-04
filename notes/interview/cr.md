1. noop 用optional call 替代
2. 同理 formRef.current && formRef.current.setFields(newFields); instead formRef.current?.setFields(newFields);
3. array.indexOf(x) === -1 用 array.includes(x) 替代
4. 不要自定义颜色
5. 没有必要的定义  const expandId:string[] = (query.eventKey || '').split('-‘);
6. 滥用as  const a = [] as string[] => const a: string[] = [];
7. 滥用 [k: string]: any; 即Obj
8. 无关的字段不用加入定义
9. 滥用 {}  const a = props.x || {} 初始值尽量用null 非要用{} 应该是Partial<T>
10. async/await 替代promise
11. 不用的代码删除而不是注释，如果另做他用请重新命名
12. 全面ts 包括脚本
13. 无视 lint error/warning
14. comment全英文 甚至mock
15. lodash的规约 cloneDeep/get/set/isEmpty
16. 但凡需要 . 什么的 no any 
    1. 不是好的代码，但一定是负责任的代码
    2. 更好的扩展性，后人好维护，代码即文档
    3. 技术债累积，eat our own shit
    4. 这是一件理论上绝对不会回头的事情
    5. 提升个人的ts水平
17. 合并commits
18. .d.ts放什么



comment 在需要的时候 如 regex