function __(key, ...args) {
  let msg;
  try { msg = chrome.i18n.getMessage(key); } catch {}
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
