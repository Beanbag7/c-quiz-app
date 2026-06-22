---
doc_type: dev-guide
slug: quiz-bank-management
component: quiz-bank
status: current
summary: 说明题库数据模型、API、迁移流程和新增题库注意事项。
tags: [quiz-bank, mysql, json]
last_reviewed: 2026-06-21
---

# 题库数据与管理

## 概述

题库主数据存储在 MariaDB/MySQL。前端加载题库时优先请求 API，API 不可用时回退到 `public/*.json` 静态文件。管理员页面支持创建、编辑、删除题库，并批量导入 JSON 题目。

## 数据模型

| 表 | 作用 |
| --- | --- |
| `quiz_banks` | 题库元数据，包含 `subject_key`、名称、图标、排序 |
| `questions` | 题目数据，包含题型、题干、选项、答案、解析、分值、章节、图片 |

`questions.options`、`questions.question_images` 使用 JSON 存储。`correct_answer` 使用 TEXT 存储：多选题可保存为 JSON 数组字符串，其余题型通常保存纯文本。

## 前端加载流程

1. 调用 `GET /api/quiz/banks/:subject/questions`。
2. API 成功时使用返回的 `questions`。
3. API 失败时回退到 `public` 下对应 JSON 文件。
4. 根据题库类型统计题型数量并进入题型选择。
5. 开始练习时会打乱题目顺序。

## 公开 API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/quiz/banks` | 获取题库列表 |
| `GET` | `/api/quiz/banks/:subject/questions` | 按 `subjectKey` 获取题目 |

## 管理员 API

以下接口需要管理员 session：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/admin/quiz/banks` | 管理端题库列表 |
| `POST` | `/api/admin/quiz/banks` | 创建题库 |
| `PUT` | `/api/admin/quiz/banks/:id` | 更新题库名称、图标、排序 |
| `DELETE` | `/api/admin/quiz/banks/:id` | 删除题库和题目 |
| `GET` | `/api/admin/quiz/banks/:id/questions` | 获取题库题目 |
| `POST` | `/api/admin/quiz/banks/:id/questions` | 创建单题 |
| `PUT` | `/api/admin/quiz/banks/:bankId/questions/:questionId` | 更新单题 |
| `DELETE` | `/api/admin/quiz/banks/:bankId/questions/:questionId` | 删除单题 |
| `POST` | `/api/admin/quiz/banks/:id/import` | 用 JSON 批量替换题库题目 |

## JSON 导入格式

管理员导入时，JSON 顶层必须包含 `questions` 数组：

```json
{
  "questions": [
    {
      "序号": 1,
      "题目类型": "选择题",
      "题目内容": "题干",
      "选项": { "A": "选项 A", "B": "选项 B" },
      "正确答案": "A",
      "答案文本": "选项 A"
    }
  ]
}
```

完整字段规范见 [题库数据格式要求](../quiz-bank-format.md)。

## 新增题库流程

1. 准备符合格式的 JSON 文件。
2. 将图片资源放在 `public/assets/`，JSON 中使用相对路径。
3. 如果要纳入迁移脚本，更新 `server/src/db/migrate.js` 的 `bankDefinitions`。
4. 执行迁移：

```bash
npm run migrate
```

5. 前端如需固定展示新题库卡片，更新 `src/App.jsx` 题库选择区域和 `fileMap` 回退映射。
6. 本地构建并按部署文档上线。

## 答案字段规范

历史题库中存在 `答案`、`答案文本`、`正确答案` 三种字段命名。前端读取答案时必须使用：

```js
question?.答案文本 ?? question?.正确答案 ?? question?.答案
```

不要只读单一字段。

## 图片规范

- 题干图片：推荐存入 `题目图片` 数组或直接在题干中使用 `<img>`。
- 答案图片：可放在 `答案文本` 中，解答题支持 Markdown 图片语法。
- 图片路径使用相对路径，例如 `assets/ds_images/...`。

## 相关文档

- [题库数据格式要求](../quiz-bank-format.md)
- [管理员功能](../user/admin.md)
- [部署与线上验证](./deployment.md)
