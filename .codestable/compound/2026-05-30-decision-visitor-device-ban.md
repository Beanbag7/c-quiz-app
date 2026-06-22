---
doc_type: decision
decision_type: architecture
status: accepted
summary: 访客封禁采用 visitorId 作为设备 ID，辅以 IP 封禁；不伪造或采集浏览器不可访问的真实 MAC 地址
tags:
  - backend
  - frontend
  - visitor-log
  - ban
  - privacy
component: visitor-backend
source_type: feature
source_path: .codestable/features/2026-05-30-visitor-device-ban/visitor-device-ban-acceptance.md
---

# 访客设备封禁标识决策

## 决定

当前项目的设备识别和封禁采用以下规则：

1. 使用服务器生成的 `visitorId` 作为设备 ID。
2. 用 `userAgent` 解析出的 `deviceLabel` 作为管理员辅助识别信息。
3. 设备封禁以 `deviceId` 为主。
4. IP 封禁作为辅助动作，由管理员显式点击触发。
5. 不采集、不展示、不伪造真实 MAC 地址。

## 背景

用户希望记录 MAC 地址并封禁 MAC。标准浏览器 Web 页面无法读取客户端网卡 MAC 地址；除非做本地客户端、浏览器插件或内网代理，否则拿不到真实 MAC。为了让功能能在当前 React + Express Web 架构中上线，需要选择浏览器可用、服务端可验证的替代标识。

## 取舍

### visitorId 作为设备 ID

优点：

- 已经由服务端生成并存在 HttpOnly cookie 中
- 同一浏览器同一设备在较长时间内稳定
- 能直接接入现有访客日志和 presence 链路

缺点：

- 用户清 cookie / 换浏览器后会变成新设备
- 不是硬件级标识

### IP 封禁作为辅助

优点：

- 可应对清 cookie 逃避设备封禁的情况
- 对异常来源 IP 有直接拦截效果

缺点：

- NAT、校园网、公司网可能误伤多人
- 移动网络和 VPN 下 IP 不稳定

因此 IP 封禁只作为管理员显式动作，不默认替代设备封禁。

## 后续执行规则

- 文档和 UI 中可写“设备 ID”，不要写“MAC 地址”。
- 管理员日志里必须保留封禁原因，避免后续不知道为什么封。
- heartbeat 写入前必须先检查封禁，命中后不更新 presence 和 visitor 记录。
- 如果未来必须真实 MAC，只能另开本地客户端 / 浏览器插件 / 内网代理方案，不应在 Web 端继续尝试。

## 关联文档

- `.codestable/requirements/visitor-device-ban.md`
- `.codestable/features/2026-05-30-visitor-device-ban/visitor-device-ban-acceptance.md`
- `.codestable/compound/2026-05-30-learning-visitor-device-ban.md`
