---
doc_type: learning
track: knowledge
status: current
summary: 浏览器 Web 端的访客设备识别要以 visitorId 为核心，MAC 不是可用输入；封禁能力必须从一开始就设计成 deviceId + IP 的双通道
tags:
  - backend
  - frontend
  - admin
  - privacy
  - ban
severity: medium
component: visitor-backend
source_type: feature
source_path: .codestable/features/2026-05-30-visitor-device-ban/visitor-device-ban-acceptance.md
---

# 访客设备封禁要把“标识”和“拦截”分开设计

## 场景

管理员希望在访客日志中看到设备信息，并对设备或 IP 执行封禁和解封。最开始很容易把它想成“记录 MAC 地址，然后按 MAC 封禁”，但在标准浏览器 Web 中这条路是走不通的。

## 这次真正踩到的坑

### 1. 真实 MAC 不是浏览器 Web 能拿到的

这不是“没找到 API”，而是浏览器本身就不提供这个能力。继续围绕 MAC 设计，只会把需求卡死在实现层。

### 2. 设备识别和封禁不是同一件事

设备识别负责让管理员“看懂是谁”；封禁负责让系统“拦住谁”。前者可以接受 visitorId + userAgent + deviceLabel 的组合，后者必须是服务端可验证、可拦截的 key。

### 3. 只做设备封禁还不够

用户清 cookie、切浏览器、切无痕窗口后，visitorId 会变化。必须保留 IP 封禁作为辅助通道，否则容易被绕过。

### 4. 封禁必须在 heartbeat 前拦

如果先写日志再封禁，数据库里会留下一堆“已封禁但继续写入”的脏数据。正确顺序是：先查 ban，再决定是否写 visitor / presence。

### 5. 管理员一定要看得见原因

没有封禁原因的按钮只能解决当下，后面没人知道为什么封、谁封的、能不能解。

## 最终有效做法

1. 浏览器侧用 `visitorId` 作为设备 ID。
2. 记录 `deviceLabel` / `userAgent` 作为辅助识别。
3. 服务端维护独立 ban 记录，不混在 visitor 统计里。
4. 管理员页同时提供设备封禁和 IP 封禁。
5. 封禁按钮必须能写原因。

## 以后默认做法

以后只要有人再提“记录 MAC”，默认先问一句：

- 这是 Web 端、Native 端，还是浏览器插件？

如果还是标准 Web，就直接按 visitorId / deviceLabel / IP 的模型设计，不再把 MAC 当成可实现目标。

## 一句话结论

**访客设备识别在 Web 里要以 visitorId 为核心，MAC 不是可用输入；封禁能力必须设计成 deviceId + IP 双通道，才能既能落地又能防绕过。**
