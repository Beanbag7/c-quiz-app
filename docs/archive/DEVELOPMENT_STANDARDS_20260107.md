# C-Quiz App 开发标准与最佳实践 (Development Standards)

本文档总结了项目开发过程中的关键技术标准、UI设计规范和“坑”的解决方案。后续开发**必须**严格遵循此文档，以确保代码显示的正确性和UI的一致性。

## 1. 代码块显示规范 (Critical)

**核心原则**：代码显示的准确性优先于美观性。必须通过“清理 -> 转义 -> 高亮”的严格管道。

### 1.1 组件标准 (`CodeBlock.jsx`)
*   **禁止操作**：
    *   ❌ 绝对禁止使用 `split('\n')` 或 `join(' ')` 处理代码文本，这会导致空格丢失。
    *   ❌ 禁止直接将未处理的HTML传入 `dangerouslySetInnerHTML`。
*   **标准管道**：
    1.  **清理 (Cleanup)**：移除所有HTML标签（完整及破损的），移除 `class=`, `id=` 等残留属性。
    2.  **转义 (Escape)**：将 `&`, `<`, `>` 转义为HTML实体，防止XSS。
    3.  **高亮 (Highlight)**：使用正则 `\b(keyword)\b` 匹配完整单词，包裹在 `<span>` 中，**绝对保留原始空格和换行**。

### 1.2 提取逻辑 (`QuizCard.jsx`)
*   **多格式支持**：
    *   优先匹配复杂格式：`<div class="v-md-pre-wrapper...">...<pre>...</pre>...</div>`
    *   回退匹配简单格式：`<pre><code>...</code></pre>`
*   **多代码块处理**：
    *   题目中可能包含多个代码段，必须使用循环提取所有匹配项，并保留代码段之间的文本说明（如“代码段1：”）。
*   **实体解码**：
    *   从JSON提取后，必须先解码HTML实体（`&lt;` -> `<`, `&quot;` -> `"`），然后再传入 `CodeBlock`。

## 2. UI/UX 设计系统

**设计风格**：Modern Glassmorphism (现代毛玻璃风格)

### 2.1 核心变量 (`App.css`)
```css
:root {
  --primary-blue: #2F80ED;
  --primary-purple: #9B51E0;
  --text-primary: #1F2937;
  --bg-light: #F9FAFB;
  --radius-lg: 24px; /* 大圆角 */
}
```

### 2.2 卡片样式标准
所有主要卡片（科目选择、题目卡片）必须遵循：
*   **背景**：`rgba(255, 255, 255, 0.95)` + `backdrop-filter: blur(16px)`
*   **阴影**：`box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12)`
*   **边框**：`border: 2px solid rgba(255, 255, 255, 0.4)` (半透明边框增强质感)
*   **悬停效果**：`transform` 上浮 + 阴影加深 + 顶部渐变条显现

### 2.3 布局原则
*   **全屏适应**：内容区域应至少 `min-height: 100vh`。
*   **居中对齐**：使用 `display: flex; justify-content: center;`，避免使用固定列数的Grid导致最后一行孤立。
*   **沉浸式体验**：进入刷题模式后，**移除**顶部Header和无关Footer，只保留“退出练习”的低干扰按钮。

## 3. 常见问题解决方案 (Troubleshooting)

### 3.1 JSON 数据脏乱
*   **现象**：JSON中的代码包含 `class="code-keyword"` 或破损的HTML标签。
*   **对策**：不要试图在JSON层面修复（工作量太大）。在前端 `CodeBlock` 组件中加入强力的正则清理逻辑：
    ```javascript
    codeText.replace(/<[^>]*>/g, '') // 移除标签
           .replace(/\s+(class|id|style)=[""'][^""']*[""']/g, '') // 移除属性
    ```

### 3.2 样式丢失
*   **现象**：`App.css` 突然变为空白或部分丢失。
*   **原因**：PowerShell 命令执行错误或并发写入冲突。
*   **预防**：修改大文件时，优先使用全量重写（Write），而非正则替换（Replace）。保持本地备份。

### 3.3 代码单词粘连
*   **现象**：`public class` 显示为 `publicclass`。
*   **原因**：语法高亮逻辑中使用了错误的字符串处理或CSS `white-space` 属性设置不当。
*   **修复**：确保 `CodeBlock.css` 设置 `white-space: pre-wrap` 或 `pre`，且 JS 逻辑中不触碰非关键字字符。

## 4. 文件职责

*   `public/questions.json`: 数据源（只读）。
*   `src/App.jsx`: 状态管理（路由、选题、错题本逻辑）。
*   `src/components/QuizCard.jsx`: 题目内容解析与渲染（HTML/代码分离）。
*   `src/components/CodeBlock.jsx`: 纯粹的代码渲染与高亮（无业务逻辑）。
*   `src/App.css`: 全局样式与CSS变量。

---
**版本**: 1.0 (2026-01-07)
**适用范围**: 任何涉及代码显示和UI调整的后续开发。
