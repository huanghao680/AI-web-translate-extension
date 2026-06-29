let _messages = null;

async function initI18n() {
  const { language } = await chrome.storage.local.get({ language: 'auto' });
  if (language && language !== 'auto') {
    try {
      const url = chrome.runtime.getURL(`_locales/${language}/messages.json`);
      const resp = await fetch(url);
      _messages = await resp.json();
    } catch {}
  } else {
    _messages = null;
  }
}

function __(key, ...args) {
  let msg;
  if (_messages && _messages[key]) {
    msg = _messages[key].message;
  } else {
    try { msg = chrome.i18n.getMessage(key); } catch {}
  }
  if (!msg) msg = key;
  if (args.length > 0) args.forEach((val, i) => { msg = msg.replace(`{${i}}`, val); });
  return msg;
}

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = __(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = __(el.getAttribute('data-i18n-placeholder'));
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = __(el.getAttribute('data-i18n-title'));
  });
}
