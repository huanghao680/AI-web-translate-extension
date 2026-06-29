const CONTENT_SELECTORS = [
  'article', '[role="main"]', 'main',
  '#content', '.content', '.post', '.entry', '.page',
  '#dw__content', '.dw-page-body',
];

function findMainContent() {
  for (const sel of CONTENT_SELECTORS) {
    const el = document.querySelector(sel);
    if (el && el.textContent.trim().length > 200) return el;
  }
  return null;
}

function getContentSegments() {
  const root = findMainContent();
  if (!root) return null;

  const textNodes = getVisibleTextNodes(root);
  const segments = textNodesToSegments(textNodes);
  if (!segments || segments.length === 0) return null;

  return { root, segments };
}
