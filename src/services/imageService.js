const HomeImage = require('../models/HomeImage');
const allSlots = require('../data/homeImageSlots');
const subpageSlots = require('../data/subpageImageSlots');

const configuredSlots = [...allSlots, ...subpageSlots];
const slotByKey = new Map(configuredSlots.map(slot => [slot.image_key, slot]));

function customReference(record, slot) {
  if (record?.custom_image_reference?.image_url) return record.custom_image_reference;
  if (record && record.mode !== 'shared' && record.image_url
    && (record.image_url !== slot.image_url || record.cloudinary_public_id)) {
    return { image_url: record.image_url, cloudinary_public_id: record.cloudinary_public_id || null };
  }
  return null;
}

function resolve(slot, records, visited = new Set()) {
  const record = records.get(slot.image_key);
  const custom = customReference(record, slot);
  if (record?.mode !== 'shared') return custom?.image_url || slot.image_url;
  const sourceKey = record.shared_image_reference?.image_key;
  const source = sourceKey ? slotByKey.get(sourceKey) : null;
  if (!source || source.image_key === slot.image_key || visited.has(slot.image_key)) return slot.image_url;
  const nextVisited = new Set(visited);
  nextVisited.add(slot.image_key);
  const sourceRecord = records.get(source.image_key);
  if (sourceRecord?.mode === 'shared') return slot.image_url;
  return resolve(source, records, nextVisited) || slot.image_url;
}

/**
 * Returns a key-value object of { [image_key]: image_url } for a specific page
 * or for all slots, falling back to the default image URL if not customized.
 *
 * @param {string} [pageKey] - legacy page key, or a parent page for a subpage override
 * @param {string} [subpageKey] - category code used by quote submenu pages
 * @returns {Promise<Record<string, string>>}
 */
async function getPageImages(pageKey = null, subpageKey = null) {
  const parentSlots = pageKey ? allSlots.filter(s => s.page_key === pageKey) : allSlots;
  const scopedSubpageKey = pageKey && subpageKey ? `${pageKey}:${subpageKey}` : null;
  const subpageOverrides = scopedSubpageKey
    ? new Map(subpageSlots.filter(s => s.page_key === scopedSubpageKey).map(s => [s.parent_image_key, s]))
    : new Map();
  const targetSlots = pageKey && subpageKey
    ? parentSlots
    : pageKey
      ? configuredSlots.filter(s => s.page_key === pageKey)
      : allSlots;
  try {
    const saved = await HomeImage.find({ image_key: { $in: configuredSlots.map(s => s.image_key) } }).lean();
    const byKey = new Map(saved.map(item => [item.image_key, item]));
    return Object.fromEntries(targetSlots.map(s => {
      const override = subpageOverrides.get(s.image_key);
      const effectiveSlot = override && byKey.has(override.image_key) ? override : s;
      return [s.image_key, resolve(effectiveSlot, byKey)];
    }));
  } catch (error) {
    console.error(`[ImageService] Error fetching images for page "${pageKey}":`, error.message);
    return Object.fromEntries(targetSlots.map(s => [s.image_key, s.image_url]));
  }
}

module.exports = {
  getPageImages,
  allSlots,
  subpageSlots
};
