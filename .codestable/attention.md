# 项目注意事项

> CodeStable 技能启动时必读。只记"不从代码读不出来"的硬约束。

## 项目简介

c-quiz-app：题库问答 Web 应用，基于 React + Vite 构建。

## 构建与运行

<!-- 示例：npm run dev 启动开发服务器，npm run build 打包 -->
<!-- 用 cs-note 追加真实信息 -->

## 目录约定

<!-- 示例：QuestionData/ 存放题库 JSON，不要修改 -->

## 其他约束

<!-- 用 cs-note 逐条追加 -->

- 新接入题库时，不能只替换 `public/*.json`；必须逐题型核对答案 schema（尤其是 `正确答案` 是否为数组，以及反馈字段是 `答案`、`答案文本` 还是 `正确答案`）。
