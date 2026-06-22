---
doc_type: dev-guide
slug: local-development
component: project
status: current
summary: 介绍 c-quiz-app 的本地开发环境、目录结构、运行命令和常见检查。
tags: [development, vite, express]
last_reviewed: 2026-06-21
---

# 本地开发与项目结构

## 概述

c-quiz-app 是一个题库练习 Web 应用。前端使用 React + Vite，后端使用 Node.js + Express，题库主数据存储在 MariaDB/MySQL 中，Redis 用于在线状态、会话和排行榜等运行时数据；Redis 不可用时，部分能力会回退到内存实现。

## 前置依赖

- Node.js：项目当前使用 Vite 7，建议使用本机已有的 Node 24 环境。
- MariaDB/MySQL：存储 `quiz_banks` 和 `questions`。
- Redis：存储访客在线状态、管理员 session、聊天排行榜等运行时数据。
- 环境变量：后端启动至少需要 `ADMIN_PASSWORD` 和 `SESSION_SECRET`。

本地 shell 如果找不到 `node` / `npm`，可使用项目常用路径：

```bash
PATH=/Users/modaoshi/.nvm/versions/node/v24.15.0/bin:$PATH npm run build
```

## 快速上手

安装依赖：

```bash
npm install
```

启动前端开发服务器：

```bash
npm run dev
```

启动后端开发服务器：

```bash
npm run dev:server
```

同时启动前后端：

```bash
npm run dev:all
```

构建前端产物：

```bash
npm run build
```

运行服务端测试：

```bash
npm run test:server
```

## 核心目录

| 路径 | 作用 |
| --- | --- |
| `src/App.jsx` | 主应用状态、题库选择、题型过滤、答题流程 |
| `src/components/` | 题目、填空题、解答题、聊天、管理员页面等 UI 组件 |
| `src/services/` | 前端 API client |
| `server/src/app.js` | Express app 组装 |
| `server/src/index.js` | HTTP + WebSocket 服务启动入口 |
| `server/src/routes/` | `/api` 路由 |
| `server/src/services/` | 访客、封禁、题库、聊天等业务服务 |
| `server/src/db/` | MySQL 连接、DDL 和迁移逻辑 |
| `public/*.json` | 静态题库回退数据和迁移源 |
| `public/assets/` | 题库图片资源 |
| `.codestable/` | 项目过程文档、架构、需求、决策和经验 |

## 关键开发约束

- 前端读取答案字段必须使用三级回退：`答案文本 ?? 正确答案 ?? 答案`。
- 格式化工具函数要对 `undefined` 安全，使用 `String(value ?? '')`。
- 新题库不能只改 JSON；如果需要进入 MySQL 主数据，还要更新迁移配置并执行迁移。
- 题库图片放在 `public/assets/`，JSON 中使用相对路径，例如 `assets/ds_images/...`。
- 仅前端改动时，本地 build 后同步 `dist/` 即可；服务端代码变更才需要重启服务。

## 常见检查

构建是否通过：

```bash
npm run build
```

服务端测试是否通过：

```bash
npm run test:server
```

查看当前题库 API：

```bash
curl http://localhost:3001/api/quiz/banks
```

查看数据结构题库题目：

```bash
curl http://localhost:3001/api/quiz/banks/ds/questions
```

## 相关文档

- [部署与线上验证](./deployment.md)
- [题库数据与管理](./quiz-bank-management.md)
- [题库数据格式要求](../quiz-bank-format.md)
- [系统架构](../../.codestable/architecture/ARCHITECTURE.md)
