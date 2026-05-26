---
doc_type: feature-ff-note
feature: add-geo-ip-lookup
date: 2026-05-26
requirement:
tags:
  - backend
  - visitor-tracking
  - geo-ip
---

## 做了什么
访客 heartbeat 现在会在服务端按 IP 查询外部 geo-IP 服务，并把结果用于管理员访客日志。查询失败或私网 IP 时保留原有 header-derived 来源作为 fallback。

## 改了哪些
- `server/src/services/geoIpService.js` — 新增 geo-IP 查询、超时保护、IP 哈希缓存和 fallback 逻辑。
- `server/src/services/visitorLogService.js` — heartbeat 持久化改为优先写 geo-IP 位置，管理员列表响应字段保持不变。
- `server/src/config.js` / `.env.example` / `server/README.md` — 增加 geo-IP provider、timeout、cache TTL 配置和默认 provider 假设说明。
- `server/src/services/geoIpService.test.js` / `package.json` — 增加 lookup、失败 fallback、缓存复用测试并纳入 server test。

## 怎么验证的
已跑 `lsp_diagnostics` 覆盖变更 JS 文件；已跑 `npm run test:server` 和 `npm run build`，均通过。
