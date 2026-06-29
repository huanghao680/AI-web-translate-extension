# AI 网页翻译

> **⚠️ 早期开发阶段** — 本项目由 AI 大语言模型辅助编写，还存在很多潜在 bug 等待发现和修复，欢迎提交 Issue 和 PR。
>
> 本项目由 AI 大语言模型（DeepSeek）辅助编写。

一个基于大语言模型 API 的 Chrome 浏览器翻译插件，支持整页翻译、区域翻译、块选择和选词翻译。

## 功能特性

- **整页翻译** — 一键翻译整个网页的可见文本内容，保留页面布局和样式；自动跳过表格、代码块、图标字体等无需翻译的元素
- **区域翻译** — 选中网页中的文本区域进行翻译（选取实际 DOM 元素，支持原文/译文切换）
- **选择块翻译** — 鼠标 hover 选择内容块，方向键向上/向下调整范围，Enter 确认翻译
- **选词翻译** — 鼠标选中单词/短语后自动弹出翻译浮窗（支持详细释义、音标、例句），可在设置中关闭
- **多 API 配置** — 支持添加多个 API 配置（DeepSeek、MiMo 等），弹窗内一键切换
- **翻译风格切换** — 支持默认/正式/简洁/学术四种风格，弹窗内可直接切换
- **原文/译文切换** — 翻译后可在原文和译文之间自由切换，不消耗额外 API
- **自动翻译** — 页面加载时自动翻译，支持需确认/无需确认两种模式；检测到页面已是目标语言时跳过
- **翻译进度条** — 翻译过程中显示实时进度百分比和当前批次，支持取消
- **SPA 自适应** — 拦截 `pushState`/`replaceState`/`popstate` 事件，单页应用切换页面时自动重置翻译状态并重新触发
- **API 通用兼容** — 支持 OpenAI 兼容格式的大语言模型 API（已适配 DeepSeek、MiMo）
- **智能文本分组** — 按直接父节点（`parentNode`）分组，不同元素内的文本不会错误合并，避免跨标签内容串位
- **图标字体过滤** — 跳过 Font Awesome、Material Icons 等图标字体文本节点，防止图标被翻译为汉字
- **上下文感知翻译** — 翻译请求附带页面域名和路径，辅助模型理解语境
- **思考模式开关** — 可选开启模型的思维链输出，提高准确性但降低速度
- **每配置可调 maxTokens** — 每个 API 配置独立设置最大输出 Tokens，模型名自动推荐
- **错误日志** — API 请求失败时详细记录请求/响应信息，弹窗内可直接查看
- **状态反馈 UI** — 弹窗按钮根据页面状态动态高亮
- **配置导出/导入** — 所有配置（含 API Key）可导出为 JSON 文件备份，导入时恢复
- **本地存储** — API Key 等敏感信息仅存储在 `chrome.storage.local`，不同步到 Google 云端
- **暗色模式** — 弹窗和设置页自动跟随系统深色主题

## 快速开始

### 安装方式

1. 打开 Chrome 浏览器，进入 `chrome://extensions/`
2. 开启右上角的"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择本项目根目录

### 配置

1. 点击扩展栏中的插件图标，打开弹出面板
2. 点击"设置"链接，进入设置页面
3. 在"配置管理"中点击"新建配置"，填写：
   - **配置名称**: 如 `DeepSeek`
   - **API Base URL**: API 服务地址，如 `https://api.deepseek.com`
   - **API Key**: 你的 API 密钥
   - **模型名称**: 使用的模型，如 `deepseek-v4-flash`（可点击 🔄 从 API 获取列表）
   - **最大输出 Tokens**: 根据模型限制调整（DeepSeek 384000，MiMo 131072），选择模型名后自动推荐
4. 点击"保存配置"
5. 点击"测试连接"验证 API 配置是否正确
6. 可添加多个配置（如 DeepSeek + MiMo），弹窗中切换使用

### 使用

- **整页翻译**: 点击插件图标 → 点击"翻译整页"
- **区域翻译**: 选中网页文字 → 点击插件图标 → 点击"翻译选中"
- **块选择翻译**: 点击插件图标 → 点击"选择块翻译" → 鼠标 hover 浏览 → 点击锁定 → 方向键调整范围 → Enter 确认翻译
- **选词翻译**: 选中网页中的单词/短语 → 自动弹出翻译浮窗
- **切换原文/译文**: 翻译后点击插件图标 → 点击"切换原文"/"切换译文"
- **切换 API 配置**: 弹窗顶部下拉框选择配置，即时生效
- **切换翻译风格**: 弹窗底部下拉框选择风格（默认/正式/简洁/学术），即时生效
- **自动翻译**: 在设置中开启"自动翻译"，页面加载时自动发起或提示

## 项目结构

```
AI网页翻译插件/
├── manifest.json              # Chrome Extension Manifest V3
├── package.json               # 项目元信息
├── README.md                  # 项目文档
├── LICENSE                    # MIT License
├── icons/                     # 插件图标
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── src/
    ├── background/
    │   └── service-worker.js  # Service Worker
    ├── content/
    │   ├── content.js         # 内容脚本 — DOM 操作、翻译执行、块选择、SPA 检测
    │   ├── content.css        # 内容脚本样式
    │   ├── selection-tooltip.js  # 选词浮窗组件
    │   └── progress-bar.js    # 翻译进度条组件
    ├── popup/
    │   ├── popup.html         # 弹出面板 HTML（配置切换、风格切换、错误日志）
    │   ├── popup.js           # 弹出面板逻辑
    │   └── popup.css          # 弹出面板样式
    ├── options/
    │   ├── options.html       # 设置页面 HTML（配置管理、翻译设置、风格）
    │   ├── options.js         # 设置页面逻辑
    │   └── options.css        # 设置页面样式
    └── lib/
        ├── storage.js         # 存储工具 — 配置、profiles 管理
        ├── api-client.js      # API 客户端 — 请求封装、错误日志捕获
        ├── translator.js      # 翻译核心 — 提示词构建、风格支持
        └── error-log.js       # 错误日志 — 记录 API 请求失败详情
```

## 技术架构

### 分层设计

```
┌─────────────────────────────────────┐
│         Popup (UI + 切换)           │  ← 配置切换、风格切换、错误日志查看
├─────────────────────────────────────┤
│          Content Script             │  ← DOM 操作、块选择、批量翻译
├─────────────────────────────────────┤
│       Background Service Worker     │  ← 生命周期管理
├─────────────────────────────────────┤
│       Translator (翻译核心)         │  ← 提示词构建、风格控制、URL 上下文
├─────────────────────────────────────┤
│       ApiClient (API 客户端)        │  ← HTTP 请求、错误捕获、日志记录
├─────────────────────────────────────┤
│      Profile Manager (配置管理)     │  ← 多配置 CRUD、quick switch
├─────────────────────────────────────┤
│      ErrorLog (错误日志)            │  ← API 失败详情记录
├─────────────────────────────────────┤
│      Storage (存储层)               │  ← chrome.storage.sync / local
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
           Translator.translateText(opts) → 读取 active profile 
                                    ↓
                    buildSystemPrompt(url, style) → 风格 + 域名
                                    ↓
                      ApiClient.chatCompletion()
                      → 失败时 ErrorLog.add()
                                    ↓
                              AI API Response
                                    ↓
                    applyTranslationToSegment() 回写译文
                                    ↓
                    preserveOriginalContent() / saveTranslatedContent()
```

### 核心模块说明

| 模块 | 路径 | 职责 |
|------|------|------|
| **storage.js** | `src/lib/storage.js` | `chrome.storage.sync` 封装，多配置（profiles）CRUD、`migrateOnce` 旧数据迁移、`ensureProfileDefaults` |
| **api-client.js** | `src/lib/api-client.js` | OpenAI 兼容 API 通信，`_request()` 统一错误捕获并写入 ErrorLog，支持 `listModels()` |
| **translator.js** | `src/lib/translator.js` | 提示词构建，`buildSystemPrompt(url, style)` 支持页面上下文和翻译风格，`getApiSettings()` 从 active profile 读取参数 |
| **error-log.js** | `src/lib/error-log.js` | `chrome.storage.local` 错误日志，限制 200 条，记录 URL、status、request/response body |
| **content.js** | `src/content/content.js` | DOM 操作核心，`getPageSegments`/`applyTranslationToSegment`，`startBlockSelection` 块交互，`setupSpaDetection`，`checkAutoTranslate`，`detectPageLanguage` |
| **selection-tooltip.js** | `src/content/selection-tooltip.js` | 选词浮窗，定位、流式展示翻译结果 |
| **progress-bar.js** | `src/content/progress-bar.js` | 翻译进度条，百分比、批次状态、取消 |
| **popup.js** | `src/popup/popup.js` | 弹窗交互，配置/风格切换（动态保存），`updateAllButtons` 状态反馈，错误日志查看 |
| **options.js** | `src/options/options.js` | 设置页，配置 CRUD、模型列表获取、maxTokens 自动推荐、测试连接 |

## API 兼容性

该插件使用 OpenAI 兼容 API 格式，已适配以下模型：

### DeepSeek 推荐配置

| 参数 | 推荐值 |
|------|--------|
| Base URL | `https://api.deepseek.com` |
| 模型 | `deepseek-v4-flash`（高性价比）或 `deepseek-v4-pro`（高质量） |
| 上下文长度 | 1M tokens |
| 最大输出 | 384K tokens |

### MiMo（小米）推荐配置

| 参数 | 推荐值 |
|------|--------|
| Base URL | `https://api.xiaomimimo.com/v1` |
| 模型 | `mimo-v2.5-pro`（高质量）或 `mimo-v2.5`（均衡） |
| 最大输出 | 131072 tokens |
| 认证 | 支持 `Authorization: Bearer`，与插件现有机制完全兼容 |

### 模型 maxTokens 自动推荐

| 模型名模式 | 自动推荐值 |
|-----------|-----------|
| `deepseek*` | 384000 |
| `mimo*` | 131072 |
| `gpt-4o*`, `o*` | 16384 |
| 其他 | 32768（默认） |

选择或输入模型名后自动填充，用户可手动覆盖。

## 翻译策略

### 整页翻译

1. `getVisibleTextNodes` 遍历 DOM，排除表格/代码/表单/SVG/CANVAS/图标字体
2. `getPageSegments` 按直接父节点（`parentNode`）分组，不同父元素的节点不会合并
3. 每批 15 个片段，用 `---SEPARATOR---` 分隔发送给 AI API
4. 翻译请求附带页面域名路径和当前翻译风格
5. 返回结果按原文各 text node code-point 比例分配译文
6. 保存原文和译文 DOM 快照，支持一键切换（无 API 调用）

### 块选择翻译

1. 点击弹窗"选择块翻译"进入选择模式
2. 鼠标 hover 浏览，目标块显示蓝色半透明高亮框
3. 点击锁定当前块，自动构建从锚点到 `<body>` 的祖先链
4. **方向键 ↑** → 扩展到父级元素，**方向键 ↓** → 缩回子级元素
5. Enter 或点击工具栏"翻译"按钮确认
6. Esc 或点击"取消"退出
7. 块翻译结果与整页翻译共享原文/译文切换

### 翻译风格

| 风格 | temperature | 附加提示词要点 |
|------|------------|---------------|
| 默认 | 0.3 | 无额外提示 |
| 正式 | **0.15** | 展开缩略形式（don't → do not）、被动语态、避免俚语和网络用语 |
| 简洁 | **0.4** | 省略冗余修饰词、拆分为短句、优先使用四字成语 |
| 学术 | **0.1** | 术语首次出现标注英文原文、全文术语一致性、保留逻辑层次、客观中立语气 |

风格在弹窗中可即时切换。

### 自动翻译

1. 页面加载后检查 `autoTranslate` 配置
2. `detectPageLanguage()` 检测语言（Unicode 字符范围统计）
3. 页面已是目标语言 → 跳过
4. 需确认模式 → 蓝色 banner 提示翻译
5. 无需确认模式 → 直接发起翻译
6. SPA 页面导航时自动重新检查

### 选词翻译

1. 监听 `mouseup` 事件，获取选中文本
2. 可在设置中关闭
3. 浮窗渲染翻译结果，关闭或 Esc

## 多配置管理

插件支持添加多个 API 配置，每配置独立存储：

- **baseUrl / apiKey / model / maxTokens** — 连接凭据（maxTokens 根据模型名自动推荐）
- 设置页 CRUD（新建/编辑/删除），弹窗中通过下拉框即时切换
- 旧数据自动迁移为「默认配置」

## 配置导出/导入

设置页底部提供「导出配置」和「导入配置」按钮：

- **导出** — 将所有配置（含 API Key）序列化为 JSON 文件下载，导出前弹出警告提醒明文敏感信息
- **导入** — 选择 JSON 文件后写入本地存储并刷新页面
- 所有数据仅存储在 `chrome.storage.local`，不同步到 Google 云端

## 错误日志

API 请求失败时自动记录到 `chrome.storage.local`：

```javascript
{
  type: 'api_error' | 'network_error',
  baseUrl, url, model,
  status, statusText,
  responseBody, requestBody,
  timestamp
}
```

弹窗底部有 ⚠️ 折叠面板，显示最近 10 条日志，支持清除。

## SPA 自适应

拦截 `history.pushState` / `replaceState` / `popstate`。URL 变化时：

- 清空译文快照
- 重新初始化浮窗和进度条
- 按自动翻译配置重新检查

## 开发指南

### 环境要求

- Chrome 88+（Manifest V3）
- 原生 JavaScript，无需构建工具

### 本地调试

1. `chrome://extensions/` 加载插件
2. 右键插件图标 → "审查弹出内容" 调试 Popup
3. 目标页面右键 → "检查" → Console 查看 Content Script 日志
4. Service Worker 日志在扩展管理页面点击"Service Worker"

### 自定义翻译提示词

编辑 `src/lib/translator.js` 中的 `TRANSLATION_RULES` 或 `STYLE_PROMPTS`。

## 注意事项

- 使用前需自行准备 API Key，费用由 API 服务商收取
- 插件不会收集任何用户数据，API Key 等所有配置仅存储在 `chrome.storage.local`，不同步到 Google 云端
- 多配置切换后需重新翻译页面
- 导出配置文件以明文包含 API Key，请妥善保管，勿上传公开网络

## License

MIT
