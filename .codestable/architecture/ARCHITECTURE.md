# Architecture

> 系统架构总入口。记录现状，不写规划。

## 项目概述

**项目名**：c-quiz-app  
**技术栈**：React + Vite 前端、Node/Express 后端、Redis、MariaDB (MySQL)、Nginx  
**用途**：题库问答 Web 应用，支持刷题练习、在线人数统计、管理员访客日志与题库管理

## 当前系统拓扑

```text
Browser
  ↓
Nginx (:80)
  ├─ /           → /srv/c-quiz-app/dist
  ├─ /api/*      → http://127.0.0.1:3001
  └─ /assets/*   → /srv/c-quiz-app/public/assets (images)
                    ↓
                Express app (server/src/**)
                    ├─ visitors heartbeat / counts
                    ├─ admin login / session / visitors / bans
                    ├─ quiz banks / questions (public + admin CRUD)
                    ├─ geo IP lookup
                    └─ storage: Redis (sessions/presence) + MySQL (quiz data)
                    ↓        ↓
                 Redis    MariaDB
```

## 目录结构

```text
src/
├── App.jsx                    主应用组件
├── components/                业务组件（含 AdminVisitorLog）
├── hooks/                     前端共享逻辑（visitor presence）
├── services/                  前端 API client
├── assets/                    前端静态资源

server/
├── src/
│   ├── app.js                 Express app 组装
│   ├── config.js              环境变量配置（含 MySQL 连接参数）
│   ├── index.js               服务启动入口
│   ├── db/
│   │   ├── schema.sql         题库 MySQL DDL
│   │   ├── mysqlPool.js       连接池
│   │   └── migrate.js         JSON → MySQL 迁移
│   ├── routes/
│   │   ├── visitors.js        heartbeat / counts
│   │   ├── quiz.js            公开题库 API
│   │   └── admin.js           管理员（登录/session/访客/封禁/题库管理）
│   ├── services/
│   │   ├── visitorLogService.js
│   │   ├── visitorBanService.js
│   │   ├── quizBankService.js 题库 CRUD
│   │   └── ...
│   ├── storage/               Redis + memory fallback 抽象
│   └── utils/                 cookie / visitor helpers
├── deploy/                    systemd / nginx / push-deploy 脚本
└── README.md

public/
├── *.json                     题库 JSON（静态回退 + 迁移源）
├── assets/ds_images/          数据结构题库图片
└── vite.svg

scripts/
└── migrate-quiz-to-mysql.js   命令行迁移入口
```

## 关键运行语义

### 1. 在线人数
- 前端根据当前页面决定 `scope=home|quiz`
- 周期性调用 `/api/visitors/heartbeat`
- 服务端用 Redis 维护 presence；Redis 不可用时降级为单进程内存

### 2. 管理员访客日志
- 管理员通过密码登录建立服务端 session
- `/api/admin/visitors` 返回真实 IP、设备 ID、设备摘要、封禁状态、来源地、同 IP 打开次数
- 普通用户只可见在线人数，不可见访客明细

### 2.1 设备识别与封禁
- 浏览器 Web 端不能读取真实 MAC 地址；当前以服务器生成的 `visitorId` 作为设备 ID
- 设备摘要使用 server-side user-agent 解析结果（例如浏览器 / 平台）
- 管理员可对设备 ID 或 IP 执行封禁 / 解封
- 封禁记录独立存储，包含原因、创建人、更新时间和状态，不混入访客统计记录
- `/api/visitors/heartbeat` 在写入前检查封禁状态，被封禁时直接返回 403，不更新 presence 或访客记录

### 3. 来源地显示
- 当前实现**不使用本地映射表**
- 服务端直接使用 `GEO_IP_LOOKUP_URL` 对应 provider 返回的中文 country/region/city
- 线上默认 provider 为：`ip-api.com ... lang=zh-CN`
- 历史记录如需与当前策略一致，需要单独回刷 visitor 记录中的地理字段

### 4. 填空题交互
- 填空题使用原生 `form submit` 链路，用户按 Enter 即可提交
- 仅当判定为正确时，才会在短延迟后自动进入下一题
- 错误答案保留手动“下一题”按钮，避免误跳
- 进入下一题后，输入框会自动 focus 并 select，方便连续作答
- 自动下一题使用可清理的定时器，切题或卸载时会清除，避免旧回调串题

### 5. 题库管理与 MySQL 存储
- 题库元数据和题目存储在 MariaDB (MySQL) 中，通过 `mysql2` 连接池访问
- 表结构：`quiz_banks`（subject_key / name / icon / sort_order）+ `questions`（bank_id / seq / question_type / content / options JSON / correct_answer / answer_text / chapter / question_images JSON）
- 前端加载流程：API 优先（`GET /api/quiz/banks/:subject/questions`），失败时回退到 `public/*.json` 静态文件
- 管理员可通过 `#admin` → 题库管理 进行 CRUD 操作，支持 JSON 批量导入
- 迁移脚本 `scripts/migrate-quiz-to-mysql.js` 将 `public/*.json` 导入 MySQL，幂等可重复执行

### 5.1 答案格式规范化
- `选项` 在 MySQL 中以 JSON 列存储，读出时 `parseJsonSafe` 自动解析为对象
- `正确答案` 以 TEXT 列存储：多选题存 JSON 数组 `["A","C"]`，其余存纯文本
- `parseJsonSafe` 仅对首字符为 `[` 或 `{` 的值做 JSON 解析，避免 `"42"` 被反序列化为数字 `42`
- 填空题答案若为字符数组（如 `["N","U","L","L"]`），`formatQuestionRow` 自动合并为字符串 `"NULL"`

### 5.2 答案字段归一化（前端）
- 题库答案字段在历史上形成 `答案` / `答案文本` / `正确答案` 三种命名混用：
  - database 题库填空题只有 `答案` 字段
  - ds / sxyz 题库用 `答案文本` + `正确答案`
- 前端读取答案字段**必须用三级回退**：`答案文本 ?? 正确答案 ?? 答案`，硬编码单一字段名会导致 undefined 崩溃
- `FillBlankQuestion` 用 `normalizeAnswer` 归一化为字符串数组，`formatAnswerDisplay` 多答案用顿号连接显示
- `EssayQuestion` 评分和参考答案显示同样用三级回退
- `normalize` 类工具函数对 undefined 安全（`String(x ?? '')`）

### 5.3 解答题图片渲染
- 答案图片：内嵌在 `答案文本` 字段的 Markdown 图片语法 `![alt](src)`，前端 `renderRichText` 用零依赖正则解析渲染为 `<img>`（不引入 markdown 库）
- 题干图片：存储在独立的 `question_images JSON` 列（路径数组，如 `["/images/ds_essay/72_q_1.png"]`），`formatQuestionRow` 输出为 `题目图片` 字段
- 图片资源放在 `public/images/ds_essay/`，使用绝对路径（nginx root 指向 dist/）
- 评分前 strip 图片语法（`replace(/!\[[^\]]*\]\([^)]*\)/g, '')`），避免图片说明文字干扰关键词评分
- 无图题向后兼容：纯文本原样渲染

### 2.2 管理员访客日志表格
- 访客表格为 5 列紧凑布局：设备 / 网络位置 / 活跃情况 / 封禁状态 / 操作
- 信息零丢失：网络位置合并了 IP+来源地，活跃情况合并了最后活跃(相对时间)+首次访问+打开次数+最后页面
- 相对时间由 `formatRelativeTime` 生成（刚刚/X 分钟前/X 天前）
- 封禁列表（独立表格）保持 7 列原样

### 6. 在线聊天系统
- 基于 `ws` 库，与 Express 共享同一 HTTP Server（端口 3001）
- nginx `/ws` 路径负责 WebSocket 升级（`proxy_set_header Upgrade`）
- 消息存内存环形缓冲区（200 条），服务器重启清空
- 在线用户通过 `Map<ws, senderName>` 追踪，`join`/`leave` 时广播系统消息 + 用户列表
- 在线人数统一数据源：`GET /api/chat/online`（WebSocket 连接数），前端 `OnlineCount` 15s 轮询
- 弹幕：CSS `@keyframes danmakuScroll`，`pointer-events: none`，仅普通消息触发

### 7. 暗色模式
- 通过 `html[data-theme="dark"]` 切换 CSS 变量和硬编码颜色
- 集中管理在 `src/dark-theme.css`，覆盖所有页面和组件
- 主题偏好存入 `localStorage`，固定位置 🌙/☀️ 按钮切换

### 8. 错题本地持久化
- 错题按科目存入 `localStorage`（key: `cq_wrong_answers_{subject}`）
- 科目卡片显示错题数徽标（📝 N 道错题）
- 错题本练习从 localStorage 加载旧错题，练习后清除

### 9. 答题排行榜
- `POST /api/chat/score` 上报得分（userId + score + subject）
- Redis ZSet `leaderboard:weekly` 存储，内存 Map 回退
- `GET /api/chat/leaderboard` 返回 Top N，首页 `Leaderboard` 组件 30s 刷新

## 运维与部署要点

- 首页 403 且 `/api/*` 正常时，优先检查 `dist/index.html` 是否缺失
- 部署后必须确认 `c-quiz-app` 进程已重启，而不是只同步了文件
- 服务器 402MB RAM + 1GB swap，Vite 7 构建可能 OOM；**优先本地构建后 rsync dist/，不在远端执行 vite build**
- **仅前端改动**：本地 build + rsync dist/ 即可，无需重启服务（nginx 直接服务静态文件）
- **涉及服务端代码**（routes/services/db）：必须 `systemctl restart c-quiz-app`
- **涉及 MySQL schema 变更**：必须先 `ALTER TABLE` 再重新迁移数据，且服务端读写代码同步适配

## UI 设计参考

详见 `APP开发系统UI设计.md`（根目录）。
