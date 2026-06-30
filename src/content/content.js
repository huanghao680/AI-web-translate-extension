let isTranslating = false;
let originalContent = null;
let translatedContent = null;
let displayMode = 'original';
let selectionTooltip = null;
let progressBar = null;
let blockSelectActive = false;
let blockAnchor = null;
let blockCurrent = null;
let blockHistoryIdx = -1;
let blockStack = [];
let blockOverlay = null;
let blockToolbar = null;
let blockHoverEl = null;
let selectionModeActive = false;
let selectionConfirmBtn = null;

const _listeners = [];

function addDocumentListener(event, handler) {
  document.addEventListener(event, handler);
  _listeners.push({ event, handler });
}

function removeDocumentListeners() {
  for (const { event, handler } of _listeners) {
    document.removeEventListener(event, handler);
  }
  _listeners.length = 0;
}

let _lastUrl = location.href;
let _spaPatched = false;

function invalidateTranslationState() {
  originalContent = null;
  translatedContent = null;
  displayMode = 'original';
  isTranslating = false;
}

function setupSpaDetection() {
  _lastUrl = location.href;

  addDocumentListener('popstate', onSpaNavigate);

  if (_spaPatched) return;
  _spaPatched = true;

  const origPushState = history.pushState.bind(history);
  const origReplaceState = history.replaceState.bind(history);

  history.pushState = function (...args) {
    origPushState(...args);
    onSpaNavigate();
  };

  history.replaceState = function (...args) {
    origReplaceState(...args);
    onSpaNavigate();
  };
}

function onSpaNavigate() {
  if (location.href === _lastUrl) return;
  _lastUrl = location.href;

  invalidateTranslationState();
  hideAutoTranslateBanner();
  removeDocumentListeners();
  if (selectionTooltip) selectionTooltip.destroy();
  if (progressBar) progressBar.destroy();
  selectionTooltip = new SelectionTooltip();
  progressBar = new TranslationProgressBar();

  const { enableSelectionTranslation } = getSettings().then((settings) => {
    if (settings.enableSelectionTranslation) {
      addDocumentListener('mouseup', (e) => {
        const selection = window.getSelection();
        const text = selection.toString().trim();
        if (text) {
          selectionTooltip.show(e.clientX, e.clientY, text);
        } else {
          selectionTooltip.hide();
        }
      });

      addDocumentListener('keydown', (e) => {
        if (e.key === 'Escape') {
          selectionTooltip.hide();
        }
      });
    }

    checkAutoTranslate();
  });
}

async function init() {
  removeDocumentListeners();
  if (selectionTooltip) selectionTooltip.destroy();
  if (progressBar) progressBar.destroy();
  selectionTooltip = new SelectionTooltip();
  progressBar = new TranslationProgressBar();

  const { enableSelectionTranslation } = await getSettings();

  if (enableSelectionTranslation) {
    addDocumentListener('mouseup', (e) => {
      const selection = window.getSelection();
      const text = selection.toString().trim();
      if (text) {
        selectionTooltip.show(e.clientX, e.clientY, text);
      } else {
        selectionTooltip.hide();
      }
    });

    addDocumentListener('keydown', (e) => {
      if (e.key === 'Escape') {
        selectionTooltip.hide();
      }
    });
  }

  setupSpaDetection();
}

function getVisibleTextNodes(root) {
  const excludedTags = new Set([
    'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TD', 'TH', 'CAPTION', 'COLGROUP', 'COL',
    'CODE', 'PRE', 'SAMP', 'KBD', 'VAR',
    'INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'BUTTON',
    'SVG', 'MATH', 'CANVAS',
    'SCRIPT', 'STYLE', 'NOSCRIPT',
  ]);

  const iconClassPattern = /\b(fa[sbdlr]?|icon|material-icons|glyphicon|symbol|svg-|icon-|k-icon|d-icon|c-icon|mdi|oi|bi|si|ti|pi)\b/i;
  const iconFontFamilies = ['Font Awesome', 'Material Icons', 'MaterialDesignIcons', 'Ionicons', 'Glyphicons', 'Octicons', 'Feather', 'Boxicons', 'Tabler Icons', 'PrimeIcons', 'Devicons', 'Typicons', 'Weather Icons', 'Line Awesome', 'Fontello'];

  function isIconText(text, el) {
    const chars = Array.from(text.trim());
    if (chars.length === 0) return false;

    if (el && iconClassPattern.test(el.className)) return true;

    const style = el && window.getComputedStyle(el);
    if (style) {
      const font = style.fontFamily;
      for (const name of iconFontFamilies) {
        if (font.includes(name)) return true;
      }
    }

    if (el && (el.getAttribute('role') === 'img' || el.hasAttribute('aria-label'))) return true;

    const hasWordChars = chars.some((c) => /[\w\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(c));
    if (!hasWordChars) return true;

    const firstCode = chars[0].codePointAt(0);
    if (chars.length <= 3 && firstCode >= 0xE000 && firstCode <= 0xF8FF) return true;

    return false;
  }

  function isExcluded(node) {
    let el = node.parentElement;
    while (el && el !== root) {
      if (excludedTags.has(el.tagName)) return true;
      if (el.getAttribute && (el.getAttribute('role') === 'img' || el.hasAttribute('aria-label'))) return true;
      el = el.parentElement;
    }
    return false;
  }

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
        if (isExcluded(node)) return NodeFilter.FILTER_REJECT;
        if (isIconText(node.textContent, node.parentElement)) return NodeFilter.FILTER_REJECT;
        const style = window.getComputedStyle(node.parentElement);
        if (style.display === 'none' || style.visibility === 'hidden') {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    },
    false
  );

  const nodes = [];
  let node;
  while ((node = walker.nextNode())) {
    nodes.push(node);
  }
  return nodes;
}

function getPageSegments() {
  const textNodes = getVisibleTextNodes(document.body);
  const segments = [];

  let i = 0;
  while (i < textNodes.length) {
    const nodes = [textNodes[i]];
    const parent = textNodes[i].parentNode;

    let j = i + 1;
    while (j < textNodes.length && textNodes[j].parentNode === parent) {
      nodes.push(textNodes[j]);
      j++;
    }

    const text = nodes.map((n) => n.textContent.trim()).filter(Boolean).join(' ');
    if (text) segments.push({ nodes, text });
    i = j;
  }

  return segments;
}

function getBlockRoot(node) {
  const blocks = new Set(['P','DIV','H1','H2','H3','H4','H5','H6','LI','TD','TH','BLOCKQUOTE','SECTION','ARTICLE','HEADER','FOOTER','MAIN','ASIDE','NAV','OL','UL','DL','FIGCAPTION','PRE','FORM','FIELDSET','DETAILS','DIALOG','BUTTON']);
  let el = node.parentElement;
  while (el && el !== document.body) {
    if (blocks.has(el.tagName)) return el;
    el = el.parentElement;
  }
  return document.body;
}

function getSmartSegments() {
  const textNodes = getVisibleTextNodes(document.body);
  const segments = [];
  const inlineCodeTags = new Set(['CODE', 'KBD', 'SAMP', 'VAR']);
  let i = 0;
  while (i < textNodes.length) {
    const nodes = [textNodes[i]];
    const root = getBlockRoot(textNodes[i]);
    let j = i + 1;
    while (j < textNodes.length && getBlockRoot(textNodes[j]) === root) {
      const prev = textNodes[j - 1];
      const curr = textNodes[j];
      const hasGap = prev.parentNode !== curr.parentNode || curr.compareDocumentPosition(prev.parentNode) & Node.DOCUMENT_POSITION_FOLLOWING === 0;
      nodes.push(curr);
      j++;
    }
    const parts = [];
    for (let k = 0; k < nodes.length; k++) {
      const text = nodes[k].textContent.trim();
      if (text) parts.push(text);
      if (k < nodes.length - 1) {
        const sibling = nodes[k].nextSibling;
        const nextSib = nodes[k + 1].previousSibling;
        let gapNode = nodes[k].nextSibling;
        let foundGap = false;
        while (gapNode && gapNode !== nodes[k + 1]) {
          if (gapNode.nodeType === 1 && inlineCodeTags.has(gapNode.tagName)) {
            const code = gapNode.textContent.trim();
            if (code) { parts.push('[' + code + ']'); foundGap = true; break; }
          }
          gapNode = gapNode.nextSibling;
        }
        if (foundGap) continue;
        if (text && nodes[k + 1].textContent.trim() && nodes[k].parentNode !== nodes[k + 1].parentNode) {
          parts.push(' ');
        }
      }
    }
    const text = parts.join('').replace(/\s+/g, ' ');
    if (text) segments.push({ nodes, text });
    i = j;
  }
  return segments;
}

function applyTranslationToSegment(segment, translatedText) {
  const { nodes } = segment;
  if (nodes.length === 1) {
    nodes[0].textContent = translatedText;
    return;
  }
  const codePoints = Array.from(translatedText);
  const totalLen = nodes.reduce((s, n) => s + Array.from(n.textContent.trim()).length, 0);
  if (totalLen === 0) return;
  let pos = 0;
  for (let k = 0; k < nodes.length; k++) {
    const origLen = Array.from(nodes[k].textContent.trim()).length;
    if (origLen === 0) continue;
    const proportion = origLen / totalLen;
    const chunkLen = k === nodes.length - 1
      ? codePoints.length - pos
      : Math.round(proportion * codePoints.length);
    nodes[k].textContent = codePoints.slice(pos, pos + chunkLen).join('').trim();
    pos += chunkLen;
  }
}

function preserveOriginalContent() {
  if (originalContent) return;
  originalContent = document.body.innerHTML;
}

function saveTranslatedContent() {
  const barEl = document.querySelector('.ai-translator-progress');
  if (barEl) barEl.remove();
  translatedContent = document.body.innerHTML;
  displayMode = 'translated';
  if (barEl) document.body.appendChild(barEl);
}

function toggleTranslation() {
  if (displayMode === 'translated' && originalContent) {
    document.body.innerHTML = originalContent;
    displayMode = 'original';
    init();
    showNotification(__('notifSwitchedOriginal'), 'info');
  }
  if (displayMode === 'original' && translatedContent) {
    document.body.innerHTML = translatedContent;
    displayMode = 'translated';
    init();
    showNotification(__('notifSwitchedTranslation'), 'info');
  }
}

async function translateFullPage() {
  if (isTranslating) {
    showNotification(__('notifTranslating'), 'info');
    return;
  }
  isTranslating = true;

  const settings = await getSettings();
  if (!settings.apiKey) {
    showNotification(__('notifConfigApiKey'), 'error');
    isTranslating = false;
    return;
  }

  preserveOriginalContent();
  progressBar.show(__('notifAnalyzing'));
  progressBar.setCancelCallback(() => {
    isTranslating = false;
    translatedContent = null;
    displayMode = 'original';
    if (originalContent) {
      document.body.innerHTML = originalContent;
      init();
    }
    progressBar.hide();
  });

  TokenUsage.startSession();
  try {
    let segments;
    if (settings.enableContentOptimization) {
      const extracted = getContentSegments();
      if (extracted) {
        segments = extracted.segments;
        progressBar.show(__('notifTranslatingContent'));
      }
    }
    if (!segments) segments = settings.enableSmartGrouping ? getSmartSegments() : getPageSegments();
    const total = segments.length;
    const batchSize = 15;
    const totalBatches = Math.ceil(total / batchSize);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      if (!isTranslating) {
        progressBar.hide();
        return;
      }

      const start = batchIndex * batchSize;
      const end = Math.min(start + batchSize, total);
      const batch = segments.slice(start, end);
      const batchText = batch.map((s) => s.text).join('\n---SEPARATOR---\n');

      progressBar.update(
        start,
        total,
        __('translating') + ` ${start + 1}-${end}/${total}（${batchIndex + 1}/${totalBatches}）`
      );

      const translatedBatch = await translateText(
        batchText,
        settings.targetLang,
        settings.sourceLang,
        location.href
      );

      const results = translatedBatch.split('\n---SEPARATOR---\n');

      for (let i = 0; i < batch.length; i++) {
        let translated = results[i]?.trim();
        if (translated && translated !== batch[i].text) {
          if (settings.enableSmartGrouping) {
            translated = translated.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
            if (!translated) translated = batch[i].nodes[0]?.textContent?.trim() || '';
          }
          applyTranslationToSegment(batch[i], translated);
        }
      }
    }

    progressBar.complete(__('notifTranslationDone'));
    saveTranslatedContent();
  } catch (error) {
    if (originalContent) {
      document.body.innerHTML = originalContent;
      init();
    }
    translatedContent = null;
    displayMode = 'original';
    progressBar.error(__('progressFailed') + ': ' + error.message);
  } finally {
    isTranslating = false;
    TokenUsage.endSession();
  }
}

function showSummaryPanel(content) {
  const existing = document.querySelector('.ai-translator-summary');
  if (existing) existing.remove();

  const panel = document.createElement('div');
  panel.className = 'ai-translator-summary';
  panel.innerHTML = `
    <div class="ai-translator-summary-header">
      <span>📋 ${__('notifSummaryTitle')}</span>
      <button class="ai-translator-summary-close">&times;</button>
    </div>
    <div class="ai-translator-summary-body">${content.replace(/\n/g, '<br>')}</div>
  `;
  panel.querySelector('.ai-translator-summary-close').addEventListener('click', () => panel.remove());
  document.body.appendChild(panel);
  requestAnimationFrame(() => panel.classList.add('ai-translator-summary--visible'));
}

async function handleSummaryTranslation() {
  if (isTranslating) { showNotification(__('notifTranslating'), 'info'); return; }
  isTranslating = true;

  const settings = await getSettings();
  if (!settings.apiKey) { showNotification(__('notifConfigApiKey'), 'error'); isTranslating = false; return; }

  progressBar.show(__('notifSummarizing'));
  TokenUsage.startSession();
  try {
    const segments = settings.enableContentOptimization
      ? (getContentSegments()?.segments || getPageSegments())
      : getPageSegments();
    const fullText = segments.map((s) => s.text).join('\n\n');
    progressBar.update(0, 1, __('notifSendingToAi'));

    const result = await translateSummary(
      fullText,
      settings.targetLang,
      settings.sourceLang,
      location.href
    );
    progressBar.complete(__('notifSummaryDone'));
    showSummaryPanel(result);
  } catch (error) {
    progressBar.error(`${__('notifSummaryFail')}: ${error.message}`);
  } finally {
    isTranslating = false;
    TokenUsage.endSession();
  }
}

async function translateSelectedElement(element) {
  const settings = await getSettings();
  if (!settings.apiKey) {
    showNotification(__('notifConfigApiKey'), 'error');
    return;
  }

    const isLiveElement = element.isConnected && document.body.contains(element);
  if (isLiveElement) preserveOriginalContent();

  const textNodes = getVisibleTextNodes(element);
  const segments = textNodesToSegments(textNodes);

  const total = segments.length;
  if (total === 0) {
    showNotification(__('notifNoText'), 'info');
    return;
  }

  progressBar.show(__('translating'));

  try {
    const batchText = segments.map((s) => s.text).join('\n---SEPARATOR---\n');

    progressBar.update(0, total, __('translating'));

    const translatedBatch = await translateText(
      batchText,
      settings.targetLang,
      settings.sourceLang,
      location.href
    );

    const results = translatedBatch.split('\n---SEPARATOR---\n');

    for (let idx = 0; idx < segments.length; idx++) {
      const translated = results[idx]?.trim();
      if (translated && translated !== segments[idx].text) {
        applyTranslationToSegment(segments[idx], translated);
      }
    }

    if (isLiveElement) saveTranslatedContent();

    progressBar.complete((isLiveElement ? __('notifTranslationDone') : __('progressComplete')));
  } catch (error) {
    progressBar.error(__('progressFailed') + ': ' + error.message);
  }
}

function showNotification(message, type = 'info') {
  const existing = document.querySelector('.ai-translator-notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.className = `ai-translator-notification ai-translator-notification--${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  const delay = type === 'error' ? 5000 : 3000;
  setTimeout(() => notification.remove(), delay);

  return notification;
}

const LANG_RANGES = {
  '中文': [[0x4E00, 0x9FFF], [0x3400, 0x4DBF]],
  '日文': [[0x3040, 0x309F], [0x30A0, 0x30FF]],
  '韩文': [[0xAC00, 0xD7AF]],
};

function getTextSample(length = 500) {
  const el = document.querySelector('article, main, .post, .entry, .content, [role="main"]') || document.body;
  return (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, length);
}

function detectPageLanguage(text) {
  const langScores = {};
  for (const [lang, ranges] of Object.entries(LANG_RANGES)) {
    let count = 0;
    for (const ch of text) {
      const code = ch.codePointAt(0);
      if (code === undefined) continue;
      if (ranges.some(([lo, hi]) => code >= lo && code <= hi)) count++;
    }
    langScores[lang] = text.length > 0 ? count / text.length : 0;
  }
  let best = null;
  let bestScore = 0;
  for (const [lang, score] of Object.entries(langScores)) {
    if (score > bestScore) { bestScore = score; best = lang; }
  }
  return bestScore > 0.05 ? best : null;
}

async function checkAutoTranslate() {
  const { autoTranslate, apiKey, targetLang } = await getSettings();
  if (!autoTranslate || !apiKey) return;

  const sample = getTextSample();
  if (sample) {
    const pageLang = detectPageLanguage(sample);
    if (pageLang && pageLang === targetLang) {
      showNotification(__('notifAlreadyTargetLang').replace('{targetLang}', targetLang), 'info');
      return;
    }
  }

  showAutoTranslateBanner();
}

function showAutoTranslateBanner() {
  const existing = document.querySelector('.ai-translator-banner');
  if (existing) return;

  const banner = document.createElement('div');
  banner.className = 'ai-translator-banner';
  banner.innerHTML = `
    <div class="ai-translator-banner-content">
      <span class="ai-translator-banner-text">${__('notifBannerText')}</span>
      <div class="ai-translator-banner-actions">
        <button class="ai-translator-banner-btn ai-translator-banner-btn--primary" data-action="translate">${__('btnTranslate')}</button>
        <button class="ai-translator-banner-btn ai-translator-banner-btn--outline" data-action="cancel">${__('btnCancel')}</button>
      </div>
    </div>
  `;

  banner.querySelector('[data-action="translate"]').addEventListener('click', () => {
    banner.remove();
    getSettings().then((s) => {
      if (s.autoTranslateAction === 'summary') handleSummaryTranslation();
      else translateFullPage();
    });
  });

  banner.querySelector('[data-action="cancel"]').addEventListener('click', () => {
    banner.remove();
  });

  document.body.prepend(banner);
  requestAnimationFrame(() => banner.classList.add('ai-translator-banner--visible'));
}

function hideAutoTranslateBanner() {
  const banner = document.querySelector('.ai-translator-banner');
  if (banner) banner.remove();
}

function updateSettings(settings) {
  return chrome.storage.sync.set(settings);
}

function startBlockSelection() {
  if (blockSelectActive) return;
  blockSelectActive = true;
  blockAnchor = null;
  blockCurrent = null;
  blockStack = [];
  blockHistoryIdx = -1;
  blockHoverEl = null;

  blockOverlay = document.createElement('div');
  blockOverlay.className = 'ai-translator-block-overlay';
  document.body.appendChild(blockOverlay);

  blockToolbar = document.createElement('div');
  blockToolbar.className = 'ai-translator-block-toolbar';
  blockToolbar.innerHTML = `
    <span class="ai-translator-block-toolbar-hint">${__('selectBlockHint')}</span>
    <div class="ai-translator-block-toolbar-actions">
      <button class="ai-translator-block-btn" data-action="translate">${__('btnTranslate')}</button>
      <button class="ai-translator-block-btn ai-translator-block-btn--cancel" data-action="cancel">${__('btnCancel')}</button>
    </div>
  `;
  blockToolbar.querySelector('[data-action="translate"]').addEventListener('click', confirmBlockTranslation);
  blockToolbar.querySelector('[data-action="cancel"]').addEventListener('click', stopBlockSelection);
  document.body.appendChild(blockToolbar);

  addDocumentListener('mouseover', onBlockHover);
  addDocumentListener('click', onBlockClick, true);
  addDocumentListener('keydown', onBlockKeydown);

  showNotification(__('notifBlockHint'), 'info');
}

function stopBlockSelection() {
  blockSelectActive = false;
  blockAnchor = null;
  blockCurrent = null;
  blockStack = [];
  blockHistoryIdx = -1;
  blockHoverEl = null;
  removeDocumentListeners();
  if (blockOverlay) { blockOverlay.remove(); blockOverlay = null; }
  if (blockToolbar) { blockToolbar.remove(); blockToolbar = null; }
}

function textNodesToSegments(textNodes) {
  const segments = [];
  let i = 0;
  while (i < textNodes.length) {
    const nodes = [textNodes[i]];
    const parent = textNodes[i].parentNode;
    let j = i + 1;
    while (j < textNodes.length && textNodes[j].parentNode === parent) {
      nodes.push(textNodes[j]);
      j++;
    }
    const text = nodes.map((n) => n.textContent.trim()).filter(Boolean).join(' ');
    if (text) segments.push({ nodes, text });
    i = j;
  }
  return segments;
}

async function translateSegments(segments) {
  const settings = await getSettings();
  if (!settings.apiKey) { showNotification(__('notifConfigApiKey'), 'error'); return; }

  const total = segments.length;
  if (total === 0) {     showNotification(__('notifNoText'), 'info'); return; }

  preserveOriginalContent();

  progressBar.show(__('translating'));
  try {
    const batchText = segments.map((s) => s.text).join('\n---SEPARATOR---\n');
    progressBar.update(0, total, __('translating'));
    const translatedBatch = await translateText(batchText, settings.targetLang, settings.sourceLang, location.href);
    const results = translatedBatch.split('\n---SEPARATOR---\n');
    for (let idx = 0; idx < segments.length; idx++) {
      const translated = results[idx]?.trim();
      if (translated && translated !== segments[idx].text) {
        applyTranslationToSegment(segments[idx], translated);
      }
    }
    saveTranslatedContent();
    progressBar.complete(__('progressComplete'));
  } catch (error) {
    progressBar.error(__('progressFailed') + ': ' + error.message);
  }
}

function startSelectionMode() {
  if (selectionModeActive) return;
  selectionModeActive = true;

  selectionConfirmBtn = document.createElement('div');
  selectionConfirmBtn.className = 'ai-translator-sel-btn';
  selectionConfirmBtn.textContent = __('btnTranslate');
  selectionConfirmBtn.style.display = 'none';
  document.body.appendChild(selectionConfirmBtn);

  selectionConfirmBtn.addEventListener('click', onSelectionConfirm);

  addDocumentListener('mouseup', onSelectionMouseup);
  addDocumentListener('keydown', onSelectionKeydown);

  showNotification(__('notifSelectText'), 'info');
}

function stopSelectionMode() {
  selectionModeActive = false;
  if (selectionConfirmBtn) { selectionConfirmBtn.remove(); selectionConfirmBtn = null; }
}

function onSelectionMouseup(e) {
  if (!selectionModeActive) return;
  setTimeout(() => {
    const text = window.getSelection().toString().trim();
    if (text && selectionConfirmBtn) {
      const rect = window.getSelection().getRangeAt(0).getBoundingClientRect();
      selectionConfirmBtn.style.display = 'block';
      selectionConfirmBtn.style.top = (rect.bottom + 6) + 'px';
      selectionConfirmBtn.style.left = Math.max(4, rect.left) + 'px';
    } else if (selectionConfirmBtn) {
      selectionConfirmBtn.style.display = 'none';
    }
  }, 10);
}

function onSelectionKeydown(e) {
  if (!selectionModeActive) return;
  if (e.key === 'Escape') { stopSelectionMode(); showNotification(__('notifSelectionCancelled'), 'info'); }
}

function onSelectionConfirm() {
  const sel = window.getSelection();
  if (!sel.rangeCount || !sel.toString().trim()) return;
  const range = sel.getRangeAt(0);

  const textNodes = [];
  const walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
      return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  let n;
  while ((n = walker.nextNode())) textNodes.push(n);

  stopSelectionMode();
  if (textNodes.length === 0) {     showNotification(__('notifNoText'), 'info'); return; }

  const segments = textNodesToSegments(textNodes);
  translateSegments(segments);
}

function onBlockHover(e) {
  if (!blockSelectActive) return;
  const el = e.target.closest('p, h1, h2, h3, h4, h5, h6, li, div, section, article, blockquote, pre, figure, figcaption, td, th');
  if (!el || el === document.body || el === document.documentElement) return;
  blockHoverEl = el;
  if (!blockAnchor) {
    blockCurrent = el;
    updateBlockUI(el);
  }
}

function onBlockClick(e) {
  if (!blockSelectActive) return;
  e.preventDefault();
  e.stopPropagation();

  if (!blockAnchor) {
    const el = blockHoverEl || e.target.closest('p, h1, h2, h3, h4, h5, h6, li, div, section, article, blockquote, pre');
    if (!el || el === document.body) return;
    blockAnchor = el;
    blockCurrent = el;
    blockStack = [el];
    blockHistoryIdx = 0;
    let parent = el.parentElement;
    while (parent && parent !== document.body && parent !== document.documentElement) {
      blockStack.unshift(parent);
      parent = parent.parentElement;
    }
    blockHistoryIdx = blockStack.length - 1;
    updateBlockUI(el);
    blockToolbar.classList.add('ai-translator-block-toolbar--locked');
  }
}

function onBlockKeydown(e) {
  if (!blockSelectActive) return;
  if (e.key === 'Escape') { stopBlockSelection(); showNotification(__('notifBlockCancelled'), 'info'); return; }
  if (e.key === 'Enter') { confirmBlockTranslation(); return; }
  if (!blockAnchor) return;
  if (e.key === 'ArrowUp' && blockHistoryIdx > 0) {
    e.preventDefault();
    blockHistoryIdx--;
    blockCurrent = blockStack[blockHistoryIdx];
    updateBlockUI(blockCurrent);
  } else if (e.key === 'ArrowDown' && blockHistoryIdx < blockStack.length - 1) {
    e.preventDefault();
    blockHistoryIdx++;
    blockCurrent = blockStack[blockHistoryIdx];
    updateBlockUI(blockCurrent);
  }
}

function updateBlockUI(el) {
  if (!el) return;
  updateBlockOverlay(el);
  updateBlockToolbar(el);
}

function updateBlockOverlay(el) {
  if (!blockOverlay || !el) return;
  const rect = el.getBoundingClientRect();
  blockOverlay.style.top = rect.top + 'px';
  blockOverlay.style.left = rect.left + 'px';
  blockOverlay.style.width = rect.width + 'px';
  blockOverlay.style.height = rect.height + 'px';
}

function updateBlockToolbar(el) {
  if (!blockToolbar || !el) return;
  const rect = el.getBoundingClientRect();
  const top = rect.top - 44;
  blockToolbar.style.top = Math.max(4, top) + 'px';
  blockToolbar.style.left = Math.max(4, rect.left) + 'px';
  blockToolbar.style.display = 'flex';
}

async function confirmBlockTranslation() {
  if (!blockCurrent) { stopBlockSelection(); return; }
  const el = blockCurrent;
  stopBlockSelection();
  await translateSelectedElement(el);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'TRANSLATE_FULL_PAGE':
      translateFullPage();
      break;
    case 'TRANSLATE_SELECTION':
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let container = range.commonAncestorContainer;
        if (container.nodeType === Node.TEXT_NODE) container = container.parentElement;
        const blocks = new Set(['P', 'DIV', 'SECTION', 'ARTICLE', 'LI', 'BLOCKQUOTE', 'TD', 'TH', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'FIGURE', 'FIGCAPTION', 'ASIDE', 'MAIN', 'HEADER', 'FOOTER']);
        while (container && container !== document.body && !blocks.has(container.tagName)) {
          container = container.parentElement;
        }
        if (container && container !== document.body) {
          translateSelectedElement(container);
        }
      }
      break;
    case 'TOGGLE_TRANSLATION':
      toggleTranslation();
      break;
    case 'TRANSLATE_SUMMARY':
      handleSummaryTranslation();
      break;
    case 'START_BLOCK_SELECTION':
      startBlockSelection();
      break;
    case 'STOP_BLOCK_SELECTION':
      stopBlockSelection();
      break;
    case 'START_SELECTION_MODE':
      startSelectionMode();
      break;
    case 'STOP_SELECTION_MODE':
      stopSelectionMode();
      break;
    case 'GET_STATE':
      getSettings().then((settings) => {
        sendResponse({
          translated: translatedContent !== null,
          displayMode: displayMode,
          blockSelectActive: blockSelectActive,
          selectionModeActive: selectionModeActive,
          autoTranslate: settings.autoTranslate,
        });
      });
      return true;
    case 'UPDATE_SETTINGS':
      if (message.settings) {
        updateSettings(message.settings);
      }
      sendResponse({ success: true });
      break;
  }
  sendResponse({ success: true });
});

(async () => {
  await initI18n();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      init();
      checkAutoTranslate();
    });
  } else {
    init();
    checkAutoTranslate();
  }
})();
