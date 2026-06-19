---
doc_type: feature
feature_status: accepted
slug: ux-enhancements
implemented_by:
  - src/App.jsx
  - src/App.css
  - src/dark-theme.css
  - src/components/OnlineCount.jsx
  - src/components/Leaderboard.jsx
  - src/components/ChatWidget.jsx
  - src/components/ChatWidget.css
tags:
  - frontend
  - ux
  - dark-mode
  - leaderboard
---

# 暗色模式 + 错题持久化 + 排行榜 + 在线人数统一

## 改动范围

### 暗色模式
- `src/dark-theme.css`：全局 `[data-theme="dark"]` 样式覆盖（body、卡片、答题区、管理后台、聊天面板）
- `src/App.jsx`：`darkMode` 状态 + `data-theme` 同步到 `<html>` + 固定位置切换按钮（🌙/☀️）
- 支持 `localStorage` 持久化主题偏好，默认跟随系统 `prefers-color-scheme`

### 错题持久化
- `src/App.jsx`：`wrongAnswers` 按科目存入 `localStorage`（key: `cq_wrong_answers_{subject}`）
- 科目卡片显示错题数徽标（📝 N 道错题）
- `startWrongPractice` 从 localStorage 加载旧错题（支持跨会话复习）

### 排行榜
- `server/src/services/chatService.js`：Redis ZSet 优先 / 内存回退
- `server/src/routes/chat.js`：`POST /api/chat/score` + `GET /api/chat/leaderboard`
- `src/components/Leaderboard.jsx`：首页底部显示 🏆 本周得分榜 Top 10（30s 自动刷新）
- `src/App.jsx`：答题完成自动上报分数

### 在线人数统一
- `src/components/OnlineCount.jsx`：改用 `/api/chat/online`（WebSocket 连接数），移除 visitor heartbeat 依赖
- 标题栏和聊天面板的在线人数完全一致

## 验收标准

- [x] 暗色模式：🌙 点击切换，刷新保持，覆盖所有页面
- [x] 错题持久化：答错退出→刷新→科目卡片显示错题数→错题本可加载旧错题
- [x] 排行榜：答题完成→分数上报→首页显示 Top 10
- [x] 在线人数：标题栏和聊天面板数字一致
- [x] emoji 快捷栏：😂👍💯🎉🤔🔥💪👀 点击插入输入框
- [x] 在线用户列表：点标题展开→点用户名自动 @ 提及

## 关联文档

- `.codestable/features/2026-06-20-online-chat/online-chat-acceptance.md`
- `.codestable/compound/2026-06-20-learning-deploy-patterns.md`
