---
doc_type: feature
feature_status: accepted
slug: admin-ui-table-compact
implemented_by:
  - src/components/AdminVisitorLog.jsx
  - src/App.css
tags:
  - frontend
  - admin
  - ui
---

# 管理员访客日志表格精简

## 改动范围

### 前端
- `src/components/AdminVisitorLog.jsx`：访客表格从 10 列合并为 5 列；新增 `formatRelativeTime` 相对时间工具函数
- `src/App.css`：新增 `.network-cell` / `.activity-cell` / `.activity-meta` 样式；移除易错列的 `nth-child` 加粗规则，改用 cell 内部精确加粗

## 改动动机

原访客表格 10 列（访客/设备/IP/来源地/封禁状态/IP次数/最后页面/首次访问/最后活跃/操作），需要横向滚动。合并为 5 列后信息零丢失，布局更紧凑。

## 列映射（10 → 5）

| 新列 | 内容 | 来源列 |
|------|------|--------|
| 设备 | 浏览器/平台（加粗）+ 设备 ID（小字） | 原「设备」 |
| 网络位置 | IP（加粗）+ 来源地（小字） | 原「IP」+「来源地」 |
| 活跃情况 | 最后活跃相对时间 + 首次访问·打开次数·最后页面 | 原「最后活跃」+「首次访问」+「IP次数」+「最后页面」 |
| 封禁状态 | badge | 原「封禁状态」 |
| 操作 | 封禁/解封按钮 | 原「操作」 |

## 验收标准

- [x] 表格为 5 列布局，无横向滚动
- [x] 单字符串答案完整显示
- [x] 相对时间正确（刚刚/X 分钟前/X 天前）
- [x] 封禁/解封双向操作正常
- [x] 封禁列表（保持原样）正常显示
- [x] 信息零丢失（所有原字段都可在新布局中找到）

## 关联文档

- `.codestable/compound/2026-06-19-learning-answer-field-normalization.md`
