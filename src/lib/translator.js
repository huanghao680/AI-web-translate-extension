const TRANSLATION_SYSTEM_PROMPT = `你是一个专业的网页翻译助手。你的任务是将用户提供的文本翻译成指定的目标语言。

翻译规则：
1. 保持原文的格式、换行和标点符号
2. 保持原文中的 HTML 标签、Markdown 标记、代码片段、变量名、URL 不变
3. 专业术语翻译要准确
4. 语气和风格应与原文保持一致
5. 只返回翻译结果，不要添加任何解释或额外内容
6. 文本段之间用 ---SEPARATOR--- 分隔，输出时必须保持这些分隔符的数量和位置与输入完全一致`;

async function translateText(text, targetLang, sourceLang = 'auto') {
  const { baseUrl, apiKey, model, enableThinking } = await getSettings();

  if (!apiKey) {
    throw new Error('请先在设置中配置 API Key');
  }

  const sourceLangText = sourceLang === 'auto'
    ? '自动检测'
    : sourceLang;

  const client = new ApiClient(baseUrl, apiKey);

  const userPrompt = `请将以下${sourceLangText}文本翻译成${targetLang}：

${text}`;

  const result = await client.chatCompletion({
    model,
    messages: [
      { role: 'system', content: TRANSLATION_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    maxTokens: 384000,
    thinkingDisabled: !enableThinking,
  });

  return result;
}

async function translateTextStream(text, targetLang, sourceLang = 'auto') {
  const { baseUrl, apiKey, model, enableThinking } = await getSettings();

  if (!apiKey) {
    throw new Error('请先在设置中配置 API Key');
  }

  const sourceLangText = sourceLang === 'auto'
    ? '自动检测'
    : sourceLang;

  const client = new ApiClient(baseUrl, apiKey);

  const userPrompt = `请将以下${sourceLangText}文本翻译成${targetLang}：

${text}`;

  return client.streamChatCompletion({
    model,
    messages: [
      { role: 'system', content: TRANSLATION_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    maxTokens: 384000,
    thinkingDisabled: !enableThinking,
  });
}

async function translatePage(htmlContent, targetLang, sourceLang = 'auto') {
  const { baseUrl, apiKey, model, enableThinking } = await getSettings();

  if (!apiKey) {
    throw new Error('请先在设置中配置 API Key');
  }

  const sourceLangText = sourceLang === 'auto'
    ? '自动检测'
    : sourceLang;

  const client = new ApiClient(baseUrl, apiKey);

  const userPrompt = `请将以下${sourceLangText}网页内容完整翻译成${targetLang}。
注意：只翻译可见文本内容，保留所有 HTML 标签和属性结构不变。

${htmlContent}`;

  const result = await client.chatCompletion({
    model,
    messages: [
      { role: 'system', content: TRANSLATION_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    maxTokens: 384000,
    thinkingDisabled: !enableThinking,
  });

  return result;
}

async function translateWord(word, targetLang, sourceLang = 'auto') {
  const { baseUrl, apiKey, model, enableThinking } = await getSettings();

  if (!apiKey) {
    throw new Error('请先在设置中配置 API Key');
  }

  const sourceLangText = sourceLang === 'auto'
    ? '自动检测'
    : sourceLang;

  const client = new ApiClient(baseUrl, apiKey);

  const userPrompt = `请将以下${sourceLangText}单词/短语翻译成${targetLang}。
如果可能，请提供：
1. 中文释义
2. 音标（如果是英文）
3. 词性
4. 例句

单词/短语：${word}`;

  const result = await client.chatCompletion({
    model,
    messages: [
      { role: 'system', content: '你是一个翻译助手，专注于单词和短语的翻译与解释。' },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    maxTokens: 1024,
    thinkingDisabled: !enableThinking,
  });

  return result;
}
