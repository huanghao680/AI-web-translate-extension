const TokenUsage = {
  async record(usage) {
    if (!usage || typeof usage.total_tokens !== 'number') return;
    const stats = await this.getStats();
    stats.last = { prompt: usage.prompt_tokens || 0, completion: usage.completion_tokens || 0, total: usage.total_tokens || 0 };
    stats.cumulative.prompt += stats.last.prompt;
    stats.cumulative.completion += stats.last.completion;
    stats.cumulative.total += stats.last.total;
    await chrome.storage.local.set({ tokenUsage: stats });
  },

  async getStats() {
    const { tokenUsage } = await chrome.storage.local.get({ tokenUsage: null });
    return tokenUsage || { last: { prompt: 0, completion: 0, total: 0 }, cumulative: { prompt: 0, completion: 0, total: 0 } };
  },

  async reset() {
    await chrome.storage.local.set({ tokenUsage: { last: { prompt: 0, completion: 0, total: 0 }, cumulative: { prompt: 0, completion: 0, total: 0 } } });
  },
};
