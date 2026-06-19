---
doc_type: feature
feature_status: accepted
slug: data-structure-bank
implemented_by:
  - public/questions_data_structure.json
  - public/assets/ds_images/chaoxing_final_review/
  - server/src/db/migrate.js
  - src/App.jsx
tags:
  - frontend
  - quiz-bank
  - data-structure
---

# 数据结构（C语言）题库接入验收

## 改动范围

- `public/questions_data_structure.json`：297 题 JSON
- `public/assets/ds_images/chaoxing_final_review/`：104 张图片
- `server/src/db/migrate.js`：新增 ds bank 定义
- `src/App.jsx`：新增 ds 主题卡片、题型筛选、API fallback
- `server/src/services/quizBankService.js`：字符数组答案合并、parseJsonSafe 防御性解析

## 数据概况

- 297 题（选择题 198 + 填空题 58 + 解答题 41）
- 104 张本地图片，`<img>` 标签内嵌在 `选项` 和 `答案文本` 字段
- 图片路径格式：`assets/ds_images/chaoxing_final_review/img_XXXX.png`
- 每道题含 `题目ID`（500001~500299）、`章节`、`分值`、`必考`、`解析`

## 验收标准

- [x] 首页卡片"🌳 数据结构（C语言）"可见，显示 297 题
- [x] 题型筛选：选择题 / 填空题 / 解答题 / 必考题 / 全部
- [x] 298 道题正常加载（API 返回 297）
- [x] 选择题选项为对象，正确渲染
- [x] 填空题答案均为字符串，`.trim()` 不报错
- [x] 字符数组答案（`["N","U","L","L"]`）自动合并为 `"NULL"`
- [x] 图片 HTTP 200 可访问
- [x] `parseJsonSafe` 不误解析纯数字答案

## 已知问题与修复

- 源 JSON 中 7 道填空题答案为字符数组 → `formatQuestionRow` 自动合并
- `"42"` 等纯数字答案被 `JSON.parse` 误解析 → `parseJsonSafe` 仅解析 `[`/`{` 开头值
- 选项被返回为 JSON 字符串 → `parseJsonSafe` 统一处理选项字段
