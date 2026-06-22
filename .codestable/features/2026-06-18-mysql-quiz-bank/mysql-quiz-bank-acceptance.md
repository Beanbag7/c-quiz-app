---
doc_type: feature
feature_status: accepted
slug: mysql-quiz-bank
implemented_by:
  - server/src/db/mysqlPool.js
  - server/src/db/schema.sql
  - server/src/db/migrate.js
  - server/src/services/quizBankService.js
  - server/src/routes/quiz.js
  - server/src/routes/admin.js
  - src/App.jsx
  - src/services/quizApi.js
  - src/components/AdminQuizManager.jsx
tags:
  - backend
  - database
  - mysql
  - quiz-bank
---

# MySQL 题库迁移验收

## 改动范围

### 后端
- `server/src/db/schema.sql`：`quiz_banks` + `questions` 两张表
- `server/src/db/mysqlPool.js`：mysql2/promise 连接池
- `server/src/db/migrate.js`：JSON → MySQL 批量导入
- `server/src/services/quizBankService.js`：完整 CRUD 操作
- `server/src/routes/quiz.js`：`GET /api/quiz/banks`、`GET /api/quiz/banks/:subject/questions`
- `server/src/routes/admin.js`：`GET/POST/PUT/DELETE /api/admin/quiz/banks`、CRUD questions、`POST import`
- `server/src/config.js`：MySQL 连接配置

### 前端
- `src/App.jsx`：`loadQuestions` 改为 API 优先 + 静态 JSON 回退；admin 页新增标签页
- `src/services/quizApi.js`：题库 API 客户端
- `src/components/AdminQuizManager.jsx`：题库管理 UI（创建/编辑/删除/导入/题目预览）

### 部署
- `server/deploy/deploy-centos-systemd.sh`：新增 MariaDB 安装、swap 创建、MySQL 环境变量
- `scripts/migrate-quiz-to-mysql.js`：命令行迁移入口
- `package.json`：新增 `mysql2` 依赖、`migrate` 脚本

## 验收标准

- [x] 8 个题库、1845 题全部迁移到 MySQL
- [x] `GET /api/quiz/banks` 返回所有题库元数据
- [x] `GET /api/quiz/banks/:subject/questions` 返回题目（选项为对象、答案为正确类型）
- [x] `POST /api/admin/quiz/banks/:id/import` 支持 JSON 批量导入
- [x] 前端 `loadQuestions` API 优先，失败时回退静态 JSON
- [x] 管理员页"题库管理"标签页可见，支持 CRUD
- [x] MariaDB 已安装并运行
- [x] 服务器 swap 已配置（1GB）
- [x] 本地构建通过

## 已知约束

- 服务器 402MB RAM，禁止远端 `vite build`，必须本地构建后 rsync
- `public/*.json` 保留作为回退数据源
