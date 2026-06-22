---
doc_type: decision
decision_type: convention
status: accepted
summary: 填空题连续作答统一采用 form submit、正确自动切题、错误手动确认、切题自动聚焦的交互约定
tags:
  - frontend
  - fillblank
  - keyboard
  - ux
component: quiz-runtime
source_type: feature
source_path: .codestable/features/2026-05-30-fillblank-auto-next-focus/fillblank-auto-next-focus-acceptance.md
---

# 填空题连续作答交互约定

## 决定

项目内填空题的连续作答交互统一采用以下约定：

1. 填空题输入区使用原生 `form onSubmit` 作为唯一提交入口。
2. 回车提交和“提交答案”按钮必须走同一条业务提交链路。
3. 答案正确时，显示短暂正确反馈后自动进入下一题。
4. 答案错误时，不自动跳题，保留手动“下一题”按钮。
5. 进入下一题后，输入框自动 `focus()` 并 `select()`。
6. 自动切题必须使用可清理定时器，避免旧回调串题。

## 背景

填空题是高频连续输入场景。用户期望答对后无需再点按钮，可直接进入下一题继续打字；但错误答案需要留出查看反馈和正确答案的时间，不能直接跳走。

早期只在 input 上处理 `keydown Enter`，提交语义分散；同时答对后仍保留手动“下一题”按钮，和自动切题定时器并存，存在重复切题或跳过题目的风险。

## 取舍

### 采用 form submit

优点：

- 浏览器原生支持 Enter 提交
- 按钮提交和键盘提交天然走同一条链路
- 后续加无障碍或移动端输入法时语义更清晰

约束：

- “查看答案”等非提交按钮必须显式 `type="button"`
- submit handler 必须 `preventDefault()`，避免页面刷新

### 正确自动跳、错误手动跳

优点：

- 正确答案走高速连续作答路径
- 错误答案保留学习反馈时间
- 避免错题还没看清就被自动跳过

约束：

- 正确反馈时不再显示手动“下一题”按钮，避免和定时器冲突
- 错误反馈才显示手动“下一题”按钮

### 切题自动聚焦

优点：

- 下一题可直接输入
- 更符合刷题场景的键盘优先体验

约束：

- focus 要在新题渲染后执行，可用 `requestAnimationFrame`
- 答案反馈状态下不要抢焦点

## 后续执行规则

以后修改填空题组件或新增填空题题库时，必须检查：

- `Enter` 和按钮是否仍共享同一 submit 链路
- 答对是否自动下一题
- 答错是否保留手动下一题
- 切题后 `document.activeElement?.id` 是否为 `fill-answer`
- 自动下一题 timeout 是否会在切题/卸载时清理

## 关联文档

- `.codestable/features/2026-05-30-fillblank-auto-next-focus/fillblank-auto-next-focus-acceptance.md`
- `.codestable/compound/2026-05-30-learning-fillblank-keyboard-flow.md`
- `.codestable/architecture/ARCHITECTURE.md`
