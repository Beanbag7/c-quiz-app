---
doc_type: feature-acceptance
feature: 2026-05-30-fillblank-auto-next-focus
status: confirmed
summary: 填空题在回车提交后，答对自动进入下一题；切题后输入框自动聚焦，方便连续作答
tags:
  - frontend
  - fillblank
  - ux
  - keyboard
---

# fillblank-auto-next-focus Acceptance

## 需求摘要

填空题答题时，用户按回车即可提交。若答案正确，系统自动跳到下一题；若答案错误，则保留手动“下一题”按钮。进入新题后输入框自动获得焦点并选中，减少连续作答时的额外点击。

## 实现核对

| 项目 | 状态 | 说明 |
|---|---|---|
| 回车提交 | ✓ | 填空题输入框使用原生 form submit 链路，Enter 可触发提交 |
| 正确后自动下一题 | ✓ | `fillBlankCorrect === true` 时触发短延迟自动切题 |
| 错误后手动下一题 | ✓ | 错题保留“下一题”按钮，用户手动确认后再继续 |
| 切题自动聚焦 | ✓ | 新题渲染后输入框自动 focus + select |
| 定时器清理 | ✓ | 切题/unmount 时清理自动下一题定时器，避免串题 |
| 构建 | ✓ | `npm run build` 通过 |

## 修改文件

| 文件 | 改动 |
|---|---|
| `src/App.jsx` | 为填空题补充自动下一题逻辑、定时器清理、错误题保留手动下一题按钮 |
| `src/components/FillBlankQuestion.jsx` | 改为 form submit 链路；Enter 提交时阻止默认行为；新增题目切换自动聚焦 |

## 影响面

- 仅影响填空题渲染路径，不影响单选/多选/判断/解答题
- 所有题库（数据库、形势与政策等）的填空题均适用

## 遗留

- 无
