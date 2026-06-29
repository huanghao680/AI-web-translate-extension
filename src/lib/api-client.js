class ApiClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async chatCompletion({ model, messages, stream = false, temperature = 0.3, maxTokens = 4096, thinkingDisabled = true }) {
    const url = `${this.baseUrl.replace(/\/+$/, '')}/chat/completions`;

    const body = {
      model,
      messages,
      stream,
      temperature,
      max_tokens: maxTokens,
    };
    if (thinkingDisabled) body.thinking = { type: 'disabled' };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API 请求失败 (${response.status}): ${errorBody}`);
    }

    if (stream) {
      return this._handleStream(response);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async *streamChatCompletion({ model, messages, temperature = 0.3, maxTokens = 4096, thinkingDisabled = true }) {
    const url = `${this.baseUrl.replace(/\/+$/, '')}/chat/completions`;

    const body = {
      model,
      messages,
      stream: true,
      temperature,
      max_tokens: maxTokens,
    };
    if (thinkingDisabled) body.thinking = { type: 'disabled' };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API 请求失败 (${response.status}): ${errorBody}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data: ')) continue;

        try {
          const json = JSON.parse(trimmed.slice(6));
          const content = json.choices?.[0]?.delta?.content || '';
          if (content) yield content;
        } catch {
          // skip malformed chunks
        }
      }
    }
  }
}
