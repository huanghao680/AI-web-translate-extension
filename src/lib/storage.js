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
