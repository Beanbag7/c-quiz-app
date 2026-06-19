---
doc_type: feature
feature_status: accepted
slug: essay-image-rendering
implemented_by:
  - src/components/EssayQuestion.jsx
  - src/components/EssayQuestion.css
  - server/src/db/schema.sql
  - server/src/db/migrate.js
  - server/src/services/quizBankService.js
  - public/questions_data_structure.json
  - public/images/ds_essay/
tags:
  - frontend
  - backend
  - quiz-bank
  - image
---

# 解答题答案图片渲染适配

## 改动范围

### 前端
- `src/components/EssayQuestion.jsx`：新增 `renderRichText`（正则解析 `![alt](src)` → `<img>`）；参考答案渲染改用 `renderRichText`，单答案 `<p>` → `<div>`；题干图片区块（`question.题目图片` 数组渲染）；`calculateScore` 和 `handleSubmit` 内 strip 图片语法避免干扰评分
- `src/components/EssayQuestion.css`：`.answer-image` / `.rich-text-line` / `.question-images` 样式 + 移动端适配

### 后端（为支持题干图字段持久化）
- `server/src/db/schema.sql`：questions 表新增 `question_images JSON` 列
- `server/src/db/migrate.js`：迁移脚本支持 `题目图片` 字段
- `server/src/services/quizBankService.js`：`formatQuestionRow` 输出 `题目图片`；`createQuestion`/`updateQuestion`/`bulkInsertQuestions`/`replaceBankQuestions` 读写 `question_images` 列

### 数据
- `public/questions_data_structure.json`：20 道解答题 `答案文本` 追加 Markdown 图片语法；13 道题新增 `题目图片` 字段
- `public/images/ds_essay/`：59 个图片文件（6.1MB）

## 改动动机

数据结构题库解答题答案已完成图片抓取回填，但 `EssayQuestion.jsx` 用纯文本 `{point}` 渲染，Markdown 图片语法 `![答案图片](/images/...)` 原样显示成文本，不会渲染成 `<img>`。

## 数据格式

### 答案图片（答案文本字段内嵌）
```json
{
  "序号": 69,
  "答案文本": "W、P、L、W、P、L\n\n![答案图片](/images/ds_essay/69_ans_1.jpg)"
}
```

### 题干图片（独立字段）
```json
{ "题目图片": ["/images/ds_essay/72_q_1.png"] }
```

## 渲染方案

- **零依赖正则方案**：`renderRichText` 用 `/!\[([^\]]*)\]\(([^)]+)\)/g` 解析，图片前的文本保留为 `<span>`，图片渲染为 `<img>`
- **评分 strip**：`calculateScore` 和 `handleSubmit` 内用 `replace(/!\[[^\]]*\]\([^)]*\)/g, '')` 去除图片语法，避免「答案图片」四字干扰关键词评分
- **无图题向后兼容**：纯文本原样返回

## 验收标准

- [x] 有图题（序号 69）：答案文字 + 图片正确渲染，无 `![...]` 文本泄漏
- [x] 多图题（序号 72）：双答案图正确渲染
- [x] 题干图题（序号 72）：题目内容下方显示题干图
- [x] 无图题（序号 66）：纯文本渲染，与改造前一致
- [x] 评分正常（图片说明文字不干扰关键词提取）
- [x] 移动端图片自适应不溢出
- [x] MySQL `question_images` 列已添加，`formatQuestionRow` 正确输出 `题目图片`
- [x] 线上 19 道答案图题 + 13 道题干图题全部生效

## 约束

- 题库 JSON 中题目内容内嵌的旧 `<img src="assets/ds_images/...">` HTML 标签会显示为文本，这是源数据问题，不在本次范围
- 图片路径使用绝对路径 `/images/ds_essay/xxx`（nginx root 指向 dist/，路径正确）

## 关联文档

- `.codestable/compound/2026-06-19-decision-essay-image-rendering.md`
