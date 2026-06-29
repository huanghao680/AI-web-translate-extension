# AI 网页翻译

> **⚠️ 早期开发阶段** — 本项目由 AI 大语言模型辅助编写，还存在很多潜在 bug 等待发现和修复，欢迎提交 Issue 和 PR。
>
> 本项目由 AI 大语言模型（DeepSeek）辅助编写。

一个基于大语言模型 API 的 Chrome 浏览器翻译插件，支持整页翻译、区域翻译、块选择和选词翻译。

## 功能特性

- **整页翻译** — 一键翻译整个网页的可见文本内容，保留页面布局和样式；自动跳过表格、代码块、图标字体等无需翻译的元素
- **区域翻译** — 选中网页中的文本区域进行翻译（选取实际 DOM 元素，支持原文/译文切换）
- **选择块翻译** — 鼠标 hover 选择内容块，滚轮向上/向下调整范围，Enter 确认翻译
- **选词翻译** — 鼠标选中单词/短语后自动弹出翻译浮窗（支持详细释义、音标、例句），可在设置中关闭
- **原文/译文切换** — 翻译后可在原文和译文之间自由切换，不消耗额外 API
- **自动翻译** — 页面加载时自动翻译，支持需确认/无需确认两种模式；检测到页面已是目标语言时跳过
- **翻译进度条** — 翻译过程中显示实时进度百分比和当前批次，支持取消
- **SPA 自适应** — 拦截 `pushState`/`replaceState`/`popstate` 事件，单页应用切换页面时自动重置翻译状态并重新触发
- **API 通用兼容** — 支持任何 OpenAI 兼容格式的大语言模型 API（如 DeepSeek、OpenAI、通义千问、GLM 等）
- **智能文本分组** — 按直接父节点（`parentNode`）分组，不同元素内的文本不会错误合并，避免跨标签内容串位
- **图标字体过滤** — 跳过 Font Awesome、Material Icons 等图标字体文本节点，防止图标被翻译为汉字
- **思考模式开关** — 可选开启模型的思维链输出，提高准确性但降低速度
- **状态反馈 UI** — 弹窗按钮根据页面状态动态高亮：未翻译时"翻译整页"蓝色主操作，已翻译时"切换原文/译文"蓝色主操作，块选模式中"选择块翻译"蓝色高亮

## 快速开始

### 安装方式

1. 打开 Chrome 浏览器，进入 `chrome://extensions/`
2. 开启右上角的"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择本项目根目录

### 配置

1. 点击扩展栏中的插件图标，打开弹出面板
2. 点击"设置"链接，进入设置页面
3. 填写以下信息：
   - **API Base URL**: API 服务地址，如 `https://api.deepseek.com`
   - **API Key**: 你的 API 密钥
   - **模型名称**: 使用的模型，如 `deepseek-v4-flash`
   - **源语言**: 网页原文语言（默认自动检测）
   - **目标语言**: 翻译目标语言（默认中文）
4. 点击"保存设置"
5. 点击"测试连接"验证 API 配置是否正确

### 使用

- **整页翻译**: 点击插件图标 → 点击"翻译整页"
- **区域翻译**: 选中网页文字 → 点击插件图标 → 点击"翻译选中"
- **块选择翻译**: 点击插件图标 → 点击"选择块翻译" → 鼠标 hover 浏览 → 点击锁定 → 滚轮调整范围 → Enter 确认翻译
- **选词翻译**: 选中网页中的单词/短语 → 自动弹出翻译浮窗
- **切换原文/译文**: 翻译后点击插件图标 → 点击"切换原文"/"切换译文"
- **自动翻译**: 在设置中开启"自动翻译"，页面加载时自动发起或提示

## 项目结构

```
AI网页翻译插件/
├── manifest.json              # Chrome Extension Manifest V3
├── package.json               # 项目元信息
├── README.md                  # 项目文档
├── icons/                     # 插件图标
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── src/
    ├── background/
    │   └── service-worker.js  # Service Worker — 生命周期管理
    ├── content/
    │   ├── content.js         # 内容脚本 — DOM 操作、翻译执行、块选择、自动翻译
    │   ├── content.css        # 内容脚本样式 — 进度条、提示条、浮窗、块选择高亮
    │   ├── selection-tooltip.js  # 选词浮窗组件
    │   └── progress-bar.js    # 翻译进度条组件
    ├── popup/
    │   ├── popup.html         # 弹出面板 HTML
    │   ├── popup.js           # 弹出面板逻辑
    │   └── popup.css          # 弹出面板样式
    ├── options/
    │   ├── options.html       # 设置页面 HTML
    │   ├── options.js         # 设置页面逻辑
    │   └── options.css        # 设置页面样式
    └── lib/
        ├── storage.js         # 存储工具 — chrome.storage 封装
        ├── api-client.js      # API 客户端 — OpenAI 兼容接口封装
        └── translator.js      # 翻译核心 — 翻译提示词与调用逻辑
```

## 技术架构

### 分层设计

```
┌─────────────────────────────────────┐
│            Popup (UI)               │  ← 用户交互入口，状态反馈
├─────────────────────────────────────┤
│          Content Script             │  ← DOM 操作、块选择、批量翻译
├─────────────────────────────────────┤
│       Background Service Worker     │  ← 生命周期管理
├─────────────────────────────────────┤
│       Translator (翻译核心)         │  ← 提示词构建、翻译策略
├─────────────────────────────────────┤
│       ApiClient (API 客户端)        │  ← HTTP 请求、流式解析、思考模式控制
├─────────────────────────────────────┤
│      Storage (存储层)               │  ← chrome.storage.sync
└─────────────────────────────────────┘
```

### 数据流

```
用户操作 → Popup → 发送消息 → Content Script
                                    ↓
                    getVisibleTextNodes() → isIconText() 过滤图标
                                    ↓
                    getPageSegments() → 按 parentNode 分组
                                    ↓
                          Translator.translateText()
                                    ↓
                          ApiClient.chatCompletion()
                                    ↓
                              AI API Response
                                    ↓
                    applyTranslationToSegment() 回写译文
                                    ↓
                    preserveOriginalContent() / saveTranslatedContent()
                                    ↓
                         原文/译文切换可用
```

### 核心模块说明

| 模块 | 路径 | 职责 |
|------|------|------|
| **storage.js** | `src/lib/storage.js` | 封装 `chrome.storage.sync`，管理插件配置持久化 |
| **api-client.js** | `src/lib/api-client.js` | 实现与 OpenAI 兼容 API 的通信，支持思考模式开关和普通/流式调用 |
| **translator.js** | `src/lib/translator.js` | 构建翻译提示词，调用 API 完成翻译，支持整页/选词/单词翻译三种模式 |
| **content.js** | `src/content/content.js` | DOM 操作核心：`getVisibleTextNodes` 排除表格/代码/图标字体；`getPageSegments` 按 `parentNode` 分组；`applyTranslationToSegment` code-point 安全回写；`startBlockSelection` 块选择交互；`setupSpaDetection` SPA 导航检测；`checkAutoTranslate` 自动翻译；`detectPageLanguage` 语言检测 |
| **selection-tooltip.js** | `src/content/selection-tooltip.js` | 选词浮窗，定位窗口位置、加载动画、流式展示翻译结果 |
| **progress-bar.js** | `src/content/progress-bar.js` | 翻译进度条，显示百分比、当前批次状态，支持取消 |
| **service-worker.js** | `src/background/service-worker.js` | 插件生命周期事件处理 |
| **popup.js** | `src/popup/popup.js` | 弹出面板交互，`updateAllButtons` 根据页面状态动态高亮按钮 |
| **options.js** | `src/options/options.js` | 设置页面，管理 API 配置、划词/思考模式/自动翻译等 |

## API 兼容性

该插件使用 OpenAI 兼容的 API 格式，理论上支持任何实现了 `/chat/completions` 端点的服务。

| 服务 | Base URL 示例 |
|------|--------------|
| DeepSeek | `https://api.deepseek.com` |
| OpenAI | `https://api.openai.com/v1` |
| 通义千问 (Qwen) | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| GLM (智谱) | `https://open.bigmodel.cn/api/paas/v4` |
| 任何兼容服务 | 自定义 |

### DeepSeek 推荐配置

| 参数 | 推荐值 |
|------|--------|
| Base URL | `https://api.deepseek.com` |
| 模型 | `deepseek-v4-flash`（高性价比）或 `deepseek-v4-pro`（高质量） |
| 上下文长度 | 1M tokens |
| 最大输出 | 384K tokens |

## 翻译策略

### 整页翻译

1. `getVisibleTextNodes` 遍历 DOM，排除表格（`TABLE`/`TD`/`TH` 等）、代码块（`CODE`/`PRE` 等）、表单元素（`INPUT`/`TEXTAREA` 等）、SVG/CANVAS、图标字体（`isIconText` 检测类名和 Unicode 范围）
2. `getPageSegments` 按直接父节点（`parentNode`）将相邻文本节点分组为独立段落，不同父元素的节点不会合并
3. 每批 15 个片段，用 `---SEPARATOR---` 分隔发送给 AI API
4. 返回结果按原文各 text node 字符数比例（code-point 安全，不切分 emoji surrogate pair）分配译文
5. 保存原文和译文 DOM 快照，支持一键切换（无 API 调用）
6. 翻译过程中显示进度条，支持取消

### 块选择翻译

1. 点击弹窗"选择块翻译"进入选择模式
2. 鼠标 hover 浏览，目标块显示蓝色半透明高亮框
3. 点击锁定当前块，自动构建从锚点到 `<body>` 的祖先链
4. **滚轮向上** → 扩展到父级元素，**滚轮向下** → 缩回子级元素
5. Enter 或点击工具栏"翻译"按钮确认
6. Esc 或点击"取消"退出选择模式
7. 块翻译结果同时保存快照，与整页翻译共享原文/译文切换

### 自动翻译

1. 页面加载后检查 `autoTranslate` 配置
2. 调用 `detectPageLanguage()` 检测页面语言（基于 Unicode 字符范围统计）
3. 若页面已是目标语言，跳过不翻译
4. 需确认模式：页面顶部弹出蓝色 banner，"翻译"按钮确认
5. 无需确认模式：直接发起整页翻译
6. SPA 页面导航时自动重新检查

### 选词翻译

1. 监听 `mouseup` 事件，获取选中文本
2. 可在设置中关闭
3. 鼠标位置渲染翻译浮窗，使用 `translateWord` 获取详细释义（词性、音标、例句）
4. 点击关闭或 Esc 键关闭

## SPA 自适应

插件拦截 `history.pushState`、`history.replaceState` 和 `popstate` 事件。当检测到 SPA 页面 URL 变化时：

- 清空原文/译文快照，重置显示模式
- 重新初始化选词浮窗和进度条
- 按自动翻译配置重新检查是否需要翻译

## 开发指南

### 环境要求

- Chrome 88+（支持 Manifest V3）
- 无需构建工具，原生 JavaScript

### 本地调试

1. 在 Chrome 扩展管理页面加载插件
2. 右键插件图标 → "审查弹出内容" 调试 Popup
3. 在目标页面右键 → "检查" → Console 查看 Content Script 日志
4. Service Worker 日志在 `chrome://extensions/` 点击插件的"Service Worker"查看

### 自定义翻译提示词

编辑 `src/lib/translator.js` 中的 `TRANSLATION_SYSTEM_PROMPT` 常量。

### 扩展功能

- 如需支持更多翻译风格，在 `options.html` 的 `translationStyle` 中添加选项并在 `translator.js` 中调整提示词
- 如需添加语言支持，在 `options.html` 的 `sourceLang` 和 `targetLang` 中添加对应选项

## 注意事项

- 使用前需自行准备 API Key，费用由 API 服务商收取
- 整页翻译大量文本时会消耗较多 API tokens，建议合理使用
- 插件不会收集任何用户数据，API Key 仅存储在本地 `chrome.storage.sync`
- 动态加载的内容（如 SPA 页面深层切换）可能需要手动点击翻译

## License

MIT
