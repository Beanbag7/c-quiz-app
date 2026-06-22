---
doc_type: docs-index
slug: project-docs
component: project
status: current
summary: c-quiz-app 项目文档入口，按开发者指南和用户指南分流。
tags: [docs, index]
last_reviewed: 2026-06-21
---

# c-quiz-app 文档

本目录存放面向外部读者的项目指南。内部过程文档、决策和踩坑记录放在 `.codestable/`；这里保留可直接使用的开发者指南和用户指南。

## 开发者指南

- [本地开发与项目结构](./dev/local-development.md)
- [部署与线上验证](./dev/deployment.md)
- [题库数据与管理](./dev/quiz-bank-management.md)
- [题库数据格式要求](./quiz-bank-format.md)

## 用户指南

- [刷题练习](./user/practice.md)
- [管理员功能](./user/admin.md)

## 文档维护约定

- 新增开发者指南放在 `docs/dev/`。
- 新增用户指南放在 `docs/user/`。
- 每份指南使用 YAML frontmatter 标记 `doc_type`、`slug`、`component`、`status` 和 `last_reviewed`。
- 前端行为变更后优先更新用户指南；接口、部署、数据结构变更后优先更新开发者指南。
