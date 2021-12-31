#!/usr/bin/env node

const child_process = require('child_process');
const insertScript = require('./code/insertScript.js');

const { execSync } = child_process;

console.log('清除老文件');
execSync('rm -rf ./express-test/public', { stdio: 'inherit' });

console.log('开始编译打包');
execSync('npm --prefix ./site run build', { stdio: 'inherit' });

console.log('添加备案号');
execSync('cp ./code/append.js ./site/public', { stdio: 'inherit' });
insertScript();

console.log('开始拷贝编译后文件');
execSync('cp -r ./site/public express-test', { stdio: 'inherit' });

console.log('开始发布');
execSync('fun deploy -y', { stdio: 'inherit' });

console.log('发布完成');
