---
doc_type: learning
track: knowledge
status: current
summary: MySQL 迁移中遇到的 OOM、格式反序列化、字符数组答案等关键坑及解决方案
tags:
  - backend
  - database
  - quiz-bank
  - mysql
  - deployment
severity: high
component: quiz-backend
source_type: feature
source_path: .codestable/features/2026-06-18-mysql-quiz-bank/mysql-quiz-bank-acceptance.md
---

# MySQL 题库迁移中的关键坑

## 1. 402MB RAM 服务器无法完成 Vite 构建

**现象**：在服务器上执行 `vite build` 时，内存耗尽导致 SSH 断开、HTTP 无响应、服务器需硬重启。

**根因**：Vite 7 + MariaDB + Redis + Node + Nginx 同时运行，402MB 物理内存不足以支撑构建过程。即使加了 1GB swap，构建仍可能导致 OOM。

**解决**：改为本地构建 + rsync dist/ 到服务器。部署脚本不再在远端执行 `vite build`，`push-and-deploy.sh` 只负责 rsync 源码和重启服务。

**以后默认做法**：<=512MB RAM 的 VPS 上，前端构建必须在本地完成，dist 目录通过 rsync 上传。

## 2. `parseJsonSafe` 过度反序列化

**现象**：填空题答案 `"42"` 从 MySQL 读出后被 `JSON.parse` 成数字 `42`，前端调用 `.trim()` 报 `TypeError`。

**根因**：原来的 `parseJsonSafe` 对所有值都尝试 `JSON.parse`。`"42"`、`"true"`、`"null"` 都是合法 JSON 字面量，会被成功解析为数字/布尔值/null。

**解决**：`parseJsonSafe` 仅对首字符为 `[` 或 `{` 的值做 JSON 解析。纯数字、布尔值、null 保持原始字符串。

## 3. 源 JSON 中填空题答案存为字符数组

**现象**：数据结构题库中部分填空题答案在源 JSON 里是 `["N","U","L","L"]` 而不是 `"NULL"`，前端无法正确判分。

**根因**：题库制作工具将答案按字符拆成了数组。MySQL 以 JSON 数组字符串 `["N","U","L","L"]` 存储，`parseJsonSafe` 正确解析为数组，但 `.trim()` 不支持数组类型。

**解决**：在 `formatQuestionRow` 中检测答案是否为数组，若是则 `join('')` 合并为字符串。

**以后默认做法**：接入新题库时必须校验填空题答案类型，字符数组自动合并。

## 4. MySQL JSON 列返回字符串

**现象**：`选项` 字段在 API 响应中是 JSON 字符串 `'{"A":"...","B":"..."}'` 而非对象，前端按字符遍历，一个字符一个选项。

**根因**：`mysql2` 默认将 JSON 列返回为字符串，不自动解析。原代码未调用 `JSON.parse`。

**解决**：`formatQuestionRow` 中通过 `parseJsonSafe` 统一处理 `选项` 字段，字符串时自动解析为对象。

## 5. MariaDB 安装后不自动启动

**现象**：`dnf install mariadb-server` 成功后 `systemctl is-active mariadb` 返回 `inactive`。

**解决**：部署脚本中显式调用 `systemctl enable --now mariadb`，并创建数据库和用户。

## 一句话总结

**在 512MB 以下 VPS 上部署 Node 项目，前端构建必须在本地完成；MySQL 迁移中答案和选项的序列化格式需在服务层做防御性规范化处理。**
