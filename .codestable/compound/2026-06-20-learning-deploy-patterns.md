---
doc_type: learning
track: knowledge
status: current
summary: 本次会话部署多次遇到的 SSH 限流、分步上传遗漏、后端文件分类同步等关键经验
tags:
  - deployment
  - ssh
  - ops
severity: high
component: deployment
---

# 部署经验：SSH 限流、文件同步、服务重启

## 1. 阿里云 SSH 短时间高频密码登录触发限流

**现象**：部署时连续多次 `sshpass` + `ssh`/`scp`，偶发 `Permission denied (publickey,gssapi-keyex,gssapi-with-mic,password)`。

**根因**：阿里云对短时间多次 SSH 密码认证有防护机制，触发后短暂拒绝后续连接。

**解决**：
- 失败后 `sleep 3~8` 秒重试，通常能恢复
- **更好的做法**：合并多条命令到单次 SSH 连接中执行，或在 rsync/scp 中打包多个文件
- 同一次部署中前端 dist/ 和后端 server/src/ 分开推送，尽量减少独立连接数

**以后默认做法**：后端多个文件用 rsync 目录同步，不用逐文件 scp。本会话因 server/src/ 新增目录（ws/）和修改分散文件（index.js, app.js, chatService.js, chat.js, chatServer.js），未使用 rsync 全量同步，增加了连接次数。

## 2. 分步上传遗漏文件导致服务崩溃

**现象**：重启后 `c-quiz-app` 直接 crash（exit code 1），日志显示 `SyntaxError: does not provide an export named 'addUser'`。

**根因**：部署分了多批次 `scp`：先传 `chatService.js` 到 `/tmp/`，再传 `chatServer.js`，但 `chatService.js` 是在写入新版之前的旧文件（1260 bytes vs 2237 bytes），旧版无 `addUser` 导出。后续批次的 `chatService.js` 更新因 SSH 限流失败。

**解决**：
- 确认每个文件大小后再重启（`wc -c` + `grep -c` 验证关键导出）
- 先验证所有文件到位，再执行 `systemctl restart`
- 部署校验脚本：上传后对比本地和远程文件的关键导出符

**以后默认做法**：部署涉及多个服务端文件时，用 rsync 目录同步代替逐文件 scp；上传后执行 `grep -c` 验证关键导出；确认全部就位后才重启。

## 3. 仅前端改动无需重启服务

**现象**：`App.jsx` 选择题答案图片渲染修复部署后立即生效。

**确认**：nginx 直接服务 `dist/` 静态文件，前端 bundle 更新后 nginx 自动服务新文件。`c-quiz-app` 是 Express 后端进程，只处理 `/api/*`。

**规则**：
| 改动范围 | 部署步骤 |
|----------|----------|
| 仅前端（src/ 或 public/） | `npm run build` + rsync dist/ |
| 涉及后端（server/src/） | build + rsync dist/ + rsync server/src/ + `systemctl restart c-quiz-app` |
| 涉及 nginx 配置 | 改 `/etc/nginx/conf.d/c-quiz-app.conf` + `nginx -t && nginx -s reload` |
| 涉及 MySQL schema | `ALTER TABLE` + 迁移数据 + 重启服务 |

## 4. 环境变量覆盖 .env 导致密码不生效

**现象**：`.env` 改为新密码后本地服务仍用旧密码验证。

**根因**：shell 已有 `export ADMIN_PASSWORD=change-me`，dotenv 默认不覆盖已存在的环境变量。

**解决**：启动前 `env -u ADMIN_PASSWORD` 清掉 shell 变量，或用 `dotenv.config({ override: true })`。

## 一句话总结

**部署多文件服务端改动时，用 rsync 目录同步 + 上传后校验关键导出 + 确认就位后再重启。SSH 限流时 sleep 后重试。**