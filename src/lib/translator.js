const TRANSLATION_RULES = `翻译规则：
1. 保持原文的格式、换行和标点符号
2. 保持原文中的 HTML 标签、Markdown 标记、代码片段、变量名、URL 不变
3. 专业术语翻译要准确
4. 语气和风格应与原文保持一致
5. 只返回翻译结果，不要添加任何解释或额外内容
6. 文本段之间用 ---SEPARATOR--- 分隔，输出时必须保持这些分隔符的数量和位置与输入完全一致`;

function buildSystemPrompt(pageUrl) {
  let ctx = '你是一个专业的网页翻译助手。你的任务是将用户提供的文本翻译成指定的目标语言。';
  if (pageUrl) {
    try {
      const url = new URL(pageUrl);
      ctx += `\n\n当前页面信息：域名 ${url.hostname}，完整路径 ${url.pathname}。翻译时请结合该网站的主题和语境，确保专业术语准确。`;
    } catch {
      // ignore invalid URL
    }
  }
  ctx += `\n\n${TRANSLATION_RULES}`;
  return ctx;
}

async function getApiSettings() {
  const { enableThinking } = await getSettings();
  const profile = await getActiveProfile();
  return {
    baseUrl: profile?.baseUrl || '',
    apiKey: profile?.apiKey || '',
    model: profile?.model || '',
    enableThinking,
    maxTokens: profile?.maxTokens || 32768,
  };
}

async function translateText(text, targetLang, sourceLang = 'auto', pageUrl) {
  const { baseUrl, apiKey, model, enableThinking, maxTokens } = await getApiSettings();

  if (!apiKey) throw new Error('请先在设置中配置 API Key');

  const sourceLangText = sourceLang === 'auto' ? '自动检测' : sourceLang;
  const client = new ApiClient(baseUrl, apiKey);

  const result = await client.chatCompletion({
    model,
    messages: [
      { role: 'system', content: buildSystemPrompt(pageUrl) },
      { role: 'user', content: `请将以下${sourceLangText}文本翻译成${targetLang}：\n\n${text}` },
    ],
    temperature: 0.3,
    maxTokens,
    thinkingDisabled: !enableThinking,
  });

  return result;
}

async function translateTextStream(text, targetLang, sourceLang = 'auto', pageUrl) {
  const { baseUrl, apiKey, model, enableThinking, maxTokens } = await getApiSettings();

  if (!apiKey) throw new Error('请先在设置中配置 API Key');

  const sourceLangText = sourceLang === 'auto' ? '自动检测' : sourceLang;
  const client = new ApiClient(baseUrl, apiKey);

  return client.streamChatCompletion({
    model,
    messages: [
      { role: 'system', content: buildSystemPrompt(pageUrl) },
      { role: 'user', content: `请将以下${sourceLangText}文本翻译成${targetLang}：\n\n${text}` },
    ],
    temperature: 0.3,
    maxTokens,
    thinkingDisabled: !enableThinking,
  });
}

async function translatePage(htmlContent, targetLang, sourceLang = 'auto', pageUrl) {
  const { baseUrl, apiKey, model, enableThinking, maxTokens } = await getApiSettings();

  if (!apiKey) throw new Error('请先在设置中配置 API Key');

  const sourceLangText = sourceLang === 'auto' ? '自动检测' : sourceLang;
  const client = new ApiClient(baseUrl, apiKey);

  const result = await client.chatCompletion({
    model,
    messages: [
      { role: 'system', content: buildSystemPrompt(pageUrl) },
      { role: 'user', content: `请将以下${sourceLangText}网页内容完整翻译成${targetLang}。\n注意：只翻译可见文本内容，保留所有 HTML 标签和属性结构不变。\n\n${htmlContent}` },
    ],
    temperature: 0.3,
    maxTokens,
    thinkingDisabled: !enableThinking,
  });

  return result;
}

async function translateWord(word, targetLang, sourceLang = 'auto', pageUrl) {
  const { baseUrl, apiKey, model, enableThinking, maxTokens } = await getApiSettings();

  if (!apiKey) throw new Error('请先在设置中配置 API Key');

  const sourceLangText = sourceLang === 'auto' ? '自动检测' : sourceLang;
  const client = new ApiClient(baseUrl, apiKey);

  const systemPrompt = pageUrl
    ? buildSystemPrompt(pageUrl)
    : '你是一个翻译助手，专注于单词和短语的翻译与解释。';

  const result = await client.chatCompletion({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `请将以下${sourceLangText}单词/短语翻译成${targetLang}。\n如果可能，请提供：\n1. 中文释义\n2. 音标（如果是英文）\n3. 词性\n4. 例句\n\n单词/短语：${word}` },
    ],
    temperature: 0.3,
    maxTokens: Math.min(maxTokens, 1024),
    thinkingDisabled: !enableThinking,
  });

  return result;
}
