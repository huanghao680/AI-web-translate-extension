class ApiClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async listModels() {
    const url = `${this.baseUrl.replace(/\/+$/, '')}/models`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
    });
    if (!response.ok) {
      const body = await response.text();
      ErrorLog.add({ type: 'api_error', baseUrl: this.baseUrl, url, status: response.status, statusText: response.statusText, responseBody: body, message: `获取模型列表失败: ${body}` });
      throw new Error(`获取模型列表失败 (${response.status}): ${body}`);
    }
    const data = await response.json();
    return (data.data || []).map((m) => m.id).sort();
  }

  async _request(url, body) {
    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
        body: JSON.stringify(body),
      });
    } catch (netErr) {
      ErrorLog.add({ type: 'network_error', baseUrl: this.baseUrl, url, message: `网络请求失败: ${netErr.message}` });
      throw new Error(`网络请求失败: ${netErr.message}`);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      ErrorLog.add({
        type: 'api_error', baseUrl: this.baseUrl, url, model: body.model,
        status: response.status, statusText: response.statusText, responseBody: errorBody,
        requestBody: JSON.stringify({ ...body, messages: '(truncated)' }),
        message: `API ${response.status}: ${errorBody.slice(0, 500)}`,
      });
      throw new Error(`API 请求失败 (${response.status}): ${errorBody}`);
    }
    return response;
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

    const response = await this._request(url, body);

    if (stream) {
      return this._handleStream(response);
    }

    const data = await response.json();
    if (data.usage) await TokenUsage.record(data.usage);
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

    const response = await this._request(url, body);

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
