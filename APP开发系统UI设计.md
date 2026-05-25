# APP开发系统UI设计









1. 🎨 核心配色体系 (Color Palette)
   设计采用了 “功能性色彩” 策略，即颜色不仅仅是装饰，还代表特定的状态或服务商分类。
   主品牌色 (Primary Blue):
   色值: 约 #2563EB 或 #3B82F6 (类似 Tailwind Blue 600)。
   用途: 主要操作按钮（“刷新所有”、“+ 添加”）、激活的开关（Toggle）、选中状态的边框（如 OpenAI 协议卡片）、链接文字。
   导航与层级色 (Navigation & Hierarchy):
   午夜蓝/深黑 (Midnight/Dark): 约 #111827。用于顶部导航栏的“选中项”背景（如“账号管理”、“API 反代”），营造沉稳的高级感。
   纯白 (White): #FFFFFF。用于所有的内容卡片，是界面的主要载体。
   背景灰 (Background Gray): #F3F4F6 或 #F9FAFB。极浅的冷灰色，用于页面底色，衬托白色卡片。
   语义/服务商配色 (Semantic & Vendor Coding):
   紫色 (Purple): 代表 Claude 3.5 系列模型。
   靛蓝 (Indigo): 代表 Claude 4.5 或 GPT-4/o1 高端模型系列。
   翠绿 (Emerald Green): 代表 GPT-4o/3.5 系列（通常指代快速/经济型），以及“运行中”的状态指示灯和高电量进度条。
   橙色 (Orange/Amber): 代表 GPT-5 系列或 警告信息（如“仅支持 Gemini 3 系列”）。
   红色 (Red/Rose): 用于破坏性操作（“停止服务”按钮的边框和文字）。
2. 🧩 布局与空间 (Layout & Spacing)
   卡片式架构 (Card-Based Architecture):
   界面完全由“卡片”构成。无论是大的“服务配置”区块，还是小的“模型家族”分组，都包裹在圆角矩形容器中。
   圆角 (Radius): 统一且较大。外层卡片约 12px - 16px，内部按钮和输入框约 6px - 8px，给人一种柔和、亲和的感觉。
   留白 (Whitespace):
   使用了 宽松 (Generous) 的内部填充（Padding）。元素之间不拥挤，信息密度适中，便于阅读复杂配置。
   视觉锚点:
   页面右下角的黑色代码块（Dark Mode Code Block）形成强烈的视觉对比，作为技术工具的特征符号，平衡了整体大面积的亮色。
3. 🛠 组件风格 (Component Styling)
   导航栏 (Navbar):
   采用了 “胶囊式 (Pill-shaped)” 选中态。选中的标签是深色胶囊背景+白色文字，未选中的是灰色文字。
   按钮 (Buttons):
   实心主按钮: 蓝色背景 + 白色文字，无阴影或轻微阴影（扁平化）。
   描边次级按钮: 白色背景 + 灰色或红色描边。
   输入框 (Inputs):
   标准的浅灰描边，Focus 状态下会有蓝色光晕（Ring）。
   进度条 (Progress Bars):
   非常细长的线条设计，配以右侧的百分比数字，精致且不抢眼。
   标签/徽章 (Badges/Tags):
   在“模型路由中心”中，利用大面积的浅色背景 + 深色图标/标题来区分不同的模型家族，这是一种很现代的 “Bento Grid（便当盒）” 风格变体。
4. 🔠 字体与排版 (Typography)
   字体:
   正文: 现代无衬线字体（Sans-Serif），可能是系统默认堆栈（System UI Stack），如 Windows 上的 Microsoft YaHei UI 搭配 Segoe UI。
   代码: 典型的等宽字体（Monospace），如 JetBrains Mono 或 Consolas，用于 API Key 显示和代码片段。
   字重:
   标题使用 粗体 (Bold) 强调层级。
   辅助说明文字（如“默认 8045...”）使用较细且颜色更浅的灰色字体。
   总结描述
   这套 UI 设计属于 “Clean Tech / Developer Tools” 风格。它摒弃了过度的装饰，通过清晰的卡片层级、直观的颜色编码和舒适的留白，将复杂的配置项管理得井井有条。
   核心关键词: 现代 (Modern)、干净 (Clean)、卡片化 (Card-based)、功能导向 (Functional)、扁平化 (Flat with subtle depth)。
