const STORAGE_KEYS = {
  API_KEY: 'apiKey',
  BASE_URL: 'baseUrl',
  MODEL: 'model',
  SOURCE_LANG: 'sourceLang',
  TARGET_LANG: 'targetLang',
  AUTO_DETECT: 'autoDetect',
  TRANSLATION_STYLE: 'translationStyle',
  ENABLE_SELECTION_TRANSLATION: 'enableSelectionTranslation',
  ENABLE_THINKING: 'enableThinking',
  AUTO_TRANSLATE: 'autoTranslate',
  AUTO_TRANSLATE_ACTION: 'autoTranslateAction',
  LANGUAGE: 'language',
  PROFILES: 'profiles',
  ACTIVE_PROFILE_ID: 'activeProfileId',
  MIGRATED: 'profilesMigrated',
  LOCAL_MIGRATED: 'localMigrated',
};

const DEFAULT_SETTINGS = {
  [STORAGE_KEYS.API_KEY]: '',
  [STORAGE_KEYS.BASE_URL]: 'https://api.deepseek.com',
  [STORAGE_KEYS.MODEL]: 'deepseek-v4-flash',
  [STORAGE_KEYS.SOURCE_LANG]: 'auto',
  [STORAGE_KEYS.TARGET_LANG]: '中文',
  [STORAGE_KEYS.AUTO_DETECT]: true,
  [STORAGE_KEYS.TRANSLATION_STYLE]: 'default',
  [STORAGE_KEYS.ENABLE_SELECTION_TRANSLATION]: true,
  [STORAGE_KEYS.ENABLE_THINKING]: false,
  [STORAGE_KEYS.AUTO_TRANSLATE]: false,
  [STORAGE_KEYS.AUTO_TRANSLATE_ACTION]: 'full',
  [STORAGE_KEYS.LANGUAGE]: 'auto',
};

const STORE = chrome.storage.local;

async function migrateSyncToLocal() {
  const { localMigrated } = await STORE.get({ localMigrated: false });
  if (localMigrated) return;

  const syncData = await chrome.storage.sync.get(null);
  if (syncData && Object.keys(syncData).length > 0) {
    await STORE.set(syncData);
  }
  await STORE.set({ localMigrated: true });
}

async function getSettings() {
  const result = await STORE.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...result };
}

async function saveSettings(settings) {
  await STORE.set(settings);
}

async function getSetting(key) {
  const settings = await getSettings();
  return settings[key];
}

async function saveSetting(key, value) {
  await STORE.set({ [key]: value });
}

async function migrateOnce() {
  const { profilesMigrated, apiKey, baseUrl, model } = await STORE.get({
    profilesMigrated: false,
    apiKey: '',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-v4-flash',
  });
  if (!profilesMigrated && apiKey) {
    const defaultProfile = {
      id: 'default',
      name: '默认配置',
      baseUrl,
      apiKey,
      model,
    };
    await STORE.set({
      profiles: [defaultProfile],
      activeProfileId: 'default',
      profilesMigrated: true,
    });
  } else if (!profilesMigrated) {
    await STORE.set({ profilesMigrated: true });
  }
}

async function getProfiles() {
  const { profiles, activeProfileId } = await STORE.get({ profiles: [], activeProfileId: '' });
  return { profiles: Array.isArray(profiles) ? profiles : [], activeProfileId: activeProfileId || '' };
}

function ensureProfileDefaults(p) {
  if (p.maxTokens == null) p.maxTokens = 32768;
  return p;
}

async function saveProfiles(profiles, activeProfileId) {
  profiles = (Array.isArray(profiles) ? profiles : []).map(ensureProfileDefaults);
  await STORE.set({ profiles, activeProfileId });
  const active = profiles.find((p) => p.id === activeProfileId);
  if (active) {
    await STORE.set({
      apiKey: active.apiKey,
      baseUrl: active.baseUrl,
      model: active.model,
    });
  }
}

async function getActiveProfile() {
  const { profiles, activeProfileId } = await getProfiles();
  const p = (profiles || []).find((pr) => pr.id === activeProfileId);
  return p ? ensureProfileDefaults(p) : null;
}

async function setActiveProfile(profileId) {
  const { profiles } = await getProfiles();
  await saveProfiles(profiles, profileId);
}

async function exportConfig() {
  const all = await STORE.get(null);
  const { errorLog, ...config } = all;
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ai-translator-config-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importConfig(jsonText) {
  let data;
  try {
    data = JSON.parse(jsonText);
  } catch {
    throw new Error('JSON 格式无效');
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('无效的配置文件');
  if (data.profiles !== undefined && !Array.isArray(data.profiles)) throw new Error('profiles 字段格式无效');
  if (data.profiles) {
    for (const p of data.profiles) {
      if (typeof p.id !== 'string' || typeof p.name !== 'string' || typeof p.baseUrl !== 'string' || typeof p.apiKey !== 'string' || typeof p.model !== 'string') {
        throw new Error(`配置 "${p.name || '未知'}" 字段不完整`);
      }
    }
  }
  await STORE.set(data);
}
