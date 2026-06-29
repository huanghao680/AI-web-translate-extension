document.addEventListener('DOMContentLoaded', async () => {
  const settings = await chrome.storage.sync.get({
    baseUrl: 'https://api.deepseek.com',
    apiKey: '',
    model: 'deepseek-v4-flash',
    sourceLang: 'auto',
    targetLang: '中文',
    translationStyle: 'default',
    enableSelectionTranslation: true,
    enableThinking: false,
    autoTranslate: false,
    autoTranslateWithoutConfirm: false,
  });

  document.getElementById('baseUrl').value = settings.baseUrl;
  document.getElementById('apiKey').value = settings.apiKey;
  document.getElementById('model').value = settings.model;
  document.getElementById('sourceLang').value = settings.sourceLang;
  document.getElementById('targetLang').value = settings.targetLang;
  document.getElementById('translationStyle').value = settings.translationStyle;
  document.getElementById('enableSelectionTranslation').checked = settings.enableSelectionTranslation;
  document.getElementById('enableThinking').checked = settings.enableThinking;
  document.getElementById('autoTranslate').checked = settings.autoTranslate;
  document.getElementById('autoTranslateWithoutConfirm').checked = settings.autoTranslateWithoutConfirm;
});

document.getElementById('autoTranslate').addEventListener('change', () => {
  if (!document.getElementById('autoTranslate').checked) {
    document.getElementById('autoTranslateWithoutConfirm').checked = false;
  }
});

document.getElementById('autoTranslateWithoutConfirm').addEventListener('change', () => {
  if (document.getElementById('autoTranslateWithoutConfirm').checked) {
    document.getElementById('autoTranslate').checked = true;
  }
});

document.getElementById('saveBtn').addEventListener('click', async () => {
  const settings = {
    baseUrl: document.getElementById('baseUrl').value.trim(),
    apiKey: document.getElementById('apiKey').value.trim(),
    model: document.getElementById('model').value.trim(),
    sourceLang: document.getElementById('sourceLang').value,
    targetLang: document.getElementById('targetLang').value,
    translationStyle: document.getElementById('translationStyle').value,
    enableSelectionTranslation: document.getElementById('enableSelectionTranslation').checked,
    enableThinking: document.getElementById('enableThinking').checked,
    autoTranslate: document.getElementById('autoTranslate').checked,
    autoTranslateWithoutConfirm: document.getElementById('autoTranslateWithoutConfirm').checked,
  };

  if (!settings.apiKey) {
    showSaveStatus('请填写 API Key', 'error');
    return;
  }

  if (!settings.baseUrl) {
    showSaveStatus('请填写 API Base URL', 'error');
    return;
  }

  if (!settings.model) {
    showSaveStatus('请填写模型名称', 'error');
    return;
  }

  await chrome.storage.sync.set(settings);
  showSaveStatus('设置已保存', 'success');
});

document.getElementById('testBtn').addEventListener('click', async () => {
  const baseUrl = document.getElementById('baseUrl').value.trim();
  const apiKey = document.getElementById('apiKey').value.trim();
  const model = document.getElementById('model').value.trim();

  if (!apiKey) {
    showSaveStatus('请先填写 API Key', 'error');
    return;
  }

  const testBtn = document.getElementById('testBtn');
  testBtn.disabled = true;
  testBtn.textContent = '测试中...';
  showSaveStatus('正在测试连接...', 'success');

  try {
    const enableThinking = document.getElementById('enableThinking').checked;
    const testBody = {
      model,
      messages: [
        { role: 'user', content: 'Hello' },
      ],
      max_tokens: 10,
      stream: false,
    };
    if (!enableThinking) testBody.thinking = { type: 'disabled' };

    const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(testBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || '';
    showSaveStatus(`连接成功！响应: ${reply.substring(0, 50)}`, 'success');
  } catch (error) {
    showSaveStatus(`连接失败: ${error.message}`, 'error');
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = '测试连接';
  }
});

function showSaveStatus(message, type) {
  const status = document.getElementById('saveStatus');
  status.textContent = message;
  status.className = `save-status ${type === 'error' ? 'save-status--error' : ''}`;

  clearTimeout(status._timeout);
  if (type === 'success') {
    status._timeout = setTimeout(() => {
      status.textContent = '';
    }, 3000);
  }
}
