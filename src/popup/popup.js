document.addEventListener('DOMContentLoaded', async () => {
  const settings = await chrome.storage.sync.get({
    model: 'deepseek-v4-flash',
    targetLang: '中文',
    apiKey: '',
    autoTranslate: false,
    autoTranslateWithoutConfirm: false,
  });

  document.getElementById('currentModel').textContent = settings.model;
  document.getElementById('currentTargetLang').textContent = settings.targetLang;

  const statusDot = document.getElementById('statusDot');
  if (settings.apiKey) {
    statusDot.className = 'status-dot status-dot--connected';
    statusDot.title = '已配置 API Key';
  } else {
    statusDot.className = 'status-dot status-dot--error';
    statusDot.title = '未配置 API Key';
  }

  document.getElementById('popupAutoTranslate').checked = settings.autoTranslate;
  document.getElementById('popupAutoTranslateNoConfirm').checked = settings.autoTranslateWithoutConfirm;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const pageState = { translated: false, displayMode: 'original', blockSelectActive: false };

  if (tab && tab.id) {
    try {
      const state = await chrome.tabs.sendMessage(tab.id, { type: 'GET_STATE' });
      pageState.translated = !!state.translated;
      pageState.displayMode = state.displayMode || 'original';
      pageState.blockSelectActive = !!state.blockSelectActive;
    } catch {
      // content script not reachable
    }
  }

  updateAllButtons(pageState);

  document.getElementById('translateFullPage').addEventListener('click', async () => {
    if (!tab || !tab.id) {
      showPopupNotification('未找到活动标签页');
      return;
    }
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'TRANSLATE_FULL_PAGE' });
    } catch {
      showPopupNotification('无法连接页面，请刷新后重试');
    }
    window.close();
  });

  document.getElementById('translateSelection').addEventListener('click', async () => {
    if (!tab || !tab.id) return;
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'TRANSLATE_SELECTION' });
    } catch {
      showPopupNotification('无法连接页面，请刷新后重试');
    }
    window.close();
  });

  document.getElementById('translateBlock').addEventListener('click', async () => {
    if (!tab || !tab.id) return;
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'START_BLOCK_SELECTION' });
    } catch {
      showPopupNotification('无法连接页面，请刷新后重试');
    }
    window.close();
  });

  document.getElementById('toggleTranslation').addEventListener('click', async () => {
    if (!tab || !tab.id) return;
    pageState.displayMode = pageState.displayMode === 'translated' ? 'original' : 'translated';
    updateAllButtons(pageState);
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_TRANSLATION' });
    } catch {
      showPopupNotification('无法连接页面，请刷新后重试');
    }
    window.close();
  });

  document.getElementById('popupAutoTranslate').addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    await chrome.storage.sync.set({ autoTranslate: enabled });
    if (!enabled) {
      document.getElementById('popupAutoTranslateNoConfirm').checked = false;
      await chrome.storage.sync.set({ autoTranslateWithoutConfirm: false });
    }
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'UPDATE_SETTINGS',
        settings: { autoTranslate: enabled, autoTranslateWithoutConfirm: enabled ? document.getElementById('popupAutoTranslateNoConfirm').checked : false },
      });
    }
  });

  document.getElementById('popupAutoTranslateNoConfirm').addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    await chrome.storage.sync.set({ autoTranslateWithoutConfirm: enabled });
    if (enabled) {
      document.getElementById('popupAutoTranslate').checked = true;
      await chrome.storage.sync.set({ autoTranslate: true });
    }
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'UPDATE_SETTINGS',
        settings: { autoTranslate: true, autoTranslateWithoutConfirm: enabled },
      });
    }
  });

  document.getElementById('openOptions').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
});

function updateAllButtons(state) {
  const fullPage = document.getElementById('translateFullPage');
  const selection = document.getElementById('translateSelection');
  const block = document.getElementById('translateBlock');
  const toggle = document.getElementById('toggleTranslation');
  const toggleIcon = document.getElementById('toggleIcon');
  const toggleLabel = document.getElementById('toggleLabel');

  // 翻译整页: primary if not translated yet
  fullPage.className = 'btn ' + (state.translated ? 'btn-secondary' : 'btn-primary');

  // 翻译选中: always secondary
  selection.className = 'btn btn-secondary';

  // 选择块翻译: active if in block selection mode
  block.className = 'btn ' + (state.blockSelectActive ? 'btn-primary' : 'btn-secondary');

  // 切换原文/译文
  if (!state.translated) {
    toggle.className = 'btn btn-disabled';
    toggleIcon.textContent = '↩️';
    toggleLabel.textContent = '恢复原文';
  } else if (state.displayMode === 'translated') {
    toggle.className = 'btn btn-active';
    toggleIcon.textContent = '🔄';
    toggleLabel.textContent = '切换原文';
  } else {
    toggle.className = 'btn btn-active';
    toggleIcon.textContent = '🔄';
    toggleLabel.textContent = '切换译文';
  }
}

function showPopupNotification(msg) {
  const status = document.getElementById('statusDot');
  status.className = 'status-dot status-dot--error';
  status.title = msg;
}
