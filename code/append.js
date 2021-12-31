
const appendChild = document.createElement('div');
appendChild.style = 'display: flex; justify-content: center; margin-bottom: 16px';
const label = document.createElement('span');
label.textContent = 'ICP证：';
const aLink = document.createElement('a');
aLink.href = 'https://beian.miit.gov.cn/';
aLink.target = '_blank';
aLink.title = '浙ICP备20017004号';

appendChild.appendChild(label);
appendChild.appendChild(aLink);

document.body.appendChild(appendChild);