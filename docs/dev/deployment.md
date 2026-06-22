---
doc_type: dev-guide
slug: deployment
component: deployment
status: current
summary: 说明 c-quiz-app 的线上部署方式、禁止远端构建约束和上线后验证清单。
tags: [deployment, nginx, rsync]
last_reviewed: 2026-06-21
---

# 部署与线上验证

## 概述

线上由 Nginx 提供静态前端，并把 `/api/*` 和 `/ws` 转发到本机 Express 服务。服务器内存很小，前端必须在本地构建后同步 `dist/`，不要在服务器上运行 Vite 构建。

## 当前拓扑

```text
Browser
  -> Nginx :80
     -> /          /srv/c-quiz-app/dist
     -> /assets/*  /srv/c-quiz-app/public/assets
     -> /api/*     http://127.0.0.1:3001
     -> /ws        WebSocket upgrade to Express HTTP server
```

## 前端-only 部署

前端代码、样式或静态资源变更时，使用本地构建产物上线：

```bash
PATH=/Users/modaoshi/.nvm/versions/node/v24.15.0/bin:$PATH npm run build
```

同步源文件时排除本地和生成目录：

```bash
rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.env' \
  --exclude '.claude' \
  --exclude '.agents' \
  --exclude '.ccb' \
  --exclude '.codestable' \
  --exclude '.DS_Store' \
  --exclude 'AGENTS.md' \
  --exclude 'CLAUDE.md' \
  ./ root@47.243.66.220:/srv/c-quiz-app/
```

同步构建产物：

```bash
rsync -az --delete dist/ root@47.243.66.220:/srv/c-quiz-app/dist/
```

前端-only 变更无需重启 `c-quiz-app`，因为 Nginx 直接服务静态文件。

## 服务端部署

涉及 `server/src/**`、数据库访问、路由或 WebSocket 服务时，同步代码后必须重启服务：

```bash
systemctl restart c-quiz-app
systemctl status c-quiz-app --no-pager
```

确认服务进程已真实重启，不要只看文件是否上传成功。

## MySQL schema 变更

涉及 `server/src/db/schema.sql` 或新字段时：

1. 先在目标库执行 `ALTER TABLE` 或对应 schema 迁移。
2. 再更新服务端读写代码。
3. 需要回灌题库时再执行迁移脚本。
4. 最后重启服务并验证 API。

## 上线验证清单

检查首页是否引用新 bundle：

```bash
curl -sS --max-time 15 http://47.243.66.220/ | sed -n '1,40p'
```

检查访客 API：

```bash
curl -i -sS --max-time 15 http://47.243.66.220/api/visitors/counts
```

检查题库列表：

```bash
curl -sS --max-time 15 http://47.243.66.220/api/quiz/banks
```

检查数据结构题库：

```bash
curl -sS --max-time 20 http://47.243.66.220/api/quiz/banks/ds/questions
```

如果首页 403 但 `/api/*` 正常，优先检查 `/srv/c-quiz-app/dist/index.html` 是否存在。

## 已知限制与注意事项

- 线上服务器内存约 402MB，外加 1GB swap，禁止远端 `vite build`。
- SSH 密码登录短时间高频可能被限流，失败后等待几秒再重试。
- 仅同步源码不能让前端生效；必须同步 `dist/` 并确认首页引用的新 bundle hash。
- 服务端变更必须确认 systemd 重启发生，避免线上进程继续跑旧代码。

## 相关文档

- [本地开发与项目结构](./local-development.md)
- [题库数据与管理](./quiz-bank-management.md)
- [系统架构](../../.codestable/architecture/ARCHITECTURE.md)
