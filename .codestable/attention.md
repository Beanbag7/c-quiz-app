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
- 在 cmux / WKWebView 里验收填空题时，`fill` 可能只改 DOM 值，不一定驱动 React 受控状态；必须以真实提交链路、`activeElement` 和页面题号变化为准，不能只看 input value。
- 浏览器 Web 端拿不到真实 MAC 地址；访客日志里的“设备识别”必须以服务器生成的 `visitorId` 作为设备 ID，再加 `userAgent` / `deviceLabel` 作为管理员辅助识别信息。
- 访客封禁要同时支持设备 ID 和 IP 两条线：设备封禁默认走 `visitorId`，IP 封禁是辅助手段；两者都必须在 `/api/visitors/heartbeat` 写入前拦截。

## 目录约定

<!-- 示例：QuestionData/ 存放题库 JSON，不要修改 -->

## 其他约束

<!-- 用 cs-note 逐条追加 -->

- 新接入题库时，不能只替换 `public/*.json`；必须逐题型核对答案 schema（尤其是 `正确答案` 是否为数组，以及反馈字段是 `答案`、`答案文本` 还是 `正确答案`）。
- 当前部署脚本对 CentOS Stream 9 使用固定 Node 22 运行 Vite；如果远端构建中断或 SSH 被打断，优先检查 `/tmp/cquiz-build.log` / `/tmp/cquiz-favicon-build.log`，不要盲目重复发起构建。
- 服务器仅 402MB RAM（外加 1GB swap），**禁止在远端执行 `vite build`**；本地 build 后直接 rsync dist/ 到服务器。
- 题库数据已迁移到 MariaDB（`cquiz` 库），`public/*.json` 保留作为静态回退。新加题库必须同时更新 `server/src/db/migrate.js` 的 bankDefinitions 列表并执行迁移脚本。
- 图片资源放在 `public/assets/` 下，JSON 中引用相对路径（如 `assets/ds_images/chaoxing_final_review/img_0001.png`），不带前导 `/`。
- 填空题答案若源 JSON 存的是字符数组 `["A","B","C"]`，服务端 `formatQuestionRow` 会自动合并为 `"ABC"`；若发现答案长度异常，先检查源 JSON。
- `parseJsonSafe` 只对以 `[` 或 `{` 开头的字符串做 JSON.parse，防止纯数字/布尔值答案被意外反序列化。
- **前端读取答案字段必须用三级回退** `答案文本 ?? 正确答案 ?? 答案`。题库答案字段在历史上形成三种命名混用：database 题库填空题只有 `答案`，ds/sxyz 题库用 `答案文本`+`正确答案`。硬编码单一字段名会导致 `TypeError: Cannot read properties of undefined (reading 'trim')` 崩溃。
- **`normalize`/格式化工具函数必须对 undefined 安全**（`String(x ?? '')`），题库数据字段缺失是常态，不能假设字段一定存在。
- 解答题答案图片采用**零依赖正则渲染**（`renderRichText` 解析 `![alt](src)`），不引入 markdown 库。答案图片内嵌在 `答案文本` 字段，题干图片存储在独立的 `question_images JSON` 列。
- 答案文本内的图片语法在**评分前必须 strip**（`replace(/!\[[^\]]*\]\([^)]*\)/g, '')`），否则「答案图片」四字会被当关键词干扰评分。
- 部署仅前端改动时，本地 `npm run build` 后 rsync `dist/` 即可，无需重启 c-quiz-app 服务（nginx 直接服务静态文件）。但涉及服务端代码（routes/services/db）改动时必须 `systemctl restart c-quiz-app`。
- 涉及 MySQL schema 变更（如新增列）时，必须先 `ALTER TABLE` 再重新迁移数据，且服务端代码（`quizBankService.js` 的读写函数）要同步适配，否则新列写不进或读不出。
- SSH 密码登录阿里云短时间高频会触发限流（`Permission denied`），失败后 `sleep 3` 重试，或合并到单条 SSH 命令批量执行。
