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

  const iconClassPattern = /\b(fa[sbdlr]?|icon|material-icons|glyphicon|symbol|svg-|icon-|k-icon|d-icon|c-icon)\b/i;

  function isExcluded(node) {
    let el = node.parentElement;
    while (el && el !== root) {
      if (excludedTags.has(el.tagName)) return true;
      el = el.parentElement;
    }
    return false;
  }

  function isIconText(text, el) {
    const chars = Array.from(text.trim());
    if (chars.length === 0) return false;

    if (el && iconClassPattern.test(el.className)) return true;

    const hasWordChars = chars.some((c) => /[\w\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(c));
    if (!hasWordChars) return true;

    if (chars.length <= 2) {
      const allPua = chars.every((c) => {
        const code = c.codePointAt(0);
        return (code >= 0xE000 && code <= 0xF8FF) || (code >= 0xF0000 && code <= 0xFFFFF);
      });
      if (allPua) return true;
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
    showNotification('已切换为原文', 'info');
    return;
  }
  if (displayMode === 'original' && translatedContent) {
    document.body.innerHTML = translatedContent;
    displayMode = 'translated';
    init();
    showNotification('已切换为译文', 'info');
  }
}

async function translateFullPage() {
  if (isTranslating) {
    showNotification('正在翻译中，请稍候...', 'info');
    return;
  }
  isTranslating = true;

  const settings = await getSettings();
  if (!settings.apiKey) {
    showNotification('请先在设置中配置 API Key', 'error');
    isTranslating = false;
    return;
  }

  preserveOriginalContent();
  progressBar.show('正在翻译整页...');
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

  try {
    const segments = getPageSegments();
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
        `正在翻译 ${start + 1}-${end}/${total} 段（第 ${batchIndex + 1}/${totalBatches} 批）`
      );

      const translatedBatch = await translateText(
        batchText,
        settings.targetLang,
        settings.sourceLang,
        location.href
      );

      const results = translatedBatch.split('\n---SEPARATOR---\n');

      for (let i = 0; i < batch.length; i++) {
        const translated = results[i]?.trim();
        if (translated && translated !== batch[i].text) {
          applyTranslationToSegment(batch[i], translated);
        }
      }
    }

    progressBar.complete('整页翻译完成');
    saveTranslatedContent();
  } catch (error) {
    if (originalContent) {
      document.body.innerHTML = originalContent;
      init();
    }
    translatedContent = null;
    displayMode = 'original';
    progressBar.error(`翻译失败: ${error.message}`);
  } finally {
    isTranslating = false;
  }
}

async function translateSelectedElement(element) {
  const settings = await getSettings();
  if (!settings.apiKey) {
    showNotification('请先在设置中配置 API Key', 'error');
    return;
  }

  const isLiveElement = element.isConnected && document.body.contains(element);
  if (isLiveElement) preserveOriginalContent();

  const textNodes = getVisibleTextNodes(element);
  const segments = textNodesToSegments(textNodes);

  const total = segments.length;
  if (total === 0) {
    showNotification('选中区域没有可翻译的文本', 'info');
    return;
  }

  progressBar.show('正在翻译选中区域...');

  try {
    const batchText = segments.map((s) => s.text).join('\n---SEPARATOR---\n');

    progressBar.update(0, total, '正在翻译文本...');

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

    progressBar.complete('区域翻译完成');
  } catch (error) {
    progressBar.error(`翻译失败: ${error.message}`);
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
  const { autoTranslate, autoTranslateWithoutConfirm, apiKey, targetLang } = await getSettings();
  if (!autoTranslate || !apiKey) return;

  const sample = getTextSample();
  if (sample) {
    const pageLang = detectPageLanguage(sample);
    if (pageLang && pageLang === targetLang) {
      showNotification(`页面已为${targetLang}，跳过自动翻译`, 'info');
      return;
    }
  }

  if (autoTranslateWithoutConfirm) {
    translateFullPage();
  } else {
    showAutoTranslateBanner();
  }
}

function showAutoTranslateBanner() {
  const existing = document.querySelector('.ai-translator-banner');
  if (existing) return;

  const banner = document.createElement('div');
  banner.className = 'ai-translator-banner';
  banner.innerHTML = `
    <div class="ai-translator-banner-content">
      <span class="ai-translator-banner-text">此页面可以翻译为目标语言，是否翻译？</span>
      <div class="ai-translator-banner-actions">
        <button class="ai-translator-banner-btn ai-translator-banner-btn--primary" data-action="translate">翻译</button>
        <button class="ai-translator-banner-btn ai-translator-banner-btn--outline" data-action="cancel">取消</button>
      </div>
    </div>
  `;

  banner.querySelector('[data-action="translate"]').addEventListener('click', () => {
    banner.remove();
    translateFullPage();
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
    <span class="ai-translator-block-toolbar-hint">点击选择块 · 方向键调整范围 · Enter 确认</span>
    <div class="ai-translator-block-toolbar-actions">
      <button class="ai-translator-block-btn" data-action="translate">翻译</button>
      <button class="ai-translator-block-btn ai-translator-block-btn--cancel" data-action="cancel">取消</button>
    </div>
  `;
  blockToolbar.querySelector('[data-action="translate"]').addEventListener('click', confirmBlockTranslation);
  blockToolbar.querySelector('[data-action="cancel"]').addEventListener('click', stopBlockSelection);
  document.body.appendChild(blockToolbar);

  addDocumentListener('mouseover', onBlockHover);
  addDocumentListener('click', onBlockClick, true);
  addDocumentListener('keydown', onBlockKeydown);

  showNotification('点击选择一个内容块，上下方向键调整范围', 'info');
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
  if (!settings.apiKey) { showNotification('请先在设置中配置 API Key', 'error'); return; }

  const total = segments.length;
  if (total === 0) { showNotification('没有可翻译的文本', 'info'); return; }

  preserveOriginalContent();

  progressBar.show('正在翻译选中的文本...');
  try {
    const batchText = segments.map((s) => s.text).join('\n---SEPARATOR---\n');
    progressBar.update(0, total, '正在翻译文本...');

    const translatedBatch = await translateText(batchText, settings.targetLang, settings.sourceLang, location.href);
    const results = translatedBatch.split('\n---SEPARATOR---\n');

    for (let idx = 0; idx < segments.length; idx++) {
      const translated = results[idx]?.trim();
      if (translated && translated !== segments[idx].text) {
        applyTranslationToSegment(segments[idx], translated);
      }
    }
    saveTranslatedContent();
    progressBar.complete('翻译完成');
  } catch (error) {
    progressBar.error(`翻译失败: ${error.message}`);
  }
}

function startSelectionMode() {
  if (selectionModeActive) return;
  selectionModeActive = true;

  selectionConfirmBtn = document.createElement('div');
  selectionConfirmBtn.className = 'ai-translator-sel-btn';
  selectionConfirmBtn.textContent = '翻译';
  selectionConfirmBtn.style.display = 'none';
  document.body.appendChild(selectionConfirmBtn);

  selectionConfirmBtn.addEventListener('click', onSelectionConfirm);

  addDocumentListener('mouseup', onSelectionMouseup);
  addDocumentListener('keydown', onSelectionKeydown);

  showNotification('在页面上选中文本，然后点击弹出的"翻译"按钮', 'info');
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
  if (e.key === 'Escape') { stopSelectionMode(); showNotification('已取消选中翻译', 'info'); }
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
  if (textNodes.length === 0) { showNotification('没有可翻译的文本', 'info'); return; }

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
  if (e.key === 'Escape') { stopBlockSelection(); showNotification('已取消块选择', 'info'); return; }
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
          autoTranslateWithoutConfirm: settings.autoTranslateWithoutConfirm,
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

function waitForPageReady(callback) {
  let fired = false;
  const once = () => { if (!fired) { fired = true; callback(); } };
  if (document.readyState === 'complete') { once(); return; }
  window.addEventListener('load', once, { once: true });
  setTimeout(once, 8000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init();
  });
} else {
  init();
}

waitForPageReady(() => {
  checkAutoTranslate();
});
