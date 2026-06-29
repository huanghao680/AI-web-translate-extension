let editingProfileId = null;

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

const modelSelect = () => document.getElementById('profileModel');
const modelCustom = () => document.getElementById('profileModelCustom');

function getModelValue() {
  const s = modelSelect().value;
  if (s) return s;
  return modelCustom().value.trim();
}

function setModelValue(val) {
  const opts = modelSelect().options;
  for (let i = 0; i < opts.length; i++) {
    if (opts[i].value === val) { modelSelect().value = val; modelCustom().style.display = 'none'; modelCustom().value = ''; return; }
  }
  modelSelect().value = '';
  modelCustom().style.display = 'block';
  modelCustom().value = val;
}

async function refreshProfileList() {
  const { profiles, activeProfileId } = await getProfiles();
  renderProfileList(profiles, activeProfileId);
}

function renderProfileList(profiles, activeProfileId) {
  const list = document.getElementById('profileList');
  if (!profiles || profiles.length === 0) {
    list.innerHTML = '<div class="profile-empty">暂无配置，点击下方按钮新建</div>';
    return;
  }
  list.innerHTML = profiles.map((p) => `
    <div class="profile-item ${p.id === activeProfileId ? 'profile-item--active' : ''}" data-id="${p.id}">
      <div class="profile-item-info">
        <span class="profile-item-name">${escHtml(p.name)}</span>
        <span class="profile-item-detail">${escHtml(p.model || '-')}</span>
      </div>
      <span class="profile-item-badge ${p.id === activeProfileId ? '' : 'profile-item-badge--hidden'}">使用中</span>
    </div>
  `).join('');

  list.querySelectorAll('.profile-item').forEach((el) => {
    el.addEventListener('click', async () => {
      const id = el.dataset.id;
      if (id === activeProfileId) {
        openEditor(id);
      } else {
        await setActiveProfile(id);
        await refreshProfileList();
        showSaveStatus('已切换配置', 'success');
      }
    });
  });
}

function openEditor(id) {
  getProfiles().then(({ profiles }) => {
    const p = profiles.find((pr) => pr.id === id);
    if (!p) return;
    editingProfileId = id;
    document.getElementById('profileEditor').style.display = 'block';
    document.getElementById('editorTitle').textContent = '编辑配置';
    document.getElementById('profileId').value = p.id;
    document.getElementById('profileName').value = p.name;
    document.getElementById('profileBaseUrl').value = p.baseUrl;
    document.getElementById('profileApiKey').value = p.apiKey;
    setModelValue(p.model);
    document.getElementById('deleteProfileBtn').style.display = 'inline-block';
  });
}

async function saveProfile() {
  const id = document.getElementById('profileId').value || genId();
  const name = document.getElementById('profileName').value.trim();
  const baseUrl = document.getElementById('profileBaseUrl').value.trim();
  const apiKey = document.getElementById('profileApiKey').value.trim();
  const model = getModelValue();

  if (!name) { showSaveStatus('请输入配置名称', 'error'); return; }
  if (!apiKey) { showSaveStatus('请输入 API Key', 'error'); return; }
  if (!baseUrl) { showSaveStatus('请输入 API Base URL', 'error'); return; }
  if (!model) { showSaveStatus('请输入模型名称', 'error'); return; }

  const { profiles, activeProfileId } = await getProfiles();
  const idx = profiles.findIndex((p) => p.id === id);
  const profile = { id, name, baseUrl, apiKey, model };

  if (idx >= 0) {
    profiles[idx] = profile;
  } else {
    profiles.push(profile);
  }

  const newActive = activeProfileId || id;
  await saveProfiles(profiles, newActive);
  showSaveStatus('配置已保存', 'success');
  closeEditor();
  await refreshProfileList();
}

async function deleteProfile() {
  const id = document.getElementById('profileId').value;
  const { profiles, activeProfileId } = await getProfiles();
  if (profiles.length <= 1) { showSaveStatus('至少保留一个配置', 'error'); return; }
  const filtered = profiles.filter((p) => p.id !== id);
  const newActive = id === activeProfileId ? filtered[0].id : activeProfileId;
  await saveProfiles(filtered, newActive);
  showSaveStatus('配置已删除', 'success');
  closeEditor();
  await refreshProfileList();
}

function closeEditor() {
  editingProfileId = null;
  document.getElementById('profileEditor').style.display = 'none';
}

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

document.addEventListener('DOMContentLoaded', async () => {
  await migrateOnce();

  const settings = await chrome.storage.sync.get({
    sourceLang: 'auto',
    targetLang: '中文',
    translationStyle: 'default',
    enableSelectionTranslation: true,
    enableThinking: false,
    autoTranslate: false,
    autoTranslateWithoutConfirm: false,
  });

  document.getElementById('sourceLang').value = settings.sourceLang;
  document.getElementById('targetLang').value = settings.targetLang;
  document.getElementById('translationStyle').value = settings.translationStyle;
  document.getElementById('enableSelectionTranslation').checked = settings.enableSelectionTranslation;
  document.getElementById('enableThinking').checked = settings.enableThinking;
  document.getElementById('autoTranslate').checked = settings.autoTranslate;
  document.getElementById('autoTranslateWithoutConfirm').checked = settings.autoTranslateWithoutConfirm;

  await refreshProfileList();
});

document.getElementById('addProfileBtn').addEventListener('click', () => {
  editingProfileId = null;
  document.getElementById('profileEditor').style.display = 'block';
  document.getElementById('editorTitle').textContent = '新建配置';
  document.getElementById('profileId').value = '';
  document.getElementById('profileName').value = '';
  document.getElementById('profileBaseUrl').value = '';
  document.getElementById('profileApiKey').value = '';
  setModelValue('');
  document.getElementById('deleteProfileBtn').style.display = 'none';
});

document.getElementById('saveProfileBtn').addEventListener('click', saveProfile);
document.getElementById('cancelProfileBtn').addEventListener('click', closeEditor);
document.getElementById('deleteProfileBtn').addEventListener('click', deleteProfile);

modelSelect().addEventListener('change', () => {
  if (modelSelect().value) { modelCustom().style.display = 'none'; }
  else { modelCustom().style.display = 'block'; modelCustom().focus(); }
});

document.getElementById('refreshProfileModels').addEventListener('click', async () => {
  const baseUrl = document.getElementById('profileBaseUrl').value.trim();
  const apiKey = document.getElementById('profileApiKey').value.trim();
  if (!baseUrl || !apiKey) { showSaveStatus('请先填写 Base URL 和 API Key', 'error'); return; }

  const btn = document.getElementById('refreshProfileModels');
  btn.textContent = '⏳'; btn.disabled = true;
  showSaveStatus('正在获取模型列表...', 'success');
  try {
    const client = new ApiClient(baseUrl, apiKey);
    const models = await client.listModels();
    const select = modelSelect();
    const cur = getModelValue();
    select.innerHTML = '<option value="">手动输入...</option>';
    models.forEach((m) => { const o = document.createElement('option'); o.value = m; o.textContent = m; select.appendChild(o); });
    setModelValue(cur);
    showSaveStatus(`已获取 ${models.length} 个模型`, 'success');
  } catch (err) { showSaveStatus(`获取失败: ${err.message}`, 'error'); }
  finally { btn.textContent = '🔄'; btn.disabled = false; }
});

document.getElementById('autoTranslate').addEventListener('change', () => {
  if (!document.getElementById('autoTranslate').checked) document.getElementById('autoTranslateWithoutConfirm').checked = false;
});
document.getElementById('autoTranslateWithoutConfirm').addEventListener('change', () => {
  if (document.getElementById('autoTranslateWithoutConfirm').checked) document.getElementById('autoTranslate').checked = true;
});

document.getElementById('saveBtn').addEventListener('click', async () => {
  const settings = {
    sourceLang: document.getElementById('sourceLang').value,
    targetLang: document.getElementById('targetLang').value,
    translationStyle: document.getElementById('translationStyle').value,
    enableSelectionTranslation: document.getElementById('enableSelectionTranslation').checked,
    enableThinking: document.getElementById('enableThinking').checked,
    autoTranslate: document.getElementById('autoTranslate').checked,
    autoTranslateWithoutConfirm: document.getElementById('autoTranslateWithoutConfirm').checked,
  };
  await chrome.storage.sync.set(settings);
  showSaveStatus('设置已保存', 'success');
});

document.getElementById('testBtn').addEventListener('click', async () => {
  const active = await getActiveProfile();
  if (!active || !active.apiKey) { showSaveStatus('请先在配置中填写 API Key', 'error'); return; }

  const btn = document.getElementById('testBtn');
  btn.disabled = true; btn.textContent = '测试中...';
  showSaveStatus('正在测试连接...', 'success');
  try {
    const enableThinking = document.getElementById('enableThinking').checked;
    const body = { model: active.model, messages: [{ role: 'user', content: 'Hello' }], max_tokens: 10, stream: false };
    if (!enableThinking) body.thinking = { type: 'disabled' };

    const resp = await fetch(`${active.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${active.apiKey}` }, body: JSON.stringify(body),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
    const data = await resp.json();
    const reply = data.choices?.[0]?.message?.content || '';
    showSaveStatus(`连接成功！响应: ${reply.substring(0, 50)}`, 'success');
  } catch (err) { showSaveStatus(`连接失败: ${err.message}`, 'error'); }
  finally { btn.disabled = false; btn.textContent = '测试连接'; }
});

function showSaveStatus(message, type) {
  const el = document.getElementById('saveStatus');
  el.textContent = message;
  el.className = `save-status ${type === 'error' ? 'save-status--error' : ''}`;
  clearTimeout(el._timeout);
  if (type === 'success') el._timeout = setTimeout(() => { el.textContent = ''; }, 3000);
}
