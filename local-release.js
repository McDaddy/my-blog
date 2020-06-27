#!/usr/bin/env node

const child_process = require('child_process');

const { execSync } = child_process;

console.log('清除老文件');
execSync('rm -rf ./express-test/public', { stdio: 'inherit' });

console.log('开始编译打包');
execSync('npm run build', { stdio: 'inherit' });

console.log('开始拷贝编译后文件');
execSync('cp -r public express-test', { stdio: 'inherit' });

console.log('开始发布');
execSync('fun deploy -y', { stdio: 'inherit' });

console.log('发布完成');
