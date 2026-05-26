---
doc_type: learning
track: pitfall
status: current
summary: 前端随机化功能上线后，不能只看远端源码或构建日志，必须确认生产实际返回的新 bundle 已切换，并用真实浏览器路径验证运行时行为
tags:
  - frontend
  - deployment
  - vite
  - browser-verification
  - sxyz
  - randomization
severity: high
component: quiz-frontend
source_type: feature
source_path: .codestable/features/2026-05-26-randomize-sxyz-order/randomize-sxyz-order-ff-note.md
---

# sxyz 随机化上线时，远端源码是新的不代表浏览器拿到的新 bundle 也是新的

## 现象

这次给“形势与政策”题库加题目/选项随机顺序后：

- 本地算法验证通过
- 本地构建通过
- 远端 `/srv/c-quiz-app/src/App.jsx` 也能看到新逻辑

但真实浏览器进入线上“形势与政策 → 多选题”时，首题一直固定落在同一道题，选项顺序也固定不变，看起来像随机化根本没生效。

## 最容易误判的地方

第一反应很容易是：

- shuffle 逻辑写错了
- 多选题重映射有 bug
- 浏览器 `Math.random()` 有问题

这些方向都查了，但真正的第一层根因其实是：

> **远端源码已经更新，不代表生产 HTTP 实际返回的新前端 bundle 已更新。**

这次出现的是：

- 远端 `src/App.jsx` 是新的
- 但生产首页仍在返回旧的 JS bundle
- 浏览器行为自然还是旧逻辑

## 这次怎么定位出来的

### 1. 不再只看远端源码，直接读生产返回的 `index.html`

先抓生产首页实际返回的：

- `<script type="module" src="/assets/index-xxxx.js">`

确认线上到底在发哪个 bundle hash。

### 2. 直接检查生产 JS bundle 内容

把生产返回的 JS 拉下来后，对比其中的 minified 逻辑：

- 旧 bundle 里，`sxyz` 仍是直接用 `data.questions`
- 新 bundle 里，`sxyz` 应该走 `shuffleSxyzQuestions(...)`

这样能明确区分：

- 是“代码没同步到服务器”
- 还是“代码同步了，但浏览器仍拿到旧静态资源”

### 3. 用真实浏览器路径验证，而不是只靠 curl

这次还踩到一个额外坑：

- `cmux` 直接打开远端纯 HTTP IP 页面会白屏
- 但通过 `ssh tunnel -> http://127.0.0.1:8088` 打开后，页面可正常渲染

所以最终验证路径必须是：

1. 建本地 tunnel
2. 用 `cmux browser` 打开 tunnel 地址
3. 真点进“形势与政策 → 多选题”
4. 比较多个 fresh session 的首题是否变化

## 第二层经验：浏览器里首轮随机表现不能只靠“看一次”

就算 bundle 已更新，嵌入式浏览器 fresh session 的首轮行为也可能看起来“太固定”，容易误判“随机没生效”。

这次最后补了一层更稳的实现：

- 每次加载 sxyz 时生成独立 seed
- 再基于这个 seed 生成当次 shuffle 随机流

这样在浏览器验收里，多次 fresh session 更容易看到真正不同的题目顺序。

## 以后默认做法

以后凡是前端运行时行为上线，尤其是“随机、排序、过滤、客户端初始化”这类问题，验收不要停在“源码同步了”“vite build 成功了”。默认按下面顺序做：

1. 确认远端源码已更新
2. 确认远端重新 `vite build`
3. 抓生产首页，确认实际 script hash 已切换
4. 必要时抓生产 JS bundle 内容，确认关键逻辑已进入 bundle
5. 用真实浏览器路径做运行时验证

## 一句话结论

**前端随机化上线时，`src/App.jsx` 是新的、构建日志成功了，都还不够；必须确认生产实际返回的新 bundle 已切换，并用真实浏览器路径验证运行时行为。**
