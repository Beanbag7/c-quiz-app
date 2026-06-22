---
doc_type: feature-acceptance
feature: 2026-05-30-visitor-device-ban
status: confirmed
summary: 访客日志增加设备识别与封禁能力；浏览器端以 visitorId 作为设备ID，管理员可对设备或 IP 执行封禁/解封
tags:
  - backend
  - frontend
  - admin
  - visitor-log
  - ban
---

# visitor-device-ban Acceptance

## 需求摘要

访客日志需要增加设备识别能力，并支持管理员在日志列表中对设备和 IP 执行封禁/解封。由于标准浏览器 Web 端无法直接读取真实 MAC 地址，最终实现使用服务器生成的 `visitorId` 作为设备 ID，并附带设备摘要信息供管理员识别。

## 实现核对

| 项目 | 状态 | 说明 |
|---|---|---|
| 设备识别 | ✓ | 访客记录保存 `deviceId` / `deviceLabel` / `userAgent` |
| 设备封禁 | ✓ | 管理员可按设备 ID 执行封禁/解封 |
| IP 封禁 | ✓ | 管理员可按 IP 执行封禁/解封 |
| 心跳拦截 | ✓ | 被封禁的设备或 IP 在 `/api/visitors/heartbeat` 直接返回 403 |
| 访客列表展示 | ✓ | 管理页显示设备信息、封禁状态和操作按钮 |
| 构建与测试 | ✓ | `npm run test:server`、`npm run build` 通过 |

## 修改文件

| 文件 | 改动 |
|---|---|
| `server/src/services/visitorBanService.js` | 新增设备/IP 封禁记录、封禁状态查询、封禁/解封操作 |
| `server/src/routes/visitors.js` | 在 heartbeat 前检查封禁状态，被封禁则直接拒绝 |
| `server/src/services/visitorLogService.js` | 记录 `deviceId`、`deviceLabel`、`userAgent`，列表返回封禁状态 |
| `server/src/routes/admin.js` | 新增 `/api/admin/bans` 封禁与解封接口 |
| `src/components/AdminVisitorLog.jsx` | 新增设备与封禁状态展示、封禁/解封按钮 |
| `src/services/visitorApi.js` | 新增封禁/解封请求封装 |

## 影响面

- 仅影响访客日志、管理员日志、heartbeat 拦截链路
- 不影响普通题库答题逻辑

## 遗留

- 真实 MAC 地址在浏览器 Web 端不可获取；当前实现以设备 ID（visitorId）替代
