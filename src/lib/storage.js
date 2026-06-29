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
  [STORAGE_KEYS.PROFILES]: [],
  [STORAGE_KEYS.ACTIVE_PROFILE_ID]: '',
};

async function getSettings() {
  const result = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  const settings = { ...DEFAULT_SETTINGS, ...result };
  migrateProfiles(settings);
  return settings;
}

async function saveSettings(settings) {
  syncActiveProfile(settings);
  await chrome.storage.sync.set(settings);
}

async function getSetting(key) {
  const settings = await getSettings();
  return settings[key];
}

async function saveSetting(key, value) {
  await chrome.storage.sync.set({ [key]: value });
}

function migrateProfiles(settings) {
  if (!settings.profiles || settings.profiles.length === 0) {
    if (settings.apiKey) {
      settings.profiles = [{
        id: 'default',
        name: '默认配置',
        baseUrl: settings.baseUrl,
        apiKey: settings.apiKey,
        model: settings.model,
      }];
      settings.activeProfileId = 'default';
    }
  }
}

function syncActiveProfile(settings) {
  const { profiles, activeProfileId } = settings;
  if (!profiles || profiles.length === 0 || !activeProfileId) return;
  const profile = profiles.find((p) => p.id === activeProfileId);
  if (profile) {
    settings.baseUrl = profile.baseUrl;
    settings.apiKey = profile.apiKey;
    settings.model = profile.model;
  }
}

async function getActiveProfile() {
  const settings = await getSettings();
  const { profiles, activeProfileId } = settings;
  return (profiles || []).find((p) => p.id === activeProfileId) || null;
}

async function setActiveProfile(profileId) {
  const settings = await getSettings();
  settings.activeProfileId = profileId;
  await saveSettings(settings);
}

async function saveProfiles(profiles, activeProfileId) {
  const settings = await getSettings();
  settings.profiles = profiles;
  settings.activeProfileId = activeProfileId;
  await saveSettings(settings);
}
