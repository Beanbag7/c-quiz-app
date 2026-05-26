---
doc_type: decision
category: constraint
status: active
summary: 访客来源地显示默认不使用本地映射，部署完成后必须验证运行中进程和静态产物都已切到最新版本
tags:
  - backend
  - deployment
  - visitor-tracking
  - geo-ip
  - nginx
  - systemd
area: backend
source_type: feature
source_path: .codestable/features/2026-05-26-add-geo-ip-lookup/add-geo-ip-lookup-ff-note.md
---

# 访客来源地与部署验收约束

## 背景

这次 visitor 日志与 geo 来源地上线过程中，暴露出两个会反复踩中的长期问题：

1. 来源地显示到底是依赖本地映射，还是直接依赖 provider 返回值
2. 部署后如何判断“线上真的已经切到新版本”，而不是只有文件同步了

如果不把这两个点定成长期约束，后续很容易再次出现：

- 历史/新数据显示口径不一致
- 代码已改但线上行为还是旧的
- 首页异常时误判成鉴权或后端故障

## 决策结论

### 1. 来源地显示约束

**默认不使用本地映射表。**

访客来源地的 `country / region / city / locationText` 统一以 `GEO_IP_LOOKUP_URL` 对应 provider 的返回值为准，不再在服务端维护中英文/别名映射表作为显示来源。

当前默认 provider：

- `ip-api.com`
- 请求参数带 `lang=zh-CN`

这意味着：

- 新数据展示值直接来自 provider
- 如果未来更换 provider，要一起评估历史数据是否需要回刷

### 2. 部署验收约束

**部署完成后，不能只验证文件是否同步；必须验证运行中进程和首页静态产物都已更新。**

最小验收项：

1. `systemctl show c-quiz-app -p MainPID -p ExecMainStartTimestamp`
   - 确认 PID 或启动时间发生变化
2. `/srv/c-quiz-app/dist/index.html` 存在
3. `GET /` 与 `GET /api/visitors/counts` 分开验证

如果 `/api/*` 正常但 `/` 返回 403，优先判断为静态产物缺失，而不是鉴权问题。

## 为什么这样定

### 来源地策略

- 本地映射表短期可控，但长期维护成本高
- 每次 provider 输出稍有变化，都需要继续维护映射表
- 用户已经明确要求“不要使用映射”

### 部署验收

- 实际上发生过“磁盘代码已更新，但进程没重启”的情况
- 也发生过“API 正常但首页因为 `dist/index.html` 缺失而 403”的情况
- 所以单看 rsync、脚本退出、systemd active 都不够

## 考虑过的替代方案

### 替代方案 A：继续维护本地映射表

没选，因为它会把 provider 语义与显示语义分成两套，后续每次新增城市/地区名都要继续补映射，且不符合本次明确要求。

### 替代方案 B：部署后只看服务 active 即可

没选，因为 active 并不能证明新代码已被运行中的进程加载，也不能证明首页静态产物存在。

## 后续影响

1. 以后涉及 geo provider 的改动，必须同步评估：
   - 是否要清 `geo-ip:*` 缓存
   - 是否要回刷历史 visitor 记录
2. 以后任何 server/deploy 改动，验收报告都必须包含：
   - PID/启动时间变化
   - 首页与 API 分开验收
3. 如果未来切换到新的中文 provider（例如付费 HTTPS provider），这是**替换当前约束实现**，应新增 superseding decision，而不是静默修改。

## 一句话结论

**来源地显示以 provider 返回值为准，不做本地映射；部署成功必须同时证明“进程已切新版本”和“首页静态产物存在”。**
