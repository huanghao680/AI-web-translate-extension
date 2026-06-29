const ErrorLog = {
  async add(entry) {
    const logs = await this.getAll();
    logs.unshift({ ...entry, timestamp: Date.now() });
    if (logs.length > 200) logs.length = 200;
    await chrome.storage.local.set({ errorLog: logs });
  },

  async getAll() {
    const { errorLog } = await chrome.storage.local.get({ errorLog: [] });
    return errorLog;
  },

  async clear() {
    await chrome.storage.local.set({ errorLog: [] });
  },
};
