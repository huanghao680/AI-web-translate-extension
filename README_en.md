# AI Web Translator

[中文](README.md)

> **⚠️ Early Development** — This project is AI-assisted. Bugs may exist. Issues and PRs welcome.

A Chrome extension for web page translation powered by LLM APIs.

## Features

- **Full Page** — Translate the entire page, skip tables/code/icon fonts
- **Select & Translate** — Select text, click the floating button to confirm
- **Select Block** — Hover to pick a block, arrow keys to adjust range
- **Summary** — Summarize then translate, reducing token consumption
- **Word Translate** — Select a word to see definition, transcription, examples
- **Toggle Original/Translation** — Switch between original and translated text
- **Multi Profile** — Add multiple API configs (DeepSeek, MiMo, etc.), switch in popup
- **Translation Style** — Default / Formal / Concise / Academic
- **Token Stats** — Last and cumulative prompt/completion tokens, resettable
- **Content Optimization (Beta)** — Extract main content only to save tokens
- **Export/Import Config** — Backup and restore all settings as JSON
- **Error Log** — Detailed API error records viewable in popup
- **Local Storage** — Sensitive data stored in `chrome.storage.local`
- **Dark Mode** — Follows system theme
- **Multi-language UI** — Switch between Chinese and English
- **SPA Ready** — Automatically resets on pushState/replaceState

## Quick Start

1. Go to `chrome://extensions/` → Developer mode → Load unpacked
2. Click extension icon → Settings → New profile, fill in Base URL / API Key / Model
3. Save profile → Test connection

## Profile Management

Multiple API profiles with independent `baseUrl / apiKey / model / maxTokens`. CRUD in settings, switch in popup.

## Translation Styles

| Style | temperature | Description |
|-------|------------|-------------|
| Default | 0.3 | Natural |
| Formal | 0.15 | Written language |
| Concise | 0.4 | Brief |
| Academic | 0.1 | Precise terminology |

## API Compatibility

Uses OpenAI-compatible format.

- **DeepSeek**: `https://api.deepseek.com` / `deepseek-v4-flash` / max 384K tokens
- **MiMo**: `https://api.xiaomimimo.com/v1` / `mimo-v2.5-pro` / max 131072 tokens

## Notes

- You need your own API key. Usage fees are charged by the API provider.
- All config is stored in `chrome.storage.local` only.
- Exported config file contains plaintext API keys. Handle with care.
- Re-translate after switching profiles.

## License

MIT
