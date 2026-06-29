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
  AUTO_TRANSLATE_WITHOUT_CONFIRM: 'autoTranslateWithoutConfirm',
  PROFILES: 'profiles',
  ACTIVE_PROFILE_ID: 'activeProfileId',
  MIGRATED: 'profilesMigrated',
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
  [STORAGE_KEYS.AUTO_TRANSLATE_WITHOUT_CONFIRM]: false,
};

async function getSettings() {
  const result = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...result };
}

async function saveSettings(settings) {
  await chrome.storage.sync.set(settings);
}

async function getSetting(key) {
  const settings = await getSettings();
  return settings[key];
}

async function saveSetting(key, value) {
  await chrome.storage.sync.set({ [key]: value });
}

async function migrateOnce() {
  const { profilesMigrated, apiKey, baseUrl, model } = await chrome.storage.sync.get({
    profilesMigrated: false,
    apiKey: '',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-v4-flash',
  });
  if (!profilesMigrated && apiKey) {
    const defaultProfile = {
      id: 'default',
      name: '默认配置',
      baseUrl: baseUrl,
      apiKey: apiKey,
      model: model,
    };
    await chrome.storage.sync.set({
      profiles: [defaultProfile],
      activeProfileId: 'default',
      profilesMigrated: true,
    });
  } else if (!profilesMigrated) {
    await chrome.storage.sync.set({ profilesMigrated: true });
  }
}

async function getProfiles() {
  const { profiles, activeProfileId } = await chrome.storage.sync.get({ profiles: [], activeProfileId: '' });
  return { profiles: profiles || [], activeProfileId: activeProfileId || '' };
}

function ensureProfileDefaults(p) {
  if (p.maxTokens == null) p.maxTokens = 32768;
  return p;
}

async function saveProfiles(profiles, activeProfileId) {
  profiles = (profiles || []).map(ensureProfileDefaults);
  await chrome.storage.sync.set({ profiles, activeProfileId });
  const active = profiles.find((p) => p.id === activeProfileId);
  if (active) {
    await chrome.storage.sync.set({
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

async function getActiveProfile() {
  const { profiles, activeProfileId } = await getProfiles();
  return (profiles || []).find((p) => p.id === activeProfileId) || null;
}

async function setActiveProfile(profileId) {
  const { profiles } = await getProfiles();
  await saveProfiles(profiles, profileId);
}
