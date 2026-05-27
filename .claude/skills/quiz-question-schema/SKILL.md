---
name: quiz-question-schema
description: "Use whenever the user wants to generate, convert, normalize, validate, or explain this repo's quiz question JSON format. Also use when another AI needs a strict schema prompt for question-bank output, especially for 选择题、多选题、判断题、填空题、解答题 in c-quiz-app."
---

# c-quiz-app Quiz Question JSON Schema

## When to Use

- "按这个项目格式生成题库"
- "把这批题转成标准 JSON"
- "给其他 AI 一个题库格式规范"
- "检查这个题库是否符合项目标准"
- "为什么这个题库导入后不能答题"

If the task is about question-bank JSON for this repo, use this skill.

## Goal

Produce question-bank JSON that can be saved directly under `public/*.json` and consumed by the existing frontend without field-name drift or answer-shape mismatch.

## Non-Negotiable Rules

1. Top-level format MUST be:

```json
{
  "questions": []
}
```

2. Use these exact field names when applicable:

- `序号`
- `题目ID`
- `章节`
- `题目类型`
- `题目内容`
- `选项`
- `正确答案`
- `答案文本`
- `解析`
- `分值`
- `必考`

3. Do NOT invent aliases.
   - not `题干` → use `题目内容`
   - not `答案` → use `正确答案`
   - not `说明` → use `解析`

4. For `选择题` / `多选题` / `判断题`, `选项` must be an object, not an array.

5. For `多选题`, `正确答案` must be an array of option keys, for example:

```json
["A", "C"]
```

Never output:

- `"A,C"`
- `["选项A", "选项C"]`

6. For `选择题` / `判断题`, `正确答案` must be a single option key string, for example:

```json
"A"
```

7. `答案文本` should match the actual correct answer content.

## Supported Question Types

Preferred standard for new banks:

- `选择题`
- `多选题`
- `判断题`
- `填空题`
- `解答题`

Legacy compatibility still exists for some older banks:

- `单选题`

When creating a new bank, prefer `选择题` rather than `单选题` unless the task explicitly targets the legacy C / Java bank format.

## Canonical Schema by Type

### 1. 选择题

```json
{
  "序号": 1,
  "题目ID": 100001,
  "章节": "第1章",
  "题目类型": "选择题",
  "题目内容": "关于信息，以下说法正确的是（）",
  "选项": {
    "A": "信息 = 数据 + 语义",
    "B": "信息 = 数据",
    "C": "信息 = 数据 - 语义",
    "D": "信息 = 语义"
  },
  "正确答案": "A",
  "答案文本": "信息 = 数据 + 语义",
  "解析": "数据是信息的符号表示。",
  "分值": 1,
  "必考": false
}
```

### 2. 多选题

```json
{
  "序号": 2,
  "题目ID": 100002,
  "章节": "第1章",
  "题目类型": "多选题",
  "题目内容": "下列哪些说法正确？",
  "选项": {
    "A": "选项A",
    "B": "选项B",
    "C": "选项C",
    "D": "选项D"
  },
  "正确答案": ["A", "C"],
  "答案文本": "选项A、选项C",
  "解析": null,
  "分值": 1,
  "必考": false
}
```

### 3. 判断题

```json
{
  "序号": 3,
  "题目ID": 100003,
  "章节": "第1章",
  "题目类型": "判断题",
  "题目内容": "高质量发展是首要任务。",
  "选项": {
    "A": "正确",
    "B": "错误"
  },
  "正确答案": "A",
  "答案文本": "正确",
  "解析": null,
  "分值": 1,
  "必考": false
}
```

### 4. 填空题

```json
{
  "序号": 4,
  "题目ID": 100004,
  "章节": "第1章",
  "题目类型": "填空题",
  "题目内容": "中国式现代化的本质要求之一是 ______ 。",
  "正确答案": "实现高质量发展",
  "答案文本": "实现高质量发展",
  "解析": null,
  "分值": 1,
  "必考": false
}
```

If multiple blank answers are acceptable:

```json
{
  "正确答案": ["实现高质量发展", "推动高质量发展"],
  "答案文本": "实现高质量发展"
}
```

### 5. 解答题

```json
{
  "序号": 5,
  "题目ID": 100005,
  "章节": "第1章",
  "题目类型": "解答题",
  "题目内容": "简述高质量发展的主要内涵。",
  "正确答案": "参考答案文本",
  "答案文本": "参考答案文本",
  "解析": null,
  "分值": 5,
  "必考": false
}
```

## Field Requirements

### Required for every question

- `序号`
- `题目ID`
- `题目类型`
- `题目内容`
- `正确答案`
- `答案文本`

### Strongly recommended

- `章节`
- `解析`
- `分值`
- `必考`

### `选项` rules

- required for `选择题` / `多选题` / `判断题`
- omitted for `填空题` / `解答题`

## Repo-Specific Compatibility Notes

This repo currently has two practical families of banks:

### Legacy C / Java banks

Examples:

- `public/questions.json`
- `public/questions_java.json`

Common traits:

- `题目类型` often uses `单选题`
- mostly objective questions
- some legacy fields like `是否正确` may appear

### Database / K-line / sxyz banks

Examples:

- `public/questions_database.json`
- `public/kline_questions.json`
- `public/questions_sxyz.json`

Common traits:

- use `选择题` / `多选题` / `判断题` / `填空题` / `解答题`
- support `必考`
- richer `章节` / `解析` / `分值`

When creating new content, prefer the richer modern format.

## Output Contract for Other AIs

When another AI is asked to generate a bank for this repo, instruct it to:

1. output valid JSON only
2. output no markdown explanation
3. keep the top-level object as `{ "questions": [...] }`
4. use exact field names from this skill
5. ensure answer shapes match the question type

Recommended final instruction:

```text
Only output valid JSON for c-quiz-app. Do not output markdown, comments, or explanations. Use the exact field names: 序号, 题目ID, 章节, 题目类型, 题目内容, 选项, 正确答案, 答案文本, 解析, 分值, 必考. Top-level must be {"questions": [...]}. 多选题 must use 正确答案 as an array of option keys. 选择题/判断题 must use 正确答案 as a single option key string.
```

## Quick Validation Checklist

Before accepting generated JSON, check:

- [ ] top-level is `{ "questions": [...] }`
- [ ] all questions have `题目类型`, `题目内容`, `正确答案`, `答案文本`
- [ ] objective questions use `选项` object, not array
- [ ] `多选题` uses `正确答案: string[]`
- [ ] `选择题` / `判断题` use `正确答案: string`
- [ ] `答案文本` matches the actual correct answer content
- [ ] output is valid JSON with no extra prose

## If Asked to Convert Existing Data

When converting a non-standard bank into this repo format:

1. normalize field names to the standard names above
2. normalize question types to supported values
3. convert objective options into `{ "A": "...", "B": "..." }`
4. convert multi-answer strings into arrays of option keys when the source is a 多选题
5. ensure `答案文本` is filled even when the source only had raw answer keys

## One-Line Principle

If a generated question bank cannot be dropped into `public/*.json` and consumed by the current frontend without extra field-mapping code, it is not in the correct format.
