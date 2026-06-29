chrome.runtime.onInstalled.addListener(() => {
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'API_FETCH') {
    (async () => {
      try {
        const response = await fetch(message.url, {
          method: message.method || 'POST',
          headers: message.headers || {},
          body: message.body || null,
        });
        const text = await response.text();
        sendResponse({ ok: response.ok, status: response.status, statusText: response.statusText, body: text });
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
    })();
    return true;
  }
});
