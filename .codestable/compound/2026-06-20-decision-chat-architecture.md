---
doc_type: decision
decision_type: architecture
status: accepted
summary: WebSocket 聊天选 ws 库（非 socket.io），消息存内存环形缓冲区，排行榜用 Redis ZSet
tags:
  - backend
  - websocket
  - chat
  - leaderboard
component: chat
source_type: feature
source_path: .codestable/features/2026-06-20-online-chat/online-chat-acceptance.md
---

# 聊天系统架构决策

## 决定

- **WebSocket 库**：`ws`（非 socket.io），同一端口 3001 共享 `http.Server`
- **消息存储**：内存环形缓冲区（200 条），不持久化
- **在线人数**：`Map<ws, senderName>`，WebSocket 连接数为权威数据源
- **排行榜**：Redis ZSet 优先 / 内存回退

## 背景

需要为答题 App 增加实时聊天功能。候选方案：

| 维度 | ws | socket.io |
|------|-----|-----------|
| 协议 | 纯 WebSocket | Engine.IO（fallback HTTP polling） |
| 体积 | ~2.5 MB | ~7 MB |
| 内存 | 更低 | 更高（心跳+缓冲） |
| 特性 | 原始 WS | 自动重连、房间、命名空间 |

## 取舍

**选 `ws`**：
- 402MB 服务器内存紧张，`ws` 更轻量
- 聊天场景简单（单房间广播），不需要 socket.io 的房间/命名空间
- 前端自动重连逻辑自行实现（3 行代码），不依赖库
- nginx 只需加 `/ws` location 升级头，配置简单

**消息不持久化**：
- 聊天是答题辅助，不是核心业务，无需长期存储
- 环形缓冲区 200 条覆盖最近几分钟的对话
- 避免引入额外存储（MySQL 或 Redis Stream）
- 服务器重启清空可接受

**在线人数以 WebSocket 为准**：
- 原 visitor heartbeat 20s 轮询延迟高
- WebSocket 连接断开即时感知（close 事件）
- 统一数据源后标题栏和聊天面板数字一致

**排行榜 Redis ZSet**：
- 已有 Redis 基础设施（visitor presence 用 Redis）
- ZSet 天然支持排序+Top N，无需 MySQL 查询
- 内存回退确保 Redis 不可用时排行榜不崩溃

## 关联文档

- `.codestable/compound/2026-06-20-learning-deploy-patterns.md`
