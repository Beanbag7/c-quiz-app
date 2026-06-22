---
doc_type: requirement
slug: quiz-bank-dynamic-management
pitch: 题库数据入库 MySQL，前端页面可动态增删改查
status: current
last_reviewed: 2026-06-18
implemented_by:
  - mysql-quiz-bank
tags:
  - backend
  - frontend
  - admin
  - quiz-bank
  - mysql
---

# 题库动态管理能力

## 用户故事

- 作为管理员，我希望能通过网页界面新增/编辑/删除题库，而不是每次手动编辑 JSON 文件再部署。
- 作为管理员，我希望能将已有题库 JSON 批量导入到系统中。
- 作为普通用户，我希望刷题体验不受影响，即使数据库暂时不可用也能答题。

## 为什么需要

当前题库为 `public/*.json` 静态文件，每次新增或修改题库都需要：编辑文件 → 本地构建 → 上传服务器 → 重启服务。题库增加到 8 个后，维护成本显著上升，且非技术人员无法操作。

## 怎么解决

题库元数据和题目存入 MariaDB，通过 REST API 提供 CRUD 操作。前端加载时 API 优先，失败则回退到静态 JSON。管理员页面新增"题库管理"入口。

## 边界

- 不改变现有答题逻辑，只是数据源从静态文件变为数据库
- 不要求实时同步，静态 JSON 作为回退保留
- 不涉及用户答题记录存储（仍用 Redis）
- 不涉及题库版本管理或协作编辑

## 验收标准

- 所有题库可从 MySQL 加载
- API 失败时自动回退静态 JSON
- 管理员可通过网页新增/编辑/删除题库
- 管理员可通过网页批量导入 JSON
- 管理员可预览题库中的题目列表
