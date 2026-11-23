const QuoteVideoLink = require('../models/QuoteVideoLink');
const QuoteVideoMobileVisibility = require('../models/QuoteVideoMobileVisibility');
const completedVideosData = require('../data/completedVideosData');

const MAX_VISIBLE_VIDEOS = 6;
const MAX_MOBILE_VISIBLE_VIDEOS = 4;

function quotePageCode(pageKey = '') {
  let value = String(pageKey || '').trim();
  if (value.startsWith('subpage:')) value = value.slice('subpage:'.length);
  if (value.startsWith('quote:')) value = value.slice('quote:'.length);
  return value;
}

function categoryIdForPageKey(pageKey = '') {
  const value = quotePageCode(pageKey).toLowerCase();
  if (!value || value === 'quote') return 'chung-cu';
  if (value === 'cafe' || value.includes('cafe') || value.includes('tra-sua')) return 'cafe';
  if (value === 'biet-thu' || value.includes('biet-thu') || value.includes('villa')) return 'biet-thu';
  if (value.includes('nha-pho') || value.includes('nha-cap-4')) return 'biet-thu';
  return 'chung-cu';
}

function scopeKeyForPageKey(pageKey = '') {
  const value = quotePageCode(pageKey);
  if (!value || value === 'quote') return `category:${categoryIdForPageKey(value)}`;
  if (completedVideosData.categories.some(category => category.id === value)) return `category:${value}`;
  return `page:${value}`;
}

function youtubeIdFromUrl(value) {
  const input = String(value || '').trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;
  try {
    const url = new URL(input);
    const hostname = url.hostname.replace(/^www\./, '').toLowerCase();
    if (hostname === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return /^[A-Za-z0-9_-]{11}$/.test(id || '') ? id : null;
    }
    if (!['youtube.com', 'youtube-nocookie.com'].includes(hostname)) return null;
    if (url.pathname === '/watch') {
      const id = url.searchParams.get('v');
      return /^[A-Za-z0-9_-]{11}$/.test(id || '') ? id : null;
    }
    const id = url.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/i)?.[1];
    return id || null;
  } catch (error) {
    return null;
  }
}

function canonicalYoutubeUrl(value) {
  const videoId = youtubeIdFromUrl(value);
  if (!videoId) throw new Error('Vui lòng nhập URL YouTube hợp lệ hoặc mã video 11 ký tự.');
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function videoWithUrl(video, videoUrl, isMobileVisible) {
  const videoId = youtubeIdFromUrl(videoUrl) || video.videoId;
  return {
    ...video,
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    isMobileVisible
  };
}

function baseCategory(categoryId) {
  return completedVideosData.categories.find(category => category.id === categoryId)
    || completedVideosData.categories[0]
    || { id: categoryId, name: 'Công trình hoàn thiện', videos: [] };
}

async function getOverrideMap(scopeKeys) {
  if (!scopeKeys.length) return new Map();
  const rows = await QuoteVideoLink.find({ scopeKey: { $in: scopeKeys } }).lean();
  return new Map(rows.map(row => [`${row.scopeKey}:${row.videoIndex}`, row]));
}

async function getMobileVisibilityMap(scopeKeys) {
  if (!scopeKeys.length) return new Map();
  const rows = await QuoteVideoMobileVisibility.find({ scopeKey: { $in: scopeKeys } }).lean();
  return new Map(rows.map(row => [`${row.scopeKey}:${row.videoIndex}`, row]));
}

function defaultMobileVisibility(videoIndex) {
  return videoIndex < MAX_MOBILE_VISIBLE_VIDEOS;
}

function effectiveMobileVisibility(index, pageSetting, categorySetting) {
  const setting = pageSetting || categorySetting;
  return setting ? setting.isVisible === true : defaultMobileVisibility(index);
}

async function getAdminVideos(pageKey = 'quote') {
  const categoryId = categoryIdForPageKey(pageKey);
  const scopeKey = scopeKeyForPageKey(pageKey);
  const categoryScopeKey = `category:${categoryId}`;
  const overrides = await getOverrideMap([...new Set([scopeKey, categoryScopeKey])]);
  const mobileVisibility = await getMobileVisibilityMap([...new Set([scopeKey, categoryScopeKey])]);
  const category = baseCategory(categoryId);
  const videos = (category.videos || []).slice(0, MAX_VISIBLE_VIDEOS).map((video, index) => {
    const pageOverride = overrides.get(`${scopeKey}:${index}`);
    const categoryOverride = overrides.get(`${categoryScopeKey}:${index}`);
    const override = pageOverride || categoryOverride;
    const pageMobileSetting = mobileVisibility.get(`${scopeKey}:${index}`);
    const categoryMobileSetting = mobileVisibility.get(`${categoryScopeKey}:${index}`);
    return {
      index,
      title: video.title,
      episode: video.episode,
      defaultUrl: video.url,
      url: override?.videoUrl || video.url,
      isCustomized: Boolean(override),
      customizedAt: override?.updatedAt || null,
      isMobileVisible: effectiveMobileVisibility(index, pageMobileSetting, categoryMobileSetting),
      isMobileVisibilityCustomized: Boolean(pageMobileSetting || categoryMobileSetting)
    };
  });
  return {
    pageKey,
    scopeKey,
    categoryId,
    categoryName: category.name,
    mobileVisibleCount: videos.filter(video => video.isMobileVisible).length,
    videos
  };
}

async function getPublicVideosData(pageKey = '') {
  const data = JSON.parse(JSON.stringify(completedVideosData));
  const categoryId = categoryIdForPageKey(pageKey);
  const pageScopeKey = scopeKeyForPageKey(pageKey);
  const scopeKeys = data.categories.map(category => `category:${category.id}`);
  if (pageScopeKey.startsWith('page:')) scopeKeys.push(pageScopeKey);
  try {
    const overrides = await getOverrideMap([...new Set(scopeKeys)]);
    const mobileVisibility = await getMobileVisibilityMap([...new Set(scopeKeys)]);
    data.categories = data.categories.map(category => {
      const videos = category.videos.map((video, index) => {
        const categoryOverride = overrides.get(`category:${category.id}:${index}`);
        const pageOverride = category.id === categoryId
          ? overrides.get(`${pageScopeKey}:${index}`)
          : null;
        const categoryMobileSetting = mobileVisibility.get(`category:${category.id}:${index}`);
        const pageMobileSetting = category.id === categoryId
          ? mobileVisibility.get(`${pageScopeKey}:${index}`)
          : null;
        return videoWithUrl(
          video,
          pageOverride?.videoUrl || categoryOverride?.videoUrl || video.url,
          effectiveMobileVisibility(index, pageMobileSetting, categoryMobileSetting)
        );
      });
      return { ...category, videos };
    });
  } catch (error) {
    console.error('[Quote video links] Failed to load overrides:', error.message);
    data.categories = data.categories.map(category => ({
      ...category,
      videos: category.videos.map((video, index) => ({
        ...video,
        isMobileVisible: defaultMobileVisibility(index)
      }))
    }));
  }
  return data;
}

async function updateMobileVisibility(pageKey, videoIndex, isVisible) {
  const index = Number(videoIndex);
  if (!Number.isInteger(index) || index < 0 || index >= MAX_VISIBLE_VIDEOS) {
    throw new Error('Vị trí video không hợp lệ.');
  }
  if (typeof isVisible !== 'boolean') {
    throw new Error('Trạng thái hiển thị mobile không hợp lệ.');
  }

  const categoryId = categoryIdForPageKey(pageKey);
  const category = baseCategory(categoryId);
  if (!category.videos[index]) throw new Error('Video cần cập nhật không tồn tại.');

  const scopeKey = scopeKeyForPageKey(pageKey);
  const categoryScopeKey = `category:${categoryId}`;
  const visibility = await getMobileVisibilityMap([...new Set([scopeKey, categoryScopeKey])]);
  const videos = category.videos.slice(0, MAX_VISIBLE_VIDEOS);
  const visibleCount = videos.reduce((count, _video, currentIndex) => {
    const pageSetting = visibility.get(`${scopeKey}:${currentIndex}`);
    const categorySetting = visibility.get(`${categoryScopeKey}:${currentIndex}`);
    const currentVisible = currentIndex === index
      ? isVisible
      : effectiveMobileVisibility(currentIndex, pageSetting, categorySetting);
    return count + (currentVisible ? 1 : 0);
  }, 0);

  if (visibleCount > MAX_MOBILE_VISIBLE_VIDEOS) {
    throw new Error(`Chỉ được chọn tối đa ${MAX_MOBILE_VISIBLE_VIDEOS} video hiển thị trên mobile.`);
  }

  const row = await QuoteVideoMobileVisibility.findOneAndUpdate(
    { scopeKey, videoIndex: index },
    { $set: { isVisible, categoryId } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).lean();
  return { ...row, isMobileVisible: isVisible };
}

async function updateVideo(pageKey, videoIndex, videoUrl) {
  const index = Number(videoIndex);
  if (!Number.isInteger(index) || index < 0 || index >= MAX_VISIBLE_VIDEOS) {
    throw new Error('Vị trí video không hợp lệ.');
  }
  const categoryId = categoryIdForPageKey(pageKey);
  const category = baseCategory(categoryId);
  if (!category.videos[index]) throw new Error('Video cần cập nhật không tồn tại.');
  const canonicalUrl = canonicalYoutubeUrl(videoUrl);
  const scopeKey = scopeKeyForPageKey(pageKey);
  const row = await QuoteVideoLink.findOneAndUpdate(
    { scopeKey, videoIndex: index },
    { $set: { videoUrl: canonicalUrl, categoryId } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).lean();
  return { ...row, url: canonicalUrl, defaultUrl: category.videos[index].url };
}

async function resetVideo(pageKey, videoIndex) {
  const index = Number(videoIndex);
  if (!Number.isInteger(index) || index < 0 || index >= MAX_VISIBLE_VIDEOS) {
    throw new Error('Vị trí video không hợp lệ.');
  }
  const scopeKey = scopeKeyForPageKey(pageKey);
  await QuoteVideoLink.deleteOne({ scopeKey, videoIndex: index });
  const category = baseCategory(categoryIdForPageKey(pageKey));
  return { url: category.videos[index]?.url || '', defaultUrl: category.videos[index]?.url || '' };
}

module.exports = {
  MAX_VISIBLE_VIDEOS,
  categoryIdForPageKey,
  scopeKeyForPageKey,
  canonicalYoutubeUrl,
  getAdminVideos,
  getPublicVideosData,
  updateVideo,
  resetVideo,
  updateMobileVisibility,
  MAX_MOBILE_VISIBLE_VIDEOS
};
