document.addEventListener('DOMContentLoaded', async () => {
  const settings = await chrome.storage.local.get({
    targetLang: '中文',
    apiKey: '',
    autoTranslate: false,
    autoTranslateWithoutConfirm: false,
    translationStyle: 'default',
    profiles: [],
    activeProfileId: '',
  });

  document.getElementById('currentTargetLang').textContent = settings.targetLang;
  document.getElementById('styleSelector').value = settings.translationStyle || 'default';

  const statusDot = document.getElementById('statusDot');
  if (settings.apiKey) {
    statusDot.className = 'status-dot status-dot--connected';
    statusDot.title = '已配置 API Key';
  } else {
    statusDot.className = 'status-dot status-dot--error';
    statusDot.title = '未配置 API Key';
  }

  document.getElementById('popupAutoTranslate').checked = settings.autoTranslate;

  const activeProfile = (settings.profiles || []).find((p) => p.id === settings.activeProfileId);

  const sel = document.getElementById('profileSelector');
  sel.innerHTML = (settings.profiles || []).map((p) =>
    `<option value="${p.id}" ${p.id === settings.activeProfileId ? 'selected' : ''}>${escHtml(p.name)} — ${escHtml(p.model)}</option>`
  ).join('') || '<option value="">未配置</option>';

  const currentModel = document.getElementById('currentModel');
  currentModel.textContent = activeProfile ? activeProfile.model : '-';

  sel.addEventListener('change', async () => {
    const id = sel.value;
    if (id) {
      await setActiveProfile(id);
      const updated = await chrome.storage.local.get({ profiles: [], activeProfileId: '' });
      const p = (updated.profiles || []).find((pr) => pr.id === id);
      currentModel.textContent = p ? p.model : '-';
      showPopupNotification(`已切换到 ${p ? p.name : ''}`);
    }
  });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const pageState = { translated: false, displayMode: 'original', blockSelectActive: false, selectionModeActive: false };

  if (tab && tab.id) {
    try {
      const state = await chrome.tabs.sendMessage(tab.id, { type: 'GET_STATE' });
      pageState.translated = !!state.translated;
      pageState.displayMode = state.displayMode || 'original';
      pageState.blockSelectActive = !!state.blockSelectActive;
      pageState.selectionModeActive = !!state.selectionModeActive;
    } catch {
      // content script not reachable
    }
  }

  updateAllButtons(pageState);

  document.getElementById('translateFullPage').addEventListener('click', async () => {
    if (!tab || !tab.id) { showPopupNotification('未找到活动标签页'); return; }
    try { await chrome.tabs.sendMessage(tab.id, { type: 'TRANSLATE_FULL_PAGE' }); }
    catch { showPopupNotification('无法连接页面，请刷新后重试'); }
    window.close();
  });

  document.getElementById('translateSelection').addEventListener('click', async () => {
    if (!tab || !tab.id) return;
    try { await chrome.tabs.sendMessage(tab.id, { type: 'START_SELECTION_MODE' }); }
    catch { showPopupNotification('无法连接页面，请刷新后重试'); }
    window.close();
  });

  document.getElementById('translateBlock').addEventListener('click', async () => {
    if (!tab || !tab.id) return;
    try { await chrome.tabs.sendMessage(tab.id, { type: 'START_BLOCK_SELECTION' }); }
    catch { showPopupNotification('无法连接页面，请刷新后重试'); }
    window.close();
  });

  document.getElementById('translateSummary').addEventListener('click', async () => {
    if (!tab || !tab.id) return;
    try { await chrome.tabs.sendMessage(tab.id, { type: 'TRANSLATE_SUMMARY' }); }
    catch { showPopupNotification('无法连接页面，请刷新后重试'); }
    window.close();
  });

  document.getElementById('toggleTranslation').addEventListener('click', async () => {
    if (!tab || !tab.id) return;
    pageState.displayMode = pageState.displayMode === 'translated' ? 'original' : 'translated';
    updateAllButtons(pageState);
    try { await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_TRANSLATION' }); }
    catch { showPopupNotification('无法连接页面，请刷新后重试'); }
    window.close();
  });

  document.getElementById('popupAutoTranslate').addEventListener('change', async (e) => {
    await chrome.storage.local.set({ autoTranslate: e.target.checked });
    if (tab && tab.id) chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_SETTINGS', settings: { autoTranslate: e.target.checked } });
  });

  document.getElementById('styleSelector').addEventListener('change', async (e) => {
    await chrome.storage.local.set({ translationStyle: e.target.value });
  });

  document.getElementById('openOptions').addEventListener('click', (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); });

  const logs = await ErrorLog.getAll();
  if (logs.length > 0) {
    const section = document.getElementById('errorLogSection');
    const count = document.getElementById('errorCount');
    const body = document.getElementById('errorLogBody');
    section.style.display = 'block';
    count.textContent = logs.length;

    body.innerHTML = logs.slice(0, 10).map((l) => `
      <div class="error-log-entry">
        <div class="error-log-entry-time">${new Date(l.timestamp).toLocaleString()}</div>
        <div class="error-log-entry-msg">${escHtml(l.message || '')}</div>
        ${l.status ? `<div class="error-log-entry-detail">HTTP ${l.status} ${l.statusText || ''}</div>` : ''}
        ${l.responseBody ? `<div class="error-log-entry-detail">响应: ${escHtml(l.responseBody.slice(0, 300))}</div>` : ''}
        ${l.requestBody ? `<div class="error-log-entry-detail">请求: ${escHtml(l.requestBody.slice(0, 300))}</div>` : ''}
      </div>
    `).join('') + '<button class="error-log-clear" id="clearErrorLog">清除所有日志</button>';

    document.getElementById('clearErrorLog').addEventListener('click', async () => {
      await ErrorLog.clear();
      section.style.display = 'none';
    });

    document.getElementById('errorLogToggle').addEventListener('click', () => {
      const arrow = document.querySelector('.error-log-arrow');
      const b = document.getElementById('errorLogBody');
      const isOpen = b.style.display === 'block';
      b.style.display = isOpen ? 'none' : 'block';
      if (arrow) arrow.classList.toggle('error-log-arrow--open', !isOpen);
    });
  }
});

function updateAllButtons(state) {
  const fullPage = document.getElementById('translateFullPage');
  const selection = document.getElementById('translateSelection');
  const block = document.getElementById('translateBlock');
  const toggle = document.getElementById('toggleTranslation');
  const toggleIcon = document.getElementById('toggleIcon');
  const toggleLabel = document.getElementById('toggleLabel');

  fullPage.className = 'btn ' + (state.translated ? 'btn-secondary' : 'btn-primary');
  selection.className = 'btn ' + (state.selectionModeActive ? 'btn-primary' : 'btn-secondary');
  block.className = 'btn ' + (state.blockSelectActive ? 'btn-primary' : 'btn-secondary');

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

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
