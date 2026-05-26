---
doc_type: feature-ff-note
feature: randomize-sxyz-order
date: 2026-05-26
requirement:
tags:
  - frontend
  - sxyz
  - randomization
  - quiz-runtime
---

## 做了什么
给形势与政策题库加了随机顺序能力：进入题库后题目顺序不再固定，题目选项/答案顺序也会一起随机，避免每次练习都按原始顺序刷题。

## 改了哪些
- `src/App.jsx` — 补齐 `shuffleOptions` 对多选题 `正确答案` 数组的重映射；新增 `shuffleSxyzQuestions()`，在加载 `questions_sxyz.json` 时对题目顺序和选项顺序统一打乱。
- `src/App.jsx` — 后续补强浏览器端随机实现：将 sxyz 的 shuffle 改成“每次加载生成独立 seed”的随机流，避免嵌入式浏览器 fresh session 里首题顺序表现得过于固定。

## 怎么验证的
已跑 `lsp_diagnostics /Users/modaoshi/c-quiz-app/src/App.jsx`，无错误；已跑 `npm run build`，通过。

线上验证补充：

- 重新构建并部署到 `47.243.66.220`
- 确认生产首页实际返回的新 bundle hash 已切到 `index-aiWU1IPO.js`
- 通过 `cmux + ssh tunnel` 对生产环境做 fresh session 验证，三次进入“形势与政策 → 多选题”时，首题已不再固定一致

## 踩坑修正

- 一开始线上看起来“不随机”，根因不是题库逻辑本身，而是**服务器实际返回的前端 bundle 仍是旧版本**；远端 `src/App.jsx` 已更新，并不代表浏览器拿到的新 JS 已更新。
- 修复方式不是只看源码同步，而是要：
  1. 强制远端重新 `vite build`
  2. 确认生产首页 script hash 变化
  3. 再用真实浏览器路径验证行为

## 顺手发现（可选，不阻塞）
- `src/App.jsx` 仍承担较多题库加载、随机化和答题状态逻辑；如果后续继续扩展题库运行时策略，值得单独走一次 `cs-refactor` 拆分运行时逻辑。
