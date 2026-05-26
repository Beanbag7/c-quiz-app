---
doc_type: learning
track: knowledge
status: current
summary: 访客日志与来源地改造上线时，要把代码变更、systemd 重启、静态产物、geo 缓存和历史数据回刷当成一个完整闭环处理
tags:
  - backend
  - deployment
  - nginx
  - systemd
  - visitor-tracking
  - geo-ip
  - redis
severity: high
component: visitor-backend
source_type: feature
source_path: .codestable/features/2026-05-26-add-geo-ip-lookup/add-geo-ip-lookup-ff-note.md
---

# 访客来源地上线不是改一处代码，而是一个闭环

## 场景

这次工作表面上是“管理员日志里显示真实 IP、来源地中文化、按 IP 统计打开次数”，实际落地时串起来的是一整条上线链路：

1. 后端写入 visitor 记录
2. geo provider 查询与缓存
3. 管理员接口读取历史记录
4. 前端静态产物构建与 Nginx 首页服务
5. systemd 进程是否真的重启
6. 历史数据是否需要回刷

只改其中一环，线上很容易出现“代码已经对了，但页面还是错的”。

## 这次真正踩到的坑

### 1. 文件同步成功 ≠ 线上服务已更新

远端磁盘上的源码已经同步到了最新，但 `c-quiz-app` 进程没有真正重启，导致：

- 直接读磁盘文件是新逻辑
- 线上 HTTP 仍然跑旧进程
- 新记录继续按旧逻辑写入

结论：部署后必须验证 **进程启动时间 / PID 是否变化**，不能只看 rsync 或脚本退出码。

### 2. 首页 403 可能不是鉴权，而是 dist 缺首页文件

这次一度出现：

- `/` 返回 403
- `/api/*` 正常 200

根因不是后端鉴权，而是 `/srv/c-quiz-app/dist/index.html` 缺失，Nginx 只能看到目录，直接报 `directory index ... is forbidden`。

结论：首页异常时要先分流判断：

- **首页坏 / API 正常** → 优先查 `dist/index.html`
- **API 也坏** → 再看 app / nginx / redis 状态

### 3. geo 显示策略切换后，历史数据不会自动跟着变

后来把来源地策略改成：

- 不使用本地映射表
- 直接依赖 provider 返回中文

但旧 visitor 记录里已经存了旧值：

- 英文城市名
- 旧 provider 风格的地区名
- 混合的历史来源字段

仅仅改代码不会自动把历史 Redis 数据改掉。

结论：凡是 visitor 记录里**落库字段语义变了**，就要评估是否需要一次性回刷历史数据。

## 最终有效做法

### A. 部署阶段

1. 同步代码后，**显式重启** `c-quiz-app`
2. 验证：
   - `systemctl show c-quiz-app -p MainPID -p ExecMainStartTimestamp`
   - 确认 PID / 启动时间变化
3. 如果首页异常，检查：
   - `/srv/c-quiz-app/dist/index.html`
   - `/tmp/cquiz-build.log`

### B. 来源地策略阶段

1. 先明确当前策略：
   - 本地映射
   - 还是 provider 直接返回中文
2. 切换 provider 后，清理 `geo-ip:*` 缓存
3. 用一条新 visitor 记录做线上验证，确认新数据写入符合预期

### C. 历史数据阶段

如果旧记录展示仍不一致：

1. 遍历 `visitor:index`
2. 读取每条记录的 `ipAddress`
3. 用当前 `lookupGeoIpLocation(ipAddress)` 重新查询
4. 覆盖 Redis 中的 `country / region / city`

这样能在不删 visitor 记录本身的前提下，把历史来源地统一到当前策略。

## 以后默认做法

以后凡是改下面这些内容之一，都默认按“闭环变更”处理，而不是“单点修代码”：

- visitor 记录字段
- geo provider / geo 缓存
- 管理员日志响应 shape
- systemd 部署脚本
- 前端首页静态构建

最小上线清单：

1. 本地测试通过
2. 远端代码已同步
3. 远端进程已重启
4. 首页静态产物存在
5. 新记录线上验证通过
6. 评估是否要回刷历史数据

## 如何更早发现

- 部署脚本验收时，把“PID 是否变化”列为必查项
- 首页异常时，第一时间把首页和 `/api/visitors/counts` 分开测
- 任何会落 Redis 的展示字段变更，都在方案阶段就问一句：
  - “旧数据要不要迁移？”
- geo 策略变更后，至少做两类线上验证：
  - 新写入记录
  - 历史已存在记录

## 一句话结论

**访客日志与来源地上线是一个“代码、进程、静态产物、缓存、历史数据”联动问题；只修一处，线上通常不会真正好。**
