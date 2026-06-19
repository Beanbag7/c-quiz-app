---
doc_type: feature
feature_status: accepted
slug: answer-field-normalization
implemented_by:
  - src/App.jsx
  - src/components/FillBlankQuestion.jsx
  - src/components/EssayQuestion.jsx
tags:
  - frontend
  - quiz-bank
  - bugfix
---

# 填空题/简答题答案字段归一化

## 改动范围

### 前端
- `src/App.jsx`：填空题答案验证 `normalize` 函数对 undefined 安全；答案取值改用 `答案 ?? 正确答案 ?? 答案文本` 兼容三种字段
- `src/components/FillBlankQuestion.jsx`：新增 `normalizeAnswer`/`formatAnswerDisplay` 工具函数，统一兼容 `答案文本`/`正确答案`/`答案` 三种字段；数组答案用顿号连接显示
- `src/components/EssayQuestion.jsx`：评分 `calculateScore` 和参考答案显示改用 `答案文本 ?? 正确答案 ?? 答案`；新增 `normalizeReferenceAnswer`

## 改动动机

数据结构题库反馈两个问题：填空题答案显示不全、简答题提交跳不到下一题。排查发现根因是**答案字段名在不同题库间不统一**（`答案` / `答案文本` / `正确答案` 三种字段混用），且原代码硬编码单一字段名。

## 修复的三个 Bug

| Bug | 根因 | 修复 |
|-----|------|------|
| 填空题答案显示不全 | 数组答案被渲染成 `<ul>` 列表 | `formatAnswerDisplay` 用顿号连接 |
| 填空题提交崩溃 | `normalize(currentQuestion.正确答案)` 对 undefined 调 `.trim()` | `normalize` 对 undefined 安全（`String(str ?? '')`）+ 字段回退 |
| 简答题提交跳不到下一题 | `calculateScore(userAnswer, question.答案)` 中 `question.答案` 为 undefined | 评分和参考答案统一用 `答案文本 ?? 正确答案 ?? 答案` |

## 字段优先级约定

| 题型 | 优先级 | 说明 |
|------|--------|------|
| 填空题 | `答案文本 ?? 正确答案 ?? 答案` | `答案文本` 通常是已合并的展示文本 |
| 简答题 | `答案文本 ?? 正确答案 ?? 答案` | 同上 |
| database 题库填空题 | 只有 `答案` 字段 | 回退到 `答案` |
| ds/sxyz 题库 | `答案文本` + `正确答案` | 两者通常等值 |

## 验收标准

- [x] 填空题单字符串答案完整显示（"模式"、"同质"、"参照完整性"）
- [x] 填空题长答案完整显示（"外模式/模式映像"）
- [x] 填空题数组答案合并显示（"主码、外码"）
- [x] 填空题正确答案自动跳转
- [x] 填空题错误答案显示反馈 + 下一题按钮
- [x] 填空题多答案提交判定（逗号分隔）
- [x] 简答题提交评分正常（得分合理）
- [x] 简答题参考答案完整显示
- [x] 简答题跳转正常
- [x] 无图题渲染与改造前一致（向后兼容）

## 关联文档

- `.codestable/compound/2026-06-19-learning-answer-field-normalization.md`
