---
title: 我的算法日记
date: 2021-11-19
tags:
 - 算法
categories:
 - 工具

---

算法不是一天两天可以练成的，日以继夜，与君共勉

<!-- more -->

## 链表

特点：适合快速插入和删除，不适合快速定位

主要技巧：

### dummy虚拟节点

为了防止空指针的出现，比如长度为5的链表要删除倒数第五个节点，那么按理要找到倒数第六个和倒数第四相连，但这时候找倒数第六就会出现空指针异常

### 反转链表

```javascript
var reverseList = function (head) {
  let prev = null;
  let current = head;
  while (current) {
    const next = current.next;
    current.next = prev;
    prev = current;
    current = next;
  }
  return prev;
};
```



### 快慢指针（双指针）

应用非常广泛，比如

- 找到链表的中点
- 判断是否有环（如果有环，那么快慢节点迟早相遇）
- 找到倒数第N个节点（快指针先走N步，直到结束，此时慢节点就是倒数第N个节点）

### 距离相同原理（两个指针走相同的距离相遇）

- 为什么快慢指针必然会在环中相遇？
  - 假设有环的情况，整个环加上开头的部分长度为X + M，第X个点为入环点，环的长度就是M
  - 当慢指针走到环末尾时，慢指针走了X + M步，快指针走了2(M + X)步
  - 计算快指针在环里走了多少，(2(M + X) - X)/M 就是快指针全路程减去入口的X然后除以环的长度M
  - 移项约分后得到结果为`2 + X/M`，所以这个值必然是大于2的，快指针在环里走了超过两圈，所以中间是必然会碰到慢指针的
  - 而他走的圈数多少取决于X/M的比值，如果环很短，入环前很长，那么就会走很多很多圈，反之亦然

- 找到开始有环的位置（记录快慢指针相遇的位置，此时慢指针重回head，快慢指针保持相同步频前进，下次相遇的点就是环的起始点）
  - 假设起点到环开始点距离为K，相遇点为环开始点后X，环的长度是M

  - 此时慢指针总共走过 K + X

  - 快指针总共走过 K + M * N(N为大于等于2的整数) + X

  - 慢指针距离 * 2 = 快指针距离

  - 2(K + X) = K + M * N +X

  - 除项移项得到 K = M * N - X

  - 由此可以推断从起点和初相遇点两边同时单步走K距离时，快指针恰好在入口处，因为M * N就是回到原地，-X就退回到了环起点
- 判断两个不等长的链表是否有相交（尾部相交，后面没有延伸）

  - 核心就是怎么让AB两个指针同时达到C1
  - 假设两个链表的长度为X和Y，相交的长度为M(>=0)
  - A走X + (Y - M)步，走自身的长度，然后走B不想交部分的长度
  - B走Y + (X - M)步
  - 两者距离相等，且当M > 0时下一个节点必然是相交点，否则就是null节点
  - 回到代码，就是AB节点同时从自己开始走，走完自己后，开始从对方的head走，然后必然会走到A.val === B.val的相遇节点，此时如果不是null的话，那就是相交了

![image-20211119170250378](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20211119170250378.png)



## 队列

特点：先进先出 FIFO

主要技巧：

- 取模

在做循环队列时，比如10位的队列，在`9`的位置上添加新元素，那新元素会在`0`的位置上，如何得到就需要`(9 + 1) % 10 = 0` 。 同理，当第0位的元素，找上一个元素时，`(0 - 1) % 10`就会出现负数，此时可以`(0 - 1 + 10) % 10 = 9`得到正确的位置



## 栈

特点：后进先出

主要用途：

- 状态匹配，比如左右括号对称，tag封口
- 递归转迭代，比如二叉树的遍历用**迭代来实现**



## 二叉树

特点

1. 每个节点度最大为2
2. 即使只有一个子，也要区分是左子树还是右子树

性质

1. 在二叉树的第i层，最多有2的`i-1`次方的节点数
2. 如果深度为k，那么最多有2的k次方减1个节点
3. 度为0的节点数量比度为2的节点对一个

### 完全二叉树

**完全二叉树** (complete binary tree)：只有最后一层的右侧缺少节点的二叉树。这是一种特殊的结构，有几个神奇的特性

1. 它可以在内存中连续存储，而不需要指针，从而节省空间。因为每层的数量最最后一层前都是固定的，所以可以直接按层从左到右存储，没有排满的就是最后一层
2. 要得到完全二叉树的层数，只需要从根节点一直遍历左节点，即左沉底就能算出层数
3. 知道任何节点的编号x，那么x * 2就是左节点的编号，x*2 + 1就是右节点的编号
4. 如果要判断某个位置的节点是否存在，可以通过位置编号的二进制来计算 力扣222题

![image-20211221165358153](https://kuimo-markdown-pic.oss-cn-hangzhou.aliyuncs.com/image-20211221165358153.png)

如图所示，将所有节点从1开始编号，从上到下，从左到右。同时将编号所对应的二进制标在旁边。发现有以下规律

- 所有编号的二进制都是1开头的，其实这是废话，只要不补位，那么肯定是1开头的，只是大家的位数不同
- 每层的标号位数和层数是一致的，第一层1位，第二层2位。。。
- 除了最后一层，每层的节点数是固定的2^(h-1)，h为层数
- 最后一层的节点数量范围是[1, 2^(h-1)]，这里就是1到4
- 最后一层节点的编号范围是[2^(h-1), 2^h - 1]， 这里就是4到7
- 除了跟节点外，任意节点标号的二进制，抛开第一位，后面的位数依次就是从根节点到达此节点的路径，**0就是左节点，1就是右节点**
  - 以5为例，标号101，从根节点开始0向左走一位，然后1向右走一位
  - 这样的原因是：观察一下，10下面的节点，在增加一位的情况下，前两位永远也是10。同理11后面的节点也是11开头的
  - 那么我们反推一下，101的上一层必然是10，10的上一层必然是1

#### 取位技巧

如果当前已经知道5的二进制是101，那么如何可以取出0和1呢？

- 取任何三位二进制第二位，就可以通过和010与一下，如果结果是0那那位就是0，否则就是1。即101 & 010 = 010 不为零，即第二位为1。 相反如果是100 & 010 = 000则表示第二位为0
- 那么现在的问题就是怎么先得到10因子，这个值只能是10,100,1000,…. 如此例，层数是3，那么底层的二进制肯定是三位数的，所以是010，如果是4层那就是0100。得到规律这个数字就是1合上层数h-2个0，即 1 << (h -2)
- 等到第二位取完之后，取第三位，就是把刚才得到的因子 x >> 1 右移一位即可

```javascript
// 检查完全二叉树中，是否存在某顺序编号的节点
const exists = (root, level, k) => {
  let bits = 1 << (level - 1); // 得到取位因子
  let node = root;
  while (node !== null && bits > 0) {
    if (!(bits & k)) { // 如果因子与编号的结果是0，这应该从当前节点走左边节点遍历，相反走右边
      node = node.left;
    } else {
      node = node.right;
    }
    bits >>= 1; // 因子右移一位
  }
  return node !== null;
};
// 具体实现在完全二叉树中，二分查找最后一个节点，从而得到总的节点数量
var countNodes = function (root) {
  if (root === null) {
    return 0;
  }
  let level = 0;
  let node = root;
  // 计算出层数
  while (node.left !== null) {
    level++;
    node = node.left;
  }
  let low = 1 << level, // 计算出完全二叉树，在第N层的节点顺序范围
    high = (1 << (level + 1)) - 1;
  while (low < high) {
    const mid = Math.floor((high - low + 1) / 2) + low;
    if (exists(root, level, mid)) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return low;
};
```



### 递归流程

1. 数学归纳法

   1. 首先k0是正确合理的
   2. 假设ki是正确的，那么k i+1应该也是正确的
   3. 则所有kn都是正确的

   ```javascript
   // fib(n) : 第n项斐波那契的值
   function fib(n) {
     if(n <= 2) return n;  // k0
     // 假设fib(n - 1)正确，fib(n - 2)正确；
     // 则可以推出：fib(n) 一定是正确的
     return fib(n - 1) + fib(n - 2); 
   }
   ```

2. 明确函数的意义，比如这个函数的目的是遍历一个根节点
3. 思考边界，比如为空就返回
4. 实现

比如做二叉树的层序遍历

1. 根节点作为一个一位数组传入函数，是可以做到遍历的，同时通过遍历这个数组是可以得到所有第2层子节点的，表示k0可行，那么我们假设在第n层，我们可以传入第n层的所有节点，然后收集所有n+1层的节点，则整个递归关系是成立的
2. 函数的意义是，传入一个节点数组，将数组的节点值都推入最终结果，同时将他们的所有子节点收集起来，再次传给自身函数。即`遍历节点数组，推入结果集，并收集下一层的节点数组`，那么下一层节点数组的结果怎么呈现呢，就需要递归
3. 边界即某一次函数执行结束后，没有收集到任何子节点，表示已经走到了最后一层

又比如计算一个二叉树的深度

1. 明确函数：一个树的深度等于，`1 + 左子树的深度和右子树的深度的最大值`，而左右子树的深度怎么来，就是需要递归
2. 如果只有根节点，带入函数就是1
3. 边界是节点不存在，就返回0

```javascript
const getDepth = (root) => {
  if (!root) {
    return 0;
  }
  return Math.max(getDepth(root.left), getDepth(root.right)) + 1;
};
```

**实现一维数组转树**

```javascript
const list = [
  { id: 1, pid: 0, name: '四川' },
  { id: 2, pid: 1, name: '成都' },
  { id: 3, pid: 1, name: '宜宾' },
  { id: 4, pid: 1, name: '绵阳' },
  { id: 5, pid: 1, name: '德阳' },
  { id: 6, pid: 2, name: '高新区' },
  { id: 7, pid: 2, name: '武侯区' },
  { id: 8, pid: 3, name: '翠屏区' }
];

const arrayToTree = (arr, pid) => {
  return arr.reduce((res, current) => {
    if (current['pid'] === pid) {
      current.children = arrayToTree(arr, current['id']);
      return res.concat(current);
    }
    return res;
  }, []);
};
console.log(arrayToTree(list, 0))

```





## 堆

特性

- 堆结构其实就是一个**完全二叉树**

- 完全二叉树的好处是，可以在连续的内存空间（数组）里面直接描述树结构

- 完全二叉树，任意节点，知道自己的数组中的编号，得到父与子的编号，假设编号i （编号从0开始）

  - 父节点的编号： `(i - 1) >> i`， 这里`i > 0`, 如1的父为0，3的父为1
  - 子节点的编号： 左节点 `(i << 1) + 1`，右节点`(i << 1) + 2`

- 分为大根堆和小根堆

  - 大顶堆： 任意父节点都大于两个子节点

  - 小顶堆：任意父节点都小于两个子节点

- 兄弟节点的大小关系是不明确的，只知道父子间的大小关系。所以最大（小）值永远是root，而第二大（小），可能在第二层，也可能在第三层

- **优先队列**就是堆，就是原本先进先出的队列，变成了有优先级的，优先级高的先出

- 一般遇到找出**最大K个**元素之类的题目，且动态加一位，仍然要保持排序的， 一般都是要用堆排序

  - 比如要求最大第K个元素，可以将初始化的数组，建立成一个小根堆
  - 当堆长度大于K时，就循环pop，此时弹出的一定是比最大K元素小的元素
  - 当堆长度等于K时，此K个元素就是所有元素中最大的K个， 此时堆顶元素就是，剩下K个元素中最小的，即所有元素中第K大的
  - 此时如果push新元素进去，然后再pop一次，那么堆顶的依然是所有元素中第K大的

- 不要思维定式（373题）

  - 求两个排好序的数组的两两组合，`和`最小的前K个组合
  - 此时就会思维定式想着建立小根堆，然后pop前K个元素，这样性能太差，因为是排序过的，只有前面的元素才有进堆的必要性
  - 可以考虑建一个K位长度大根堆，此时push进去的元素如果小于堆顶元素，那么就是pop一个元素，push进去一个元素
  - 否则说明当前push进去的数字，比当前最小的K的个数都大，所以可以直接略过，这样就跳过了堆排序的消耗

```javascript
// 实现一个大根堆
class Heap {
  constructor(values) {
    this.data = values;
    this.init();
  }
  size() {
    return this.data.length;
  }
  init() {
    for (let i = 0; i < this.size(); i++) {
      this.bubbleUp(i);
    }
  }
  swap(i, j) {
    if (i === j) return;
    const temp = this.data[i];
    this.data[i] = this.data[j];
    this.data[j] = temp;
  }
  bubbleUp(index) {
    while (index > 0) {
      const parentIndex = (index - 1) >> 1;
      if (this.data[parentIndex] < this.data[index]) {
        this.swap(index, parentIndex);
      }
      index = parentIndex;
    }
  }
  pop() {
    if (!this.size()) {
      return null;
    }
    const top = this.data[0];
    const last = this.data.pop();
    if (this.size()) {
      this.data[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }
  bubbleDown(index) {
    while (index < this.size() - 1) {
      const leftIndex = (index << 1) + 1;
      const rightIndex = (index << 1) + 2;
      let maxValIndex = index;
      if (this.data[maxValIndex] < this.data[leftIndex]) {
        maxValIndex = leftIndex;
      }
      if (this.data[maxValIndex] < this.data[rightIndex]) {
        maxValIndex = rightIndex;
      }
      if (maxValIndex === index) break;
      this.swap(index, maxValIndex);
      index = maxValIndex;
    }
  }
  push(val) {
    this.data.push(val);
    this.bubbleUp(this.size() - 1);
  }
  peek() {
    if (this.size()) {
      return this.data[0];
    }
    return null;
  }
}
const heap = new Heap([99, 5, 12, 56, 1, 0, 8]);
const r1 = heap.pop(); // 99
const r2 = heap.pop(); // 56
heap.push(100);
const r3 = heap.pop(); // 100
```

### 实现核心

1. 每插入一个数字，需要确保插入的这个数字是比父来的小，如果比父来得大，那就需要和父调换位置，分两种情况
   1. 在初始化数组时，每次不管是不是比父大，都要把index变成父index，做下一轮计算，直到顶层
   2. 在后续插入时，只要插入数小于父，那就直接停止
2. 每pop一个数字，这个数字就是目前的最大值，此时要做的事情是
   1. 把队尾的数字，放到队首来，填补pop后的空缺
   2. 自顶向下，比较子与父的值
      1. 如果子大于父，那么就要调换位置，然后小的数字来到子的位置充当父，继续父子值的比较
      2. 如果子都小于父，那么说明目前结构正确，直接跳出循环



## 回溯

回溯主要用在数字的**全排列**或者例举出所有可能性的问题上。回溯的本质就是暴力穷举

列出所有可能性其实就是所有可选类型的排列组合，当选择A为第一个选项后，选项数-1，已选项+1。 剩下的选项重复重复这个步骤。

当所有选项都用完了，说明一条路走到底了，即一种排列完成了。此时就需要开始**回溯**，从最后一层返回回去，比如倒数第二层，可能有AB两个选择，之前选了A，那么这次就要选B。例子42题全排列

但是也不能思维定式，比如复原ip问题 93题，这里并没有撤销选择的过程，因为数字的顺序是固定的，它会按照顺序一位一位得去穷举，比如`11111`这个数字，它会取出`1`然后去递归穷举`1111`的可能性，完了之后再取`11`然后穷举`111`的可能性，以此类推。

```javascript
// 排列组合的公式
for 选择 in 选择列表:
    # 做选择
    将该选择从选择列表移除
    路径.add(选择)
    backtrack(路径, 选择列表)
    # 撤销选择
    路径.remove(选择)
    将该选择再加入选择列表

// 不能移动位置的组合大致公式
const ans = [];
const backtrack = (start, tempAns) => {
    if (start === s.length) { // 表示走到最后，填入答案
      ans.push(tempAns);
      return;
    }
    let temp = "";
    for (let end = start; end < s.length; end++) {
      const cur = s[end];
      temp = `${temp}${cur}`;
      if (isValid(temp)) {
        const _tempAns = [...tempAns];
        _tempAns.push(temp);
        backtrack(end + 1, _tempAns); // 如果当前组合合理，那么就从当前的后一位开始重新算，同时把临时结果传下去
      }
    }
  };
```





## 动态规划

总体思想就是把大的问题化解成小的子问题。最简单的比如斐波那契，求第N个数字，其实就是N-1和N-2两个数字的和。那么这就会被分界为直到1的N个子斐波那契数的问题。

经典的找零问题，有三种货币面额分别是[1, 5, 11]，给定总数面值n，问所需最少货币数凑出n

得到一个方程： `f(n) = Math.min((f(n - 1) + 1), (f(n-2) + 1), (f(n-5) + 1))`

即我假设我确定最后付出一个面额是x，那么在这个前提下，只要求出凑`n-x` 这个总额的最优解然后加一就好了，这就可以和斐波那契一样递归解决了，代码大致如下

```javascript
function f(n) {
    if(n === 0) return 0
    let min = Infinity
    if (n >= 1) {
        min = Math.min(f(n-1) + 1, min)
    }

    if (n >= 5) {
        min = Math.min(f(n-5) + 1, min)
    }

    if (n >= 11) {
        min = Math.min(f(n-11) + 1, min)
    }

    return min
}

console.log(f(15)) // 3
```

但这样会有两个问题，

1. 如果n非常大，直接这么计算会重复计算非常多次相同的子问题，解决方法可以是加一个缓存来记录
2. 递归最大的问题就是会有爆栈的风险，如果n超过20000就随时会爆

所以另外一种方式就是转递归为迭代，递归的思想就是不要**从顶向下**而是**自底向上**，因为我们知道，这种递归的结束条件就是n到0，即从0到n的所有中间结果其实都是要计算的，那不如直接从0开始一个个向上计算



以上是比较简单的一维动态规划，一般还有更加复杂的范围动态规划，比如*最长回文子序列* ，求一个字符串s中最长的回文子序列(可以删除字符)长度。

我们假设最长的子序列开始和结束的下标分别为`low`和`high`，这些下标可能是字符串中的任意位置

此时我们建立一个二维数组`dp[low][high]`，来记录所有的可能性，即所有子问题的可能结果

- 假设low和hight相同，即长度只有1，所以结果也是1
- `s[low]`和`s[high]`相同，那么low和high肯定是可以形成回文的，那只要求出`dp[low+1][high-1]`（这个表示两个下标间最大的可能性）然后+2即可
- `s[low]`和`s[high]`不相同，表示头尾是不可能形成回文的，这里就要求出`Math.max(dp[low][high - 1], dp[low + 1][high])`，表示头或者尾不变的前提下，对方缩进一位的最大值
- 最后只要取出`dp[0][s.lengt-1]`即可
- 要注意遍历顺序，low不能从0开始，必须从最大值开始，数据才能准备好





## 通用技巧

因为js里面0直接去判断非空会为false，所以有的时候0为有意义的值的时候，比如记录指针下标，最后要判断下标是不是为空。如果这时候把空指针用`null`来指定，那接下来所有的判断都要加上`x !== null` 非常不方便，可以将下标设置为`-1`，然后判断是不是大于等于0就好

遇到字符串计数相关的问题，可以考虑用Map来做count计数

- 逆向思维
  - 比如[合并排序的数组](https://leetcode.cn/problems/sorted-merge-lcci/solution/mian-shi-ti-1001-he-bing-pai-xu-de-shu-zu-by-leetc/)这题，表面上是要从前到后合并排序，如果这么做的话就要涉及数组的移位，计算空值等问题。如果换个思路，从尾巴上开始，从两个数组中取出最大的放在最后的位置。这样就规避了上面的问题且要考虑的边界问题就少很多。
  - 比如各种动态规划问题，比如背包，N的体积如何价值最大化。如果正向从0开始凑，就会发现后面的问题无比复杂，还不如从**尾**开始，确定最后一个要放进去的是什么，比如M，然后问题就变成了（N - M）下的背包问题，如果就变成了一个可以递归的子问题。加上缓存之后，就能高效得解出问题



### 例题

#### **对象的层序遍历**

```javascript
const obj = {
  a: {
    b: {
      c: { f: 'aa' },
    },
    d: {
      e: { g: 'bb' },

      h: { i: 'cc' },
    },
    j: {
      k: 'dd',
    },
  },
};

const result = [];
const getKeys = (stack) => {
  if (!stack.length) {
    return;
  }
  for (let i = stack.length - 1; i >= 0; i--) {
    result.unshift(Object.keys(stack[i])[0]);
  }

  const tempStack = [];
  while (stack.length) {
    const cur = stack.shift();
    const curKey = Object.keys(cur)[0];
    if (!cur[curKey] || typeof cur[curKey] === 'string') {
      continue;
    }
    const subKeys = Object.keys(cur[curKey]);
    for (const key of subKeys) {
      tempStack.push({ [key]: cur[curKey][key] });
    }
  }
  getKeys(tempStack);
};

getKeys([obj]);

console.log('result: ', result);

// 输出 [f,g,i,c,e,h,k,b,d,j,a]
```



#### 求二叉树公共父节点

思路：

1. 只有两种可能的情况，第一种，两个点互为父子链路上的节点
2. 两个点分别在某个点的两侧，不可能有第三种情况
3. 当自身等于p或者q，且左右子任一找到另一个值，得到答案
4. 但左右子同时找到目标值，此时自身也是答案

```javascript
var lowestCommonAncestor = function (root, p, q) {
  let ans;
  const dfs = (root, p, q) => {
    if (root === null) return false;
    const lson = dfs(root.left, p, q);
    const rson = dfs(root.right, p, q);
    
    if (
      (lson && rson) ||
      ((root.val === p.val || root.val === q.val) && (lson || rson))
    ) {
      ans = root;
    }
    return lson || rson || root.val === p.val || root.val === q.val;
  };
  dfs(root, p, q);
  return ans;
};
```

