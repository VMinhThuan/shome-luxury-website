const TITLE_CASE_PRESERVATIONS = [
  ['shome luxury', 'SHOME LUXURY'],
  ['s home luxury', 'SHome Luxury'],
  ['vnđ', 'VNĐ'],
  ['cnc', 'CNC'],
  ['pdf', 'PDF'],
  ['hn', 'HN'],
  ['zalo', 'Zalo'],
  ['youtube', 'YouTube'],
  ['facebook', 'Facebook']
];

/**
 * Normalize public-facing Vietnamese titles to title case.
 *
 * Project names are editable CMS content and some legacy records are stored
 * in all caps. Keep the source value untouched and format only the display
 * value so search, APIs and admin editing retain the original data.
 */
function titleCaseVi(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';

  let formatted = text
    .toLocaleLowerCase('vi-VN')
    .replace(/(^|[^\p{L}\p{N}])([\p{L}])/gu, (_, prefix, letter) => (
      `${prefix}${letter.toLocaleUpperCase('vi-VN')}`
    ));

  TITLE_CASE_PRESERVATIONS.forEach(([source, replacement]) => {
    formatted = formatted.replace(new RegExp(`\\b${source}\\b`, 'gi'), replacement);
  });

  return formatted;
}

module.exports = { titleCaseVi };
