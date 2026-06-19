---
doc_type: learning
track: knowledge
status: current
summary: 填空题提交崩溃、简答题跳转失败、答案字段三种命名混用的根因与统一处理
tags:
  - frontend
  - quiz-bank
  - bugfix
  - data-schema
severity: high
component: quiz-frontend
source_type: feature
source_path: .codestable/features/2026-06-19-answer-field-normalization/answer-field-normalization-acceptance.md
---

# 答案字段不一致导致的三个 Bug

## 1. 填空题提交崩溃 TypeError

**现象**：数据结构题库填空题提交答案后页面无反应，控制台报 `TypeError: Cannot read properties of undefined (reading 'trim')`，堆栈指向 `App.jsx:860 normalize` → `App.jsx:884`。

**根因**：`App.jsx` 的答案验证逻辑硬编码读取 `currentQuestion.正确答案`，但 **database 题库填空题只有 `答案` 字段**（没有 `正确答案`/`答案文本`）。`currentQuestion.正确答案` 为 `undefined`，`normalize(undefined)` → `undefined.trim()` 崩溃。

**关键发现**：这不是数据结构题库特有的，是**所有只有 `答案` 字段的题库**（database 题库 18 道填空题）都受影响，只是之前没人测到。

**解决**：
- `normalize` 函数改为 `(str) => String(str ?? '').trim().toLowerCase()`，对 undefined 安全
- 答案取值改用 `currentQuestion.答案 ?? currentQuestion.正确答案 ?? currentQuestion.答案文本` 兼容三种字段

## 2. 简答题提交跳不到下一题

**现象**：数据结构题库解答题提交答案后无评分、无参考答案、无下一题按钮。

**根因**：`EssayQuestion.jsx:92` `calculateScore(userAnswer, question.答案)` —— `question.答案` 为 `undefined`（MySQL `formatQuestionRow` 输出 `答案文本`/`正确答案`，**没有 `答案` 字段**）。评分函数对 undefined 计算，且参考答案显示 `question.答案` 也是空。

**解决**：评分和参考答案统一改用 `question?.答案文本 ?? question?.正确答案 ?? question?.答案`。

## 3. 填空题答案显示不全

**现象**：数组答案题（如 `["主码","外码"]`）显示成无序列表，长答案显示异常。

**根因**：`FillBlankQuestion.jsx:42` `answerContent = question.答案 ?? question.答案文本 ?? question.正确答案`，当 `正确答案` 是数组时，渲染逻辑用 `Array.isArray` 判断后渲染成 `<ul><li>` 列表。

**解决**：新增 `normalizeAnswer`（统一归一化为字符串数组）+ `formatAnswerDisplay`（多答案用顿号连接）。

## 4. 三种答案字段的分布（实测）

| 题库 | 题型 | 字段 | 样本 |
|------|------|------|------|
| database | 填空题 | `答案`（字符串/数组） | `答案: "模式"` / `答案: ["主码","外码"]` |
| ds | 填空题 | `答案文本` + `正确答案` | `答案文本: "芬兰"` / `正确答案: ["N","U","L","L"]` |
| sxyz | 填空题 | `答案文本` + `正确答案` | `答案文本: "芬兰"` |
| ds | 解答题 | `答案文本` + `正确答案`（字符串） | `答案文本: "逻辑结构指..."` |

## 5. SSH 密码连接触发限流

**现象**：部署时连续多次 `sshpass ssh` / `scp`，偶发 `Permission denied (publickey,...)`。

**根因**：阿里云对 SSH 短时间高频密码登录有防护，触发后短暂拒绝。

**解决**：失败后 `sleep 3` 重试；或在同一条 SSH 命令里批量执行，减少连接次数。

## 以后默认做法

- **前端读取答案字段时，必须用三级回退** `答案文本 ?? 正确答案 ?? 答案`，不能假设字段名固定
- **`normalize` 类工具函数必须对 undefined/null 安全**（`String(x ?? '')`），题库数据字段缺失是常态
- **接入新题库时，必须逐题型检查答案字段名**，不能假设和已有题库一致
- 题库数据回归测试要覆盖：database（只有 `答案`）、ds（`答案文本`+`正确答案` 数组）、sxyz（`答案文本` 字符串）三种格式

## 一句话总结

**题库答案字段在历史上形成了 `答案`/`答案文本`/`正确答案` 三种命名混用，前端任何读取答案的代码都必须做三级回退，且工具函数要对 undefined 安全。**
