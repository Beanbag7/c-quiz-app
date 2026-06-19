---
doc_type: decision
decision_type: implementation
status: accepted
summary: 解答题图片采用零依赖正则渲染方案，题干图新增独立 question_images 列存储
tags:
  - frontend
  - backend
  - quiz-bank
  - image
component: essay-question
source_type: feature
source_path: .codestable/features/2026-06-19-essay-image-rendering/essay-image-rendering-acceptance.md
---

# 解答题图片渲染方案

## 决定

- 答案图片：在 `答案文本` 字段内嵌 Markdown 图片语法 `![alt](src)`，前端用零依赖正则解析渲染
- 题干图片：新增独立的 `question_images JSON` 列存储路径数组，与答案文本解耦

## 背景

数据结构题库解答题涉及哈夫曼树、邻接矩阵、邻接表等需要图示的内容。数据层已抓取图片回填到 JSON，但前端纯文本渲染导致 `![答案图片](...)` 原样显示。

两个渲染方案候选：

| 方案 | 实现 | 依赖 | 灵活性 |
|------|------|------|--------|
| A. markdown 库（react-markdown 等） | 完整 markdown 解析 | 新增 npm 依赖 | 支持全部 md 语法 |
| B. 正则解析图片语法 | 只解析 `![alt](src)` | 零依赖 | 仅图片 |

题干图片存储方案候选：

| 方案 | 存储 | 改动范围 |
|------|------|----------|
| A. 内嵌到题目内容文本 | `content` 列混入 md 语法 | 无需改 schema |
| B. 独立 `question_images` 列 | JSON 列存路径数组 | 需 ALTER TABLE + service 适配 |

## 取舍

### 渲染：选方案 B（正则）

- 题库数据中**只有图片**这一种 markdown 语法，无标题/列表/链接等，引入完整 markdown 库属于过度设计
- 零依赖，bundle 体积不增加
- 正则 `/!\[([^\]]*)\]\(([^)]+)\)/g` 足够覆盖所有场景，已在 Node 程序化测试验证

### 存储：选方案 B（独立列）

- 题干图是结构化数据（路径数组），不应混入 `content` 自由文本
- 独立列便于后续查询、批量管理（如统计哪些题有图）
- 与 `options` JSON 列的处理方式一致，符合现有 schema 设计风格

代价：
- 需要 `ALTER TABLE questions ADD COLUMN question_images JSON`（线上已执行）
- `quizBankService.js` 4 个写入函数 + `formatQuestionRow` 需适配（已完成）

## 实施决策

- `renderRichText` 函数：正则切分文本和图片，文本保留为 `<span className="rich-text-line">`，图片渲染为 `<img className="answer-image">`
- 评分 strip：`calculateScore` 和 `handleSubmit` 内 `replace(/!\[[^\]]*\]\([^)]*\)/g, '')` 去除图片语法，避免「答案图片」四字被当关键词
- 单答案渲染容器从 `<p>` 改为 `<div>`（`<p>` 内嵌 `<img>` 换行表现差）
- `question_images` 列可空，无图题为 NULL，`formatQuestionRow` 输出 `undefined`

## 关联文档

- `.codestable/features/2026-06-19-essay-image-rendering/essay-image-rendering-acceptance.md`
- `.codestable/compound/2026-06-19-learning-answer-field-normalization.md`
