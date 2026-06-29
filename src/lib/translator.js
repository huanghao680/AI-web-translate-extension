const TRANSLATION_RULES = `翻译规则：
1. 保持原文的格式、换行和标点符号
2. 保持原文中的 HTML 标签、Markdown 标记、代码片段、变量名、URL 不变
3. 专业术语翻译要准确
4. 语气和风格应与原文保持一致
5. 只返回翻译结果，不要添加任何解释或额外内容
6. 文本段之间用 ---SEPARATOR--- 分隔，输出时必须保持这些分隔符的数量和位置与输入完全一致`;

const STYLE_PROMPTS = {
  default: '',
  formal: `\n翻译要求：使用正式的书面语风格，措辞严谨，避免口语化表达。
- 将英文中的缩略形式（如 don't、it's、won't）展开为完整形式（do not、it is、will not）
- 使用被动语态和长句结构以增强正式感
- 避免俚语、网络用语和感叹语气`,
  concise: `\n翻译要求：力求简洁精炼，在保证准确的前提下尽量缩短译文长度。
- 省略原文中的冗余修饰词和填充词
- 复合从句拆分为简短独立的短句
- 中文译文优先使用四字成语和短结构`,
  academic: `\n翻译要求：学术翻译风格，术语翻译要求精确统一，句式结构完整严谨。
- 专业术语首次出现时在括号内标注英文原文
- 全文保持术语翻译一致性，同一术语不允许出现不同译法
- 长难句保留原文的逻辑关系层次，不随意拆分
- 采用学术论文式的客观中立语气`,
};

const STYLE_TEMPERATURE = {
  default: 0.3,
  formal: 0.15,
  concise: 0.4,
  academic: 0.1,
};

function getTemperature(style) {
  return STYLE_TEMPERATURE[style] ?? 0.3;
}

function buildSystemPrompt(pageUrl, style) {
  let ctx = '你是一个专业的网页翻译助手。你的任务是将用户提供的文本翻译成指定的目标语言。';
  if (pageUrl) {
    try {
      const url = new URL(pageUrl);
      ctx += `\n\n当前页面信息：域名 ${url.hostname}，完整路径 ${url.pathname}。翻译时请结合该网站的主题和语境，确保专业术语准确。`;
    } catch {}
  }
  const stylePrompt = STYLE_PROMPTS[style] || '';
  ctx += stylePrompt;
  ctx += `\n\n${TRANSLATION_RULES}`;
  return ctx;
}

async function getApiSettings() {
  const settings = await getSettings();
  const profile = await getActiveProfile();
  return {
    baseUrl: profile?.baseUrl || '',
    apiKey: profile?.apiKey || '',
    model: profile?.model || '',
    enableThinking: settings.enableThinking,
    maxTokens: profile?.maxTokens || 32768,
    translationStyle: settings.translationStyle || 'default',
  };
}

async function translateText(text, targetLang, sourceLang = 'auto', pageUrl) {
  const opts = await getApiSettings();
  if (!opts.apiKey) throw new Error('请先在设置中配置 API Key');

  const sourceLangText = sourceLang === 'auto' ? '自动检测' : sourceLang;
  const client = new ApiClient(opts.baseUrl, opts.apiKey);

  const result = await client.chatCompletion({
    model: opts.model,
    messages: [
      { role: 'system', content: buildSystemPrompt(pageUrl, opts.translationStyle) },
      { role: 'user', content: `请将以下${sourceLangText}文本翻译成${targetLang}：\n\n${text}` },
    ],
    temperature: getTemperature(opts.translationStyle),
    maxTokens: opts.maxTokens,
    thinkingDisabled: !opts.enableThinking,
  });

  return result;
}

async function translateTextStream(text, targetLang, sourceLang = 'auto', pageUrl) {
  const opts = await getApiSettings();
  if (!opts.apiKey) throw new Error('请先在设置中配置 API Key');

  const sourceLangText = sourceLang === 'auto' ? '自动检测' : sourceLang;
  const client = new ApiClient(opts.baseUrl, opts.apiKey);

  return client.streamChatCompletion({
    model: opts.model,
    messages: [
      { role: 'system', content: buildSystemPrompt(pageUrl, opts.translationStyle) },
      { role: 'user', content: `请将以下${sourceLangText}文本翻译成${targetLang}：\n\n${text}` },
    ],
    temperature: getTemperature(opts.translationStyle),
    maxTokens: opts.maxTokens,
    thinkingDisabled: !opts.enableThinking,
  });
}

async function translatePage(htmlContent, targetLang, sourceLang = 'auto', pageUrl) {
  const opts = await getApiSettings();
  if (!opts.apiKey) throw new Error('请先在设置中配置 API Key');

  const sourceLangText = sourceLang === 'auto' ? '自动检测' : sourceLang;
  const client = new ApiClient(opts.baseUrl, opts.apiKey);

  const result = await client.chatCompletion({
    model: opts.model,
    messages: [
      { role: 'system', content: buildSystemPrompt(pageUrl, opts.translationStyle) },
      { role: 'user', content: `请将以下${sourceLangText}网页内容完整翻译成${targetLang}。\n注意：只翻译可见文本内容，保留所有 HTML 标签和属性结构不变。\n\n${htmlContent}` },
    ],
    temperature: getTemperature(opts.translationStyle),
    maxTokens: opts.maxTokens,
    thinkingDisabled: !opts.enableThinking,
  });

  return result;
}

async function translateWord(word, targetLang, sourceLang = 'auto', pageUrl) {
  const opts = await getApiSettings();
  if (!opts.apiKey) throw new Error('请先在设置中配置 API Key');

  const sourceLangText = sourceLang === 'auto' ? '自动检测' : sourceLang;
  const client = new ApiClient(opts.baseUrl, opts.apiKey);

  const systemPrompt = pageUrl
    ? buildSystemPrompt(pageUrl, opts.translationStyle)
    : '你是一个翻译助手，专注于单词和短语的翻译与解释。';

  const result = await client.chatCompletion({
    model: opts.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `请将以下${sourceLangText}单词/短语翻译成${targetLang}。\n如果可能，请提供：\n1. 中文释义\n2. 音标（如果是英文）\n3. 词性\n4. 例句\n\n单词/短语：${word}` },
    ],
    temperature: 0.3,
    maxTokens: Math.min(opts.maxTokens, 1024),
    thinkingDisabled: !opts.enableThinking,
  });

  return result;
}
