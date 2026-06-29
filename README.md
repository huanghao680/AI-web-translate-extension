# AI 网页翻译

> **⚠️ 早期开发阶段** — 本项目由 AI 大语言模型辅助编写，可能存在 bug，欢迎提交 Issue 和 PR。

基于大语言模型 API 的 Chrome 浏览器翻译插件，支持整页翻译、划选翻译、块选择和总结性翻译。

## 功能特性

- **整页翻译** — 一键翻译整个网页的可见文本内容，自动跳过表格、代码块、图标字体
- **划选翻译** — 选中文本后点击浮动按钮确认翻译，精确选区范围
- **选择块翻译** — 鼠标选择内容块，方向键调整范围，Enter 确认
- **总结性翻译** — 对网页内容先总结再翻译，大幅降低 Token 消耗，结果展示在浮动面板
- **选词翻译** — 选中单词后弹出翻译浮窗（释义、音标、例句），可在设置中关闭
- **原文/译文切换** — 翻译后一键切换，不消耗额外 API
- **多 API 配置** — 支持多个配置（DeepSeek、MiMo 等），弹窗内一键切换
- **翻译风格** — 支持默认/正式/简洁/学术四种风格，弹窗内即时切换
- **翻译提示** — 页面加载时弹出翻译提示条，可配置点击后执行整页翻译或总结性翻译
- **Token 统计** — 弹窗内显示上次和累计的输入/输出 Token 消耗，支持清空
- **内容精简（Beta）** — 仅提取正文区域发送给 AI，减少 Token 消耗
- **配置导出/导入** — 所有配置可导出为 JSON 文件备份或迁移
- **错误日志** — API 请求失败时记录详细信息，弹窗内可查看
- **本地存储** — API Key 等敏感数据仅存储在 `chrome.storage.local`
- **暗色模式** — 弹窗和设置页跟随系统深色主题
- **SPA 自适应** — 拦截 `pushState`/`replaceState`，单页应用切换时自动重置状态

## 快速开始

1. `chrome://extensions/` → 开启开发者模式 → 加载已解压的扩展程序（选择本项目目录）
2. 点击扩展图标 → 设置 → 新建配置，填写 API Base URL、API Key、模型名称
3. 点击保存配置 → 测试连接验证

## 项目结构

```
src/
├── background/service-worker.js   # 生命周期
├── content/
│   ├── content.js                 # DOM 操作、翻译执行、块选择、SPA 检测
│   ├── content.css                # 样式（进度条、提示条、浮窗、面板）
│   ├── selection-tooltip.js       # 选词浮窗
│   └── progress-bar.js            # 翻译进度条
├── popup/                         # 弹出面板（配置切换、风格切换、Token 统计、错误日志）
├── options/                       # 设置页（配置管理、翻译设置、风格）
└── lib/
    ├── storage.js                 # 配置存储、profiles 管理
    ├── api-client.js              # OpenAI 兼容 API 通信、错误捕获
    ├── translator.js              # 提示词构建、翻译风格、总结翻译
    ├── content-extractor.js       # 正文区域提取（内容精简）
    ├── token-usage.js             # Token 用量统计
    └── error-log.js               # 错误日志记录
```

## 配置管理

支持多个 API 配置，每配置独立存储 `baseUrl / apiKey / model / maxTokens`。设置页 CRUD，弹窗中快速切换。

## 翻译风格

| 风格 | temperature | 说明 |
|------|------------|------|
| 默认 | 0.3 | 通顺自然 |
| 正式 | 0.15 | 书面语，展开缩略形式 |
| 简洁 | 0.4 | 精炼简略，拆分长句 |
| 学术 | 0.1 | 术语一致，客观中立 |

## API 兼容

使用 OpenAI 兼容格式，已适配 DeepSeek 和 MiMo。

**DeepSeek**: `https://api.deepseek.com` / `deepseek-v4-flash` / 最大 384K tokens  
**MiMo**: `https://api.xiaomimimo.com/v1` / `mimo-v2.5-pro` / 最大 131072 tokens

选择模型名时自动推荐 maxTokens，用户可手动覆盖。

## 注意事项

- 使用前需自行准备 API Key，费用由 API 服务商收取
- 所有配置仅存储在 `chrome.storage.local`，不同步到云端
- 导出配置文件以明文包含 API Key，请妥善保管
- 多配置切换后需重新翻译页面

## License

MIT
