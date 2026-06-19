---
doc_type: feature
feature_status: accepted
slug: online-chat
implemented_by:
  - server/src/ws/chatServer.js
  - server/src/services/chatService.js
  - server/src/routes/chat.js
  - server/src/index.js
  - server/src/app.js
  - src/components/ChatWidget.jsx
  - src/components/ChatWidget.css
  - vite.config.js
  - server/deploy/deploy-centos-systemd.sh
tags:
  - backend
  - frontend
  - websocket
  - realtime
---

# 在线聊天 + 弹幕

## 改动范围

### 后端
- `server/src/ws/chatServer.js`：ws WebSocketServer，处理 join/message/leave 事件，广播消息
- `server/src/services/chatService.js`：环形缓冲区（200 条）+ Map 追踪在线用户 + Redis ZSet 排行榜
- `server/src/routes/chat.js`：`GET /api/chat/messages`（历史）、`GET /api/chat/online`（在线人数）、`POST /api/chat/score`（上报分数）、`GET /api/chat/leaderboard`
- `server/src/index.js`：`http.createServer` 挂载 WebSocket
- `server/src/app.js`：注册 `/api/chat` 路由
- `server/deploy/deploy-centos-systemd.sh`：nginx `/ws` location（升级头 + 长连接超时）

### 前端
- `src/components/ChatWidget.jsx`：悬浮气泡 + 聊天面板 + 弹幕层 + 在线用户列表 + emoji 快捷栏 + @ 提及
- `src/components/ChatWidget.css`：完整聊天 UI 样式 + 暗色适配
- `vite.config.js`：`/ws` proxy（dev 环境）

## 架构

```
浏览器 ←WebSocket→ Nginx(:80, /ws) → Express HTTP Server → ws WebSocketServer
                                      ↓                        ↓
                                 REST /api/chat/*          环形缓冲区 (200条)
                                                            Map<ws, name> (在线用户)
                                                            Redis ZSet (排行榜)
```

- 同一端口 3001，Express 和 WebSocket 共享 `http.createServer()`
- `ws` 库（非 socket.io），更轻量适配 402MB 服务器
- 消息不持久化（重启清空），排行榜 Redis 可持久化

## 功能清单

| 功能 | 状态 |
|------|------|
| WebSocket 实时聊天 | ✅ |
| 弹幕（消息飘过屏幕） | ✅ |
| 昵称 prompt（localStorage 记忆） | ✅ |
| 历史同步（REST API） | ✅ |
| 在线人数显示 | ✅ |
| 在线用户列表（点标题展开） | ✅ |
| @ 提及（点用户名自动 @） | ✅ |
| emoji 快捷按钮（8 个） | ✅ |
| 自动重连（断线 3s） | ✅ |
| 未读消息红点 | ✅ |
| 移动端适配 | ✅ |
| 答题排行榜（Redis ZSet + 内存回退） | ✅ |

## 验收标准

- [x] 双客户端 Node 测试：消息实时到达，join/leave 通知正确
- [x] REST 历史同步：刷新后加载最近 50 条
- [x] 弹幕：消息以飘字形式从右往左飞过屏幕
- [x] 在线人数：统一数据源（WebSocket 连接数）
- [x] 排行榜：分数上报后 Top 10 可见
- [x] nginx `/ws` WebSocket 升级正常

## 关联文档

- `.codestable/features/2026-06-20-ux-enhancements/ux-enhancements-acceptance.md`
- `.codestable/compound/2026-06-20-learning-deploy-patterns.md`
