const HomeImage = require('../models/HomeImage');
const allSlots = require('../data/homeImageSlots');

/**
 * Returns a key-value object of { [image_key]: image_url } for a specific page
 * or for all slots, falling back to the default image URL if not customized.
 *
 * @param {string} [pageKey] - 'home' | 'factory' | 'quote' | 'news' | 'recruitment' | 'booking' | null
 * @returns {Promise<Record<string, string>>}
 */
async function getPageImages(pageKey = null) {
  const targetSlots = pageKey ? allSlots.filter(s => s.page_key === pageKey) : allSlots;
  try {
    const saved = await HomeImage.find({ image_key: { $in: targetSlots.map(s => s.image_key) } }).lean();
    const byKey = new Map(saved.map(item => [item.image_key, item.image_url]));
    return Object.fromEntries(targetSlots.map(s => [s.image_key, byKey.get(s.image_key) || s.image_url]));
  } catch (error) {
    console.error(`[ImageService] Error fetching images for page "${pageKey}":`, error.message);
    return Object.fromEntries(targetSlots.map(s => [s.image_key, s.image_url]));
  }
}

module.exports = {
  getPageImages,
  allSlots
};
