---
doc_type: learning
track: knowledge
status: current
summary: 填空题键盘流不是单个 keydown 事件，必须把提交、判题、自动切题、焦点恢复和验收方式当成一条闭环
tags:
  - frontend
  - fillblank
  - keyboard
  - ux
  - verification
severity: medium
component: quiz-runtime
source_type: feature
source_path: .codestable/features/2026-05-30-fillblank-auto-next-focus/fillblank-auto-next-focus-acceptance.md
---

# 填空题键盘流要按“连续作答闭环”设计

## 场景

这次用户要求填空题支持连续作答：

1. 在输入框里按回车提交答案
2. 如果答对，自动进入下一题
3. 到下一题后输入框自动获得焦点，用户可以继续直接输入

表面上看只是“Enter 后下一题”，实际牵涉到 React 受控输入、提交事件、状态重置、定时器清理和浏览器自动化验收。

## 容易踩的坑

### 1. 只绑 `onKeyDown` 不够稳

只在 input 上判断 `e.key === 'Enter'` 可以工作，但容易把提交语义分散在键盘事件里。后续如果按钮提交、回车提交、自动化脚本提交走不同路径，就会出现“某一种能用，另一种不触发”的假阳性。

最终做法是让填空题组件走原生 `form onSubmit`：

- Enter 触发表单提交
- “提交答案”按钮也是 `type="submit"`
- `onSubmit` 里统一 `preventDefault()` 再调用业务提交

这样键盘和按钮共享同一条链路。

### 2. 答对后自动下一题不能和手动下一题同时存在

一开始答对后仍保留“下一题”按钮，同时设置 500ms 自动切题。这样用户如果在 500ms 内手动点了下一题，旧定时器还能再触发一次，存在跳过题目的风险。

最终约定：

- 答对：显示正确反馈，短延迟后自动切题，不显示手动下一题按钮
- 答错：显示错误反馈和正确答案，保留手动下一题按钮

### 3. 自动切题必须清理定时器

自动切题的 timeout 如果不清理，用户退出练习、切换题型或组件卸载后，旧回调仍可能修改新状态。

最终做法：

- 用 ref 保存自动下一题定时器
- 手动切题前清理旧定时器
- 组件卸载时清理旧定时器

### 4. 下一题要恢复输入焦点

连续刷填空题时，用户期望答对后直接继续打字。如果切题后不 focus 输入框，就会多一次鼠标点击。

最终做法：

- 在 `FillBlankQuestion` 里根据 `questionKey` 监听题目切换
- 新题出现且不是答案反馈状态时，用 `requestAnimationFrame` 后 focus + select 输入框

### 5. cmux / WKWebView 验收不能只看 input value

这次验证中发现，`cmux browser fill` 在 WKWebView 场景下可能只修改 DOM input value，不一定完整驱动 React 受控状态；因此页面上看 input 有值，不代表 `fillBlankAnswer` 状态已更新。

验收时要看完整链路：

- 页面实际是否出现反馈
- 题号是否从 `1 / N` 变成 `2 / N`
- `document.activeElement?.id` 是否变成 `fill-answer`
- 生产首页 bundle hash 是否已切换

## 最终有效模式

填空题键盘流默认按这个模型实现：

```text
input/form submit
  ↓
统一业务提交函数
  ↓
判题并记录首次作答
  ↓
正确：短延迟自动切题 + 清理输入状态 + 新题自动聚焦
错误：展示反馈 + 手动下一题
```

## 以后默认做法

凡是新增或修改填空题交互，都要同时检查这 5 项：

1. Enter 和按钮是否走同一条 submit 链路
2. 正确/错误两条分支是否明确分开
3. 自动切题是否有定时器清理
4. 切题后输入框是否自动聚焦
5. 浏览器验收是否覆盖真实状态变化，而不是只看 DOM value

## 一句话结论

**填空题连续作答不是一个 keydown 小功能，而是一条从提交到切题再到焦点恢复的交互闭环；任何一环没收口，线上体验都会断。**
