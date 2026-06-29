class SelectionTooltip {
  constructor() {
    this.element = null;
    this.selectedText = '';
    this.timer = null;
  }

  show(x, y, text) {
    this.selectedText = text;
    clearTimeout(this.timer);

    if (!this.element) {
      this.element = this._createTooltip();
      document.body.appendChild(this.element);
    }

    this.element.querySelector('.ai-translator-tooltip-body').innerHTML =
      '<div class="ai-translator-tooltip-loading"><span class="ai-translator-tooltip-spinner"></span>' + __('translating') + '</div>';

    this.element.style.display = 'block';

    let left = x + 10;
    let top = y + 10;

    const rect = this.element.getBoundingClientRect();
    if (left + rect.width > window.innerWidth) {
      left = x - rect.width - 10;
    }
    if (top + rect.height > window.innerHeight) {
      top = y - rect.height - 10;
    }

    this.element.style.left = `${Math.max(0, left)}px`;
    this.element.style.top = `${Math.max(0, top)}px`;

    this._fetchTranslation();
  }

  hide() {
    this.timer = setTimeout(() => {
      if (this.element) {
        this.element.style.display = 'none';
      }
    }, 200);
  }

  destroy() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }

  _createTooltip() {
    const tooltip = document.createElement('div');
    tooltip.className = 'ai-translator-tooltip';
    tooltip.innerHTML = `
      <div class="ai-translator-tooltip-header">
        <span>${__('btnTranslate')}</span>
        <button class="ai-translator-tooltip-close">&times;</button>
      </div>
      <div class="ai-translator-tooltip-body"></div>
    `;

    tooltip.querySelector('.ai-translator-tooltip-close').addEventListener('click', () => {
      tooltip.style.display = 'none';
    });

    tooltip.addEventListener('mouseenter', () => {
      clearTimeout(this.timer);
    });

    tooltip.addEventListener('mouseleave', () => {
      this.hide();
    });

    return tooltip;
  }

  async _fetchTranslation() {
    const body = this.element.querySelector('.ai-translator-tooltip-body');

    try {
      const { targetLang, sourceLang } = await getSettings();
      const result = await translateWord(this.selectedText, targetLang, sourceLang, location.href);
      body.textContent = result;
    } catch (error) {
      body.innerHTML = `<div class="ai-translator-tooltip-error">${__('progressFailed')}: ${error.message}</div>`;
    }
  }
}
