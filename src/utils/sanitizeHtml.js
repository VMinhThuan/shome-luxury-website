const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'h2', 'h3', 'h4',
  'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'figure', 'figcaption',
  'div', 'span', 'hr'
]);

const ALLOWED_ATTRIBUTES = new Set(['class', 'id', 'href', 'src', 'alt', 'title', 'target', 'rel', 'width', 'height']);

function safeUrl(value, attribute) {
  const url = String(value || '').trim();
  if (!url) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) {
    const allowed = attribute === 'href' ? /^(https?:|mailto:|tel:)/i : /^https?:/i;
    if (!allowed.test(url)) return '';
  } else if (!/^(\/|\.\/|\.\.\/|#|\?)/.test(url)) {
    return '';
  }
  return url;
}

function sanitizeAttributes(raw = '') {
  const attrs = [];
  const attrPattern = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match;
  while ((match = attrPattern.exec(raw))) {
    const name = match[1].toLowerCase();
    if (!ALLOWED_ATTRIBUTES.has(name) || name.startsWith('on')) continue;
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    const safeValue = ['href', 'src'].includes(name) ? safeUrl(value, name) : value;
    if (['href', 'src'].includes(name) && !safeValue) continue;
    attrs.push(` ${name}="${safeValue.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;') }"`);
  }
  if (attrs.some(attribute => attribute.startsWith(' target="_blank"')) && !attrs.some(attribute => attribute.startsWith(' rel="'))) {
    attrs.push(' rel="noopener noreferrer"');
  }
  return attrs.join('');
}

function sanitizeHtml(value = '') {
  let html = String(value || '');
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  html = html.replace(/<(script|style|iframe|object|embed|form|input|button|textarea|select|meta|link)[^>]*>[\s\S]*?<\/\1>/gi, '');
  html = html.replace(/<(script|style|iframe|object|embed|form|input|button|textarea|select|meta|link)\b[^>]*\/?\s*>/gi, '');
  return html.replace(/<\s*(\/?)\s*([a-z0-9]+)([^>]*)>/gi, (full, closing, tag, rawAttrs) => {
    const normalizedTag = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(normalizedTag)) return '';
    if (closing) return `</${normalizedTag}>`;
    const attrs = sanitizeAttributes(rawAttrs);
    const selfClosing = ['br', 'hr', 'img'].includes(normalizedTag);
    return `<${normalizedTag}${attrs}${selfClosing ? ' />' : '>'}`;
  });
}

function htmlToPlainText(value = '') {
  return String(value || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|li|h[1-6]|blockquote|figure|section)\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function escapeHtmlText(value = '') {
  return String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function plainTextToHtml(value = '') {
  const text = htmlToPlainText(value);
  if (!text) return '';
  return text.split(/\n{2,}/).map(paragraph => `<p>${escapeHtmlText(paragraph).replace(/\n/g, '<br />')}</p>`).join('');
}

module.exports = { sanitizeHtml, htmlToPlainText, plainTextToHtml };
