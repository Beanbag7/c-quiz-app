---
doc_type: issue-fix
issue: 2026-05-25-sxyz-answering-bug
status: confirmed
severity: P1
tags:
  - frontend
  - sxyz
  - quiz
  - multiselect
  - fillblank
summary: 修复形势与政策题库多选题无法正常作答及填空题错误反馈答案不显示的问题
---

# sxyz-answering-bug Fix Note

## 修复摘要

修复了形势与政策题库中的两个答题问题：

1. 多选题此前落入单选逻辑，无法按数组答案正常判题。
2. 填空题答错后，反馈组件仅读取 `question.答案`，导致 sxyz 题库无法显示正确答案。

## 根因

- `src/App.jsx`
  - `多选题` 没有独立渲染/提交分支，默认走单选逻辑。
  - 默认选择题逻辑使用单值比较 `optionKey === currentQuestion.正确答案`，不兼容 sxyz 多选题的数组答案。
- `src/components/FillBlankQuestion.jsx`
  - 错误反馈区只读取 `question.答案`，但 sxyz 填空题使用 `正确答案` / `答案文本`。

## 修改文件

- `src/App.jsx`
- `src/components/FillBlankQuestion.jsx`

## 具体修复

### 1. App.jsx

- 新增 `多选题` 独立渲染分支。
- 接入已有多选状态：`multiSelectedAnswers`、`multiSubmitted`、`multiCorrect`。
- 新增多选切换与提交逻辑，按无序数组比较判断正确答案。
- 补齐多选状态在下一题、重新开始、重置练习时的清理。

### 2. FillBlankQuestion.jsx

- 将反馈答案来源改为兼容链：`答案 -> 答案文本 -> 正确答案`。
- 保持原有数组/单值展示能力。

## 验证结果

### 静态验证

- `lsp_diagnostics src/App.jsx`：无 error，仅有既有未使用变量 hint。
- `lsp_diagnostics src/components/FillBlankQuestion.jsx`：无 error，仅有 React 未使用 hint 和 `onKeyPress` deprecated hint。
- `npm run build`：通过。

### 浏览器验证（cmux）

本地 dev server：`http://127.0.0.1:4173`

#### 形势与政策 -> 多选题

- 进入 `形势与政策` -> `多选题`
- 可同时选中 A/B/C/D，DOM 中四个按钮均带 `option-button selected`
- 提交后显示：`✓ 回答正确！`
- 统计正确更新为 1，正确率 100%

#### 形势与政策 -> 填空题

- 进入 `形势与政策` -> `填空题`
- 输入错误答案并提交
- 页面正确显示：
  - `✗ 回答错误`
  - `正确答案：芬兰`

## 影响面

- 改动限定在已定位的两个前端文件。
- GitNexus impact 分析结果：`App` / `FillBlankQuestion` 均为 LOW risk。

## 顺手发现

- `src/App.jsx` 中仍有未使用状态/工具函数（如 `practiceMode`、`shuffleOptionsOnly`），不在本次 bug 修复范围内。
- `FillBlankQuestion.jsx` 仍在使用 `onKeyPress`，属于兼容性提示，不在本次修复范围内。
