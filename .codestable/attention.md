# 项目注意事项

> CodeStable 技能启动时必读。只记"不从代码读不出来"的硬约束。

## 项目简介

c-quiz-app：题库问答 Web 应用，基于 React + Vite 构建。

## 构建与运行

<!-- 示例：npm run dev 启动开发服务器，npm run build 打包 -->
<!-- 用 cs-note 追加真实信息 -->

- 前端首页是否可访问，优先检查 `/srv/c-quiz-app/dist/index.html` 是否存在；如果首页返回 403 而 `/api/*` 正常，通常是前端构建产物缺失而不是后端鉴权问题。
- 服务器部署后不能只看文件是否同步成功；必须确认 `systemctl restart c-quiz-app` 真正发生，否则磁盘代码可能已更新，但线上进程仍在跑旧代码。
- 当前线上 geo 来源地策略是：**不使用本地映射表**，直接依赖 `GEO_IP_LOOKUP_URL` 指向的 provider 返回中文值。线上默认已切到 `ip-api.com ... lang=zh-CN`。
- 如需让历史 visitor 记录的来源地显示与当前 provider 保持一致，需要额外执行一次按 `ipAddress` 回刷 `country/region/city` 的迁移，单纯改代码不会自动改旧数据。
- 与 visitor geo / 部署相关的长期决策：来源地显示默认以 provider 返回值为准、不做本地映射；部署验收必须同时确认 PID/启动时间变化和 `dist/index.html` 存在。
- 前端行为改动上线后，不能只看远端源码和构建日志；必须确认生产首页实际返回的新 bundle hash 已切换，再做真实浏览器验收，否则很容易误把“旧静态资源”当成“新逻辑失效”。

## 目录约定

<!-- 示例：QuestionData/ 存放题库 JSON，不要修改 -->

## 其他约束

<!-- 用 cs-note 逐条追加 -->

- 新接入题库时，不能只替换 `public/*.json`；必须逐题型核对答案 schema（尤其是 `正确答案` 是否为数组，以及反馈字段是 `答案`、`答案文本` 还是 `正确答案`）。
- 当前部署脚本对 CentOS Stream 9 使用固定 Node 22 运行 Vite；如果远端构建中断或 SSH 被打断，优先检查 `/tmp/cquiz-build.log` / `/tmp/cquiz-favicon-build.log`，不要盲目重复发起构建。
