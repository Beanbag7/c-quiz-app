---
doc_type: feature-acceptance
feature: 2026-05-30-fillblank-view-answer
status: confirmed
summary: 填空题增加"查看答案"按钮，点击后展示正确答案并记入错题集，用户仍可继续输入提交
tags:
  - frontend
  - fillblank
  - ux
---

# fillblank-view-answer Acceptance

## 需求摘要

填空题答题时，用户可点击"查看答案"按钮直接看到正确答案。查看后该题记入错题集，但输入框和提交按钮保持可用，用户仍可正常输入并提交答案。

## 实现核对

| 项目 | 状态 | 说明 |
|---|---|---|
| 查看答案按钮渲染 | ✓ | 未提交且未查看时，"提交答案"旁显示"查看答案" |
| 查看后显示正确答案 | ✓ | 输入框下方独立区域展示正确答案（蓝色高亮） |
| 查看后仍可答题 | ✓ | 输入框不禁用，提交按钮可用，回车提交正常 |
| 查看即记入错题集 | ✓ | `onViewAnswer` 回调中将该题加入 `wrongAnswers` |
| 查看后按钮消失 | ✓ | `answerRevealed=true` 后隐藏"查看答案"按钮 |
| 下一题/重置状态清理 | ✓ | 所有 4 处 fillBlank 重置逻辑均包含 `setFillBlankRevealed(false)` |
| 回车提交 | ✓ | `onKeyDown` 替代弃用的 `onKeyPress`，Enter 键提交答案 |
| 构建 | ✓ | `npm run build` 通过 |

## 修改文件

| 文件 | 改动 |
|---|---|
| `src/App.jsx` | 新增 `fillBlankRevealed` 状态；`onViewAnswer` 回调设置 revealed + 记错题；传入 `answerRevealed` prop；4 处重置逻辑补 `setFillBlankRevealed(false)` |
| `src/components/FillBlankQuestion.jsx` | 新增 `onViewAnswer` / `answerRevealed` prop；按钮区改为 flex 双按钮；已查看时显示正确答案区域但不禁用输入；`onKeyPress` → `onKeyDown` |
| `src/components/FillBlankQuestion.css` | 新增 `.fill-blank-actions` flex 布局、`.view-answer-button` 样式、`.revealed-answer-section` 样式 |

## 影响面

- 仅影响填空题渲染路径，不影响单选/多选/判断/解答题
- 所有题库（形势与政策、数据库等）的填空题均适用

## 遗留

- 无
