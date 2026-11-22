const mongoose = require('mongoose');
const ConstructionGallery = require('../models/ConstructionGallery');
const { destroyCloudinaryImage } = require('../utils/cloudinary');

const SECTION_KEYS = ['in-progress', 'completed'];
const FALLBACK_PAGE_KEY = 'tc-nt-chung-cu';
const CONSTRUCTION_PAGE_KEYS = new Set([
  'tc-kt-nha-cap-4', 'tc-kt-nha-pho', 'tc-kt-biet-thu', 'tc-kt-villa',
  'tc-nt-chung-cu', 'tc-nt-nha-pho', 'tc-nt-biet-thu', 'tc-nt-van-phong'
]);

const assertPageKey = pageKey => {
  if (!CONSTRUCTION_PAGE_KEYS.has(String(pageKey || ''))) {
    throw Object.assign(new Error('Menu thi công không hợp lệ.'), { status: 400 });
  }
  return String(pageKey);
};

const assertSectionKey = sectionKey => {
  if (!SECTION_KEYS.includes(String(sectionKey || ''))) {
    throw Object.assign(new Error('Section gallery không hợp lệ.'), { status: 400 });
  }
  return String(sectionKey);
};

const serializeImage = image => ({
  id: String(image._id || image.id || ''),
  url: image.url,
  publicId: image.publicId || null,
  format: image.format || 'webp',
  width: image.width || null,
  height: image.height || null,
  bytes: image.bytes || null,
  alt: image.alt || ''
});

const emptyResult = () => ({ 'in-progress': [], completed: [] });

async function getGalleries(pageKey) {
  assertPageKey(pageKey);
  const rows = await ConstructionGallery.find({ page_key: pageKey }).sort({ section_key: 1 }).lean();
  const result = emptyResult();
  rows.forEach(row => {
    if (result[row.section_key]) result[row.section_key] = (row.images || []).map(serializeImage);
  });
  return result;
}

async function getPublicGalleries(pageKey) {
  pageKey = assertPageKey(pageKey);
  const result = await getGalleries(pageKey);
  if (pageKey === FALLBACK_PAGE_KEY) return result;

  const hasMissingSection = SECTION_KEYS.some(sectionKey => result[sectionKey].length === 0);
  if (!hasMissingSection) return result;

  const fallback = await getGalleries(FALLBACK_PAGE_KEY);
  SECTION_KEYS.forEach(sectionKey => {
    if (result[sectionKey].length === 0) result[sectionKey] = fallback[sectionKey];
  });
  return result;
}

async function addImages(pageKey, sectionKey, images) {
  pageKey = assertPageKey(pageKey);
  sectionKey = assertSectionKey(sectionKey);
  if (!Array.isArray(images) || images.length === 0) {
    throw Object.assign(new Error('Chưa có ảnh để lưu.'), { status: 400 });
  }

  const saved = await ConstructionGallery.findOneAndUpdate(
    { page_key: pageKey, section_key: sectionKey },
    { $push: { images: { $each: images } } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  return (saved.images || []).map(serializeImage);
}

async function removeImage(pageKey, sectionKey, imageId) {
  pageKey = assertPageKey(pageKey);
  sectionKey = assertSectionKey(sectionKey);
  if (!mongoose.Types.ObjectId.isValid(imageId)) {
    throw Object.assign(new Error('Ảnh gallery không hợp lệ.'), { status: 400 });
  }

  const gallery = await ConstructionGallery.findOne({ page_key: pageKey, section_key: sectionKey });
  if (!gallery) return [];
  const image = gallery.images.id(imageId);
  if (!image) return gallery.images.map(serializeImage);
  const publicId = image.publicId;
  gallery.images.pull(imageId);
  await gallery.save();
  if (publicId) {
    await destroyCloudinaryImage(publicId).catch(error => {
      console.error('[Construction gallery cleanup]', error.message);
    });
  }
  return gallery.images.map(serializeImage);
}

async function removeAllImages(pageKey, sectionKey) {
  pageKey = assertPageKey(pageKey);
  sectionKey = assertSectionKey(sectionKey);
  const gallery = await ConstructionGallery.findOne({ page_key: pageKey, section_key: sectionKey });
  if (!gallery) return [];

  const publicIds = gallery.images.map(image => image.publicId).filter(Boolean);
  await ConstructionGallery.deleteOne({ _id: gallery._id });
  await Promise.all(publicIds.map(publicId => destroyCloudinaryImage(publicId).catch(error => {
    console.error('[Construction gallery bulk cleanup]', error.message);
  })));
  return [];
}

async function getImage(pageKey, sectionKey, imageId) {
  pageKey = assertPageKey(pageKey);
  sectionKey = assertSectionKey(sectionKey);
  if (!mongoose.Types.ObjectId.isValid(imageId)) {
    throw Object.assign(new Error('Ảnh gallery không hợp lệ.'), { status: 400 });
  }

  const gallery = await ConstructionGallery.findOne({ page_key: pageKey, section_key: sectionKey }).lean();
  const image = gallery?.images?.find(item => String(item._id) === String(imageId));
  if (!image) throw Object.assign(new Error('Không tìm thấy ảnh gallery.'), { status: 404 });
  return serializeImage(image);
}

module.exports = {
  SECTION_KEYS,
  CONSTRUCTION_PAGE_KEYS,
  assertPageKey,
  assertSectionKey,
  getGalleries,
  getPublicGalleries,
  addImages,
  getImage,
  removeImage,
  removeAllImages
};
