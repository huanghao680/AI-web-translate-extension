const TokenUsage = {
  _session: null,

  async record(usage) {
    if (!usage || typeof usage.total_tokens !== 'number') return;
    const stats = await this._get();
    const batch = { prompt: usage.prompt_tokens || 0, completion: usage.completion_tokens || 0, total: usage.total_tokens || 0 };
    stats.cumulative.prompt += batch.prompt;
    stats.cumulative.completion += batch.completion;
    stats.cumulative.total += batch.total;
    if (this._session) {
      this._session.prompt += batch.prompt;
      this._session.completion += batch.completion;
      this._session.total += batch.total;
    } else {
      stats.last = { ...batch };
    }
    await chrome.storage.local.set({ tokenUsage: stats });
  },

  startSession() {
    this._session = { prompt: 0, completion: 0, total: 0 };
  },

  async endSession() {
    if (!this._session) return;
    const s = this._session;
    this._session = null;
    const stats = await this._get();
    stats.last = { ...s };
    await chrome.storage.local.set({ tokenUsage: stats });
  },

  async getStats() {
    const stats = await this._get();
    if (this._session) {
      return { last: { ...this._session }, cumulative: { ...stats.cumulative } };
    }
    return stats;
  },

  async _get() {
    const { tokenUsage } = await chrome.storage.local.get({ tokenUsage: null });
    return tokenUsage || { last: { prompt: 0, completion: 0, total: 0 }, cumulative: { prompt: 0, completion: 0, total: 0 } };
  },

  async reset() {
    await chrome.storage.local.set({ tokenUsage: { last: { prompt: 0, completion: 0, total: 0 }, cumulative: { prompt: 0, completion: 0, total: 0 } } });
  },
};
