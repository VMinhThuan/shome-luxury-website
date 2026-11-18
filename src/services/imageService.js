const HomeImage = require('../models/HomeImage');
const allSlots = require('../data/homeImageSlots');
const subpageSlots = require('../data/subpageImageSlots');

const configuredSlots = [...allSlots, ...subpageSlots];

function customReference(record, slot) {
  if (record?.custom_image_reference?.image_url) return record.custom_image_reference;
  if (record && record.mode !== 'shared' && record.image_url
    && (record.image_url !== slot.image_url || record.cloudinary_public_id)) {
    return { image_url: record.image_url, cloudinary_public_id: record.cloudinary_public_id || null };
  }
  return null;
}

function customMobileReference(record, slot) {
  if (record?.custom_mobile_image_reference?.image_url) return record.custom_mobile_image_reference;
  if (record?.mobile_image_url && record.mobile_image_url !== (slot.mobile_image_url || slot.image_url)) {
    return {
      image_url: record.mobile_image_url,
      cloudinary_public_id: record.mobile_cloudinary_public_id || null
    };
  }
  return null;
}

function resolve(slot, records) {
  const record = records.get(slot.image_key);
  const custom = customReference(record, slot);
  // Each configured slot is independent. Old records that still contain a
  // shared reference are deliberately ignored so one page can never inherit
  // another page's image after this feature was removed from the admin UI.
  return custom?.image_url || slot.image_url;
}

function resolveMobile(slot, records) {
  const record = records.get(slot.image_key);
  const custom = customMobileReference(record, slot);
  if (custom?.image_url) return custom.image_url;

  // Preserve old quote-specific mobile uploads while the admin migrates them
  // to the new desktop/mobile controls on the parent banner card.
  const legacyMatch = /^quote_hero_banner_(\d+)$/.exec(slot.image_key);
  if (legacyMatch) {
    const legacyRecord = records.get(`quote_hero_mobile_${legacyMatch[1]}`);
    const legacyCustom = customReference(legacyRecord, { image_url: slot.mobile_image_url || slot.image_url });
    if (legacyCustom?.image_url) return legacyCustom.image_url;
  }
  if (slot.parent_image_key) {
    const parentSlot = configuredSlots.find(item => item.image_key === slot.parent_image_key);
    if (parentSlot) return resolveMobile(parentSlot, records);
  }
  return slot.mobile_image_url || slot.image_url;
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
    const saved = await HomeImage.find({ image_key: { $in: [...configuredSlots.map(s => s.image_key), 'news_hero_banner'] } }).lean();
    const byKey = new Map(saved.map(item => [item.image_key, item]));
    // Keep the original single-news-banner record working after the page was
    // expanded to three independently replaceable banner slots.
    if (!byKey.has('news_hero_banner_1') && byKey.has('news_hero_banner')) {
      byKey.set('news_hero_banner_1', byKey.get('news_hero_banner'));
    }
    return Object.fromEntries(targetSlots.flatMap(s => {
      const override = subpageOverrides.get(s.image_key);
      const effectiveSlot = override && byKey.has(override.image_key) ? override : s;
      return [
        [s.image_key, resolve(effectiveSlot, byKey)],
        [`${s.image_key}__mobile`, resolveMobile(effectiveSlot, byKey)]
      ];
    }));
  } catch (error) {
    console.error(`[ImageService] Error fetching images for page "${pageKey}":`, error.message);
    return Object.fromEntries(targetSlots.flatMap(s => [
      [s.image_key, s.image_url],
      [`${s.image_key}__mobile`, s.mobile_image_url || s.image_url]
    ]));
  }
}

module.exports = {
  getPageImages,
  allSlots,
  subpageSlots
};
