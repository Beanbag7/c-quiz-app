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

后续又追加了两项收尾：

- 默认 geo provider 改为 **`ip-api.com` + `lang=zh-CN`**，管理员日志来源地改为**直接使用 provider 返回的中文**，不再依赖本地映射表。
- 已对线上历史 visitor 记录执行一次按 `ipAddress` 回刷，把旧的英文/旧策略来源地统一刷新成当前 provider 返回值。

## 改了哪些
- `server/src/services/geoIpService.js` — 新增 geo-IP 查询、超时保护、IP 哈希缓存和 fallback 逻辑。
- `server/src/services/visitorLogService.js` — heartbeat 持久化改为优先写 geo-IP 位置，管理员列表响应字段保持不变。
- `server/src/config.js` / `.env.example` / `server/README.md` — 增加 geo-IP provider、timeout、cache TTL 配置和默认 provider 假设说明。
- `server/src/services/geoIpService.test.js` / `package.json` — 增加 lookup、失败 fallback、缓存复用测试并纳入 server test。

后续收尾调整：

- `server/src/config.js` — 默认 `GEO_IP_LOOKUP_URL` 改到 `ip-api.com ... lang=zh-CN`
- `server/src/services/geoIpService.js` — 移除本地中英文映射依赖，保留 provider 原始返回值
- 线上 Redis `geo-ip:*` 缓存已清理，并执行历史 visitor 记录来源地重刷

## 怎么验证的
已跑 `lsp_diagnostics` 覆盖变更 JS 文件；已跑 `npm run test:server` 和 `npm run build`，均通过。

线上附加验证：

- 管理员日志可返回真实 `ipAddress`
- 新记录来源地直接显示 provider 中文值（如 `美国 / 加州 / 洛杉矶`、`中国 / 北京市 / 北京`）
- 历史记录已统一刷新为当前 provider 返回值
