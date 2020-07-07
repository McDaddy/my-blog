---
title: Google翻译API脚本
date: 2020-06-30
tags:
 - i18n
categories:
 - 工具

---

在平时的开发中，但凡用到国际化就绕不开翻译这一步，可以人肉翻也可以做到自动化，这里写一个简单的脚本做到调用Google API来自动翻译

<!-- more -->

```json
// temp-zh-words.json
{
	"我需要被翻译": ""
}
```

```javascript
#!/usr/bin/env node
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
const translate = require('google-translate-open-api').default;
const { parseMultiple } = require('google-translate-open-api');
const fs = require('fs');

// 注意：翻译完的英文首字母会强制小写，如果需要大写开头的需要手动调整
const doTranslate = async () => {
  const rawFile = fs.readFileSync('tools/temp-zh-words.json');
  const wordList = JSON.parse(rawFile);

  const toTransList = Object.keys(wordList);
  if (toTransList.length === 0) {
    return;
  }

  const result = await translate(toTransList, {
    tld: 'cn',
    to: 'en',
  });
  const data = result.data[0];
  let translatedList = [];
  if (toTransList.length === 1) {
    translatedList = [data];
  } else {
    translatedList = parseMultiple(data);
  }
  toTransList.forEach((key, i) => {
    const [first, ...rest] = translatedList[i];
    wordList[key] = first.toLowerCase() + rest.join('');
  });
  fs.writeFileSync('tools/temp-zh-words.json', JSON.stringify(wordList, null, '  '));
};

doTranslate();
```

