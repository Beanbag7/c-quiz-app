# Architecture

> 系统架构总入口。记录现状，不写规划。

## 项目概述

**项目名**：c-quiz-app  
**技术栈**：React + Vite 前端、Node/Express 后端、Redis、Nginx  
**用途**：题库问答 Web 应用，支持刷题练习、在线人数统计、管理员访客日志

## 当前系统拓扑

```text
Browser
  ↓
Nginx (:80)
  ├─ /           → /srv/c-quiz-app/dist
  └─ /api/*      → http://127.0.0.1:3001
                    ↓
                Express app (server/src/**)
                    ├─ visitors heartbeat / counts
                    ├─ admin login / session / visitors
                    └─ geo IP lookup + Redis/memory storage
                    ↓
                 Redis (primary store)
```

## 目录结构

```text
src/
├── App.jsx                    主应用组件
├── components/                业务组件（含 AdminVisitorLog）
├── hooks/                     前端共享逻辑（visitor presence）
├── services/                  前端 API client
├── assets/                    前端静态资源

server/
├── src/
│   ├── app.js                 Express app 组装
│   ├── index.js               服务启动入口
│   ├── routes/                /api 路由
│   ├── services/              visitor/admin/geo 领域逻辑
│   ├── storage/               Redis + memory fallback 抽象
│   ├── redis/                 Redis client
│   └── utils/                 cookie / visitor helpers
├── deploy/                    systemd / nginx / push-deploy 脚本
└── README.md                  后端与部署说明

public/                        题库 JSON 与静态资源
.codestable/                   CodeStable 项目知识与流程产物
docs/archive/                  历史文档归档
```

## 关键运行语义

### 1. 在线人数
- 前端根据当前页面决定 `scope=home|quiz`
- 周期性调用 `/api/visitors/heartbeat`
- 服务端用 Redis 维护 presence；Redis 不可用时降级为单进程内存

### 2. 管理员访客日志
- 管理员通过密码登录建立服务端 session
- `/api/admin/visitors` 返回真实 IP、来源地、同 IP 打开次数
- 普通用户只可见在线人数，不可见访客明细

### 3. 来源地显示
- 当前实现**不使用本地映射表**
- 服务端直接使用 `GEO_IP_LOOKUP_URL` 对应 provider 返回的中文 country/region/city
- 线上默认 provider 为：`ip-api.com ... lang=zh-CN`
- 历史记录如需与当前策略一致，需要单独回刷 visitor 记录中的地理字段

## 运维与部署要点

- 首页 403 且 `/api/*` 正常时，优先检查 `dist/index.html` 是否缺失
- 部署后必须确认 `c-quiz-app` 进程已重启，而不是只同步了文件
- 若远端构建被 SSH 中断，可通过 `/tmp/cquiz-build.log` 查看结果，再检查 `dist/index.html` 是否已生成

## UI 设计参考

详见 `APP开发系统UI设计.md`（根目录）。
