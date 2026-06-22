---
doc_type: decision
decision_type: architecture
status: accepted
summary: 题库数据采用 MariaDB (MySQL) 存储，替代纯静态 JSON 文件，实现前端动态管理
tags:
  - backend
  - database
  - quiz-bank
  - mysql
component: quiz-backend
source_type: feature
source_path: .codestable/features/2026-06-18-mysql-quiz-bank/mysql-quiz-bank-acceptance.md
---

# 题库存储方案：MySQL 替代纯静态 JSON

## 决定

题库数据和元数据采用 MariaDB (MySQL) 存储，通过 `mysql2` 连接池访问。前端加载为 API 优先，`public/*.json` 保留作为静态回退。

## 背景

原有题库为 `public/*.json` 静态文件，前端 `fetch` 直接加载。用户要求题库数据存入数据库，前端可动态管理（增删改查、JSON 导入）。

两个候选方案：

| 方案 | 存储 | 复杂度 | 部署影响 |
|------|------|--------|----------|
| A. Redis | 已有服务，零额外部署 | 半结构化查询弱 | 无 |
| B. MariaDB | 需安装新服务 | 关系型查询强，适合结构化题库数据 | 需修改部署脚本 |

## 取舍

选择 **方案 B (MariaDB)**：

- 题库数据结构化程度高（bank → questions → options），关系型存储更自然
- 需要 CRUD + 批量导入 + 题型统计，SQL 查询比 Redis 命令更直接
- 用户明确选择 MySQL（在方案 A/B 中被问到后选了 B）
- MariaDB 是 CentOS Stream 9 默认软件源中的 MySQL 兼容实现，安装简单

代价：
- 服务器需多跑一个数据库进程（~50MB 内存），对 402MB RAM VPS 有压力
- 部署脚本需新增 MariaDB 安装和初始化逻辑
- 需要 `mysql2` npm 包作为新依赖

## 实施决策

- 使用 MariaDB 10.5（CentOS Stream 9 默认），MySQL 兼容协议
- 连接池：`mysql2/promise`，connectionLimit=10
- 表设计：`quiz_banks` + `questions`（选项存 JSON 列）
- 迁移策略：幂等脚本，已存在的 bank 替换题目，不存在的 bank 新建
- 前端回退：API 失败时自动回退到静态 JSON，确保即使 MySQL 不可用也能答题

## 关联文档

- `.codestable/compound/2026-06-18-learning-mysql-quiz-bank.md`
