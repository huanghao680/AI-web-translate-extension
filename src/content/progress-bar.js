class TranslationProgressBar {
  constructor() {
    this.element = null;
    this.cancelCallback = null;
    this._timer = null;
  }

  show(title) {
    this._clearTimer();
    this.destroy();

    const el = document.createElement('div');
    el.className = 'ai-translator-progress';
    el.innerHTML = `
      <div class="ai-translator-progress-header">
        <div class="ai-translator-progress-title">
          <span class="ai-translator-tooltip-spinner"></span>
          <span class="ai-translator-progress-title-text">${this._escapeHtml(title)}</span>
        </div>
        <div class="ai-translator-progress-percentage">0%</div>
      </div>
      <div class="ai-translator-progress-track">
        <div class="ai-translator-progress-bar" style="width: 0%"></div>
      </div>
      <div class="ai-translator-progress-subtitle">
        <span class="ai-translator-progress-status">准备中...</span>
        <button class="ai-translator-progress-cancel">取消</button>
      </div>
    `;

    el.querySelector('.ai-translator-progress-cancel').addEventListener('click', () => {
      if (this.cancelCallback) this.cancelCallback();
      this.hide();
    });

    document.body.appendChild(el);

    requestAnimationFrame(() => {
      el.classList.add('ai-translator-progress--visible');
    });

    this.element = el;
  }

  update(current, total, statusText) {
    if (!this.element) return;

    const pct = total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 0;
    const bar = this.element.querySelector('.ai-translator-progress-bar');
    const pctEl = this.element.querySelector('.ai-translator-progress-percentage');
    const statusEl = this.element.querySelector('.ai-translator-progress-status');

    if (bar) bar.style.width = `${pct}%`;
    if (pctEl) pctEl.textContent = `${pct}%`;
    if (statusEl) statusEl.textContent = statusText || '';
  }

  complete(message) {
    if (!this.element) return;
    this._clearTimer();
    const bar = this.element.querySelector('.ai-translator-progress-bar');
    const pctEl = this.element.querySelector('.ai-translator-progress-percentage');
    const statusEl = this.element.querySelector('.ai-translator-progress-status');
    const titleEl = this.element.querySelector('.ai-translator-progress-title-text');
    const spinner = this.element.querySelector('.ai-translator-tooltip-spinner');
    const cancelBtn = this.element.querySelector('.ai-translator-progress-cancel');

    if (bar) {
      bar.style.width = '100%';
      bar.classList.add('ai-translator-progress-bar--complete');
    }
    if (pctEl) pctEl.textContent = '100%';
    if (statusEl) statusEl.textContent = message || '完成';
    if (titleEl) titleEl.textContent = message || '翻译完成';
    if (spinner) spinner.remove();
    if (cancelBtn) cancelBtn.remove();

    this._timer = setTimeout(() => this.hide(), 2000);
  }

  error(message) {
    if (!this.element) return;
    this._clearTimer();
    const bar = this.element.querySelector('.ai-translator-progress-bar');
    const statusEl = this.element.querySelector('.ai-translator-progress-status');
    const titleEl = this.element.querySelector('.ai-translator-progress-title-text');
    const spinner = this.element.querySelector('.ai-translator-tooltip-spinner');
    const cancelBtn = this.element.querySelector('.ai-translator-progress-cancel');

    if (bar) {
      bar.classList.add('ai-translator-progress-bar--error');
    }
    if (statusEl) statusEl.textContent = message || '翻译失败';
    if (titleEl) titleEl.textContent = '翻译失败';
    if (spinner) spinner.remove();
    if (cancelBtn) cancelBtn.remove();

    this._timer = setTimeout(() => this.hide(), 4000);
  }

  hide() {
    this._clearTimer();
    if (!this.element) return;
    this.element.classList.remove('ai-translator-progress--visible');
    this._timer = setTimeout(() => this.destroy(), 300);
  }

  destroy() {
    this._clearTimer();
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
    this.cancelCallback = null;
  }

  setCancelCallback(fn) {
    this.cancelCallback = fn;
  }

  _clearTimer() {
    if (this._timer !== null) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
