const multer = require('multer');
const path = require('path');
const HomeImage = require('../models/HomeImage');
const slots = require('../data/homeImageSlots');
const subpageSlots = require('../data/subpageImageSlots');
const subpageList = subpageSlots.subpageList || [...new Map(subpageSlots.map(slot => [slot.page_key, {
  key: slot.page_key,
  label: slot.page_label,
  path: slot.page_path
}])).values()];
const { uploadToCloudinary, destroyCloudinaryImage } = require('../utils/cloudinary');
const { processImageBuffer } = require('../utils/imageProcessing');

const allConfiguredSlots = [...slots, ...subpageSlots];
const slotByKey = new Map(allConfiguredSlots.map(slot => [slot.image_key, slot]));
const SOURCE_PRESERVING_IMAGE_KEYS = new Set([
  'about_showroom_background',
  'why_choose_background',
  'home_workshop_background',
  'home_faq_background',
  'quote_construction_cta_image'
]);

// These benefit icons keep their website defaults and are no longer
// replaceable from the image-management screen.
const HIDDEN_ADMIN_IMAGE_KEYS = new Set([
  'quote_benefit_icon_1',
  'quote_benefit_icon_2',
  'quote_benefit_icon_3'
]);

const preservesOriginalFile = slot => SOURCE_PRESERVING_IMAGE_KEYS.has(slot.image_key);

const subpageByKey = new Map();
subpageSlots.forEach(slot => {
  if (!subpageByKey.has(slot.page_key)) subpageByKey.set(slot.page_key, []);
  subpageByKey.get(slot.page_key).push(slot);
});

const isAdminVisibleSlot = slot => !HIDDEN_ADMIN_IMAGE_KEYS.has(slot.image_key)
  && !HIDDEN_ADMIN_IMAGE_KEYS.has(slot.parent_image_key);

const displayOrderForSlot = slot => {
  const pageSlots = subpageByKey.has(slot.page_key)
    ? subpageByKey.get(slot.page_key)
    : slots.filter(item => item.page_key === slot.page_key);
  const index = pageSlots.filter(isAdminVisibleSlot)
    .findIndex(item => item.image_key === slot.image_key);
  return index >= 0 ? index + 1 : null;
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\/(jpeg|png|webp)$/i.test(file.mimetype))
});

const PAGES_LIST = [
  { key: 'all', label: 'Tất cả trang' },
  { key: 'home', label: 'Trang chủ' },
  { key: 'factory', label: 'Xưởng sản xuất' },
  { key: 'quote', label: 'Báo giá' },
  { key: 'news', label: 'Tin tức' },
  { key: 'recruitment', label: 'Tuyển dụng' },
  { key: 'booking', label: 'Đặt lịch tư vấn' },
  { key: 'project-detail', label: 'Chi tiết công trình' }
];

exports.uploadMiddleware = upload.single('image');

const customReferenceFor = (record, slot) => {
  if (record?.custom_image_reference?.image_url) return {
    image_url: record.custom_image_reference.image_url,
    cloudinary_public_id: record.custom_image_reference.cloudinary_public_id || null
  };

  // Existing documents predate modes. Their image_url is the custom override
  // and must be mapped lazily without rewriting production data.
  if (record && record.mode !== 'shared' && record.image_url
    && (record.image_url !== slot.image_url || record.cloudinary_public_id)) {
    return {
      image_url: record.image_url,
      cloudinary_public_id: record.cloudinary_public_id || null
    };
  }
  return null;
};

function resolveState(slot, recordsByKey) {
  const parentSlot = slot.parent_image_key ? slotByKey.get(slot.parent_image_key) : null;
  const record = recordsByKey.get(slot.image_key);
  const custom = customReferenceFor(record, slot);
  const parentState = parentSlot && parentSlot.image_key !== slot.image_key
    ? resolveState(parentSlot, recordsByKey)
    : null;

  return {
    mode: 'custom',
    custom,
    sharedReference: null,
    activeImageUrl: custom?.image_url || parentState?.activeImageUrl || slot.image_url,
    activeCloudinaryPublicId: custom?.cloudinary_public_id || parentState?.activeCloudinaryPublicId || null,
    inheritedFrom: custom || !parentState ? null : {
      imageKey: parentSlot.image_key,
      label: parentSlot.label,
      imageUrl: parentState.activeImageUrl
    },
    sharedStatus: null,
    sharedSource: null
  };
}

const serializeSlot = (slot, record, recordsByKey) => {
  const state = resolveState(slot, recordsByKey);
  return {
    page_key: slot.page_key,
    pageKey: slot.page_key,
    page_label: slot.page_label || slot.page_key,
    page_path: slot.page_path || null,
    section_key: slot.section_key,
    sectionKey: slot.section_key,
    image_key: slot.image_key,
    imageKey: slot.image_key,
    display_order: displayOrderForSlot(slot),
    displayOrder: displayOrderForSlot(slot),
    label: slot.label,
    default_image_url: slot.image_url,
    // Backward-compatible field: it always means the saved custom override.
    replacement_image_url: state.custom?.image_url || null,
    replacement_cloudinary_public_id: state.custom?.cloudinary_public_id || null,
    active_image_url: state.activeImageUrl,
    mode: state.mode,
    inherited_image_key: state.inheritedFrom?.imageKey || null,
    inherited_image_label: state.inheritedFrom?.label || null,
    inherited_image_url: state.inheritedFrom?.imageUrl || null,
    shared_image_reference: state.sharedReference,
    sharedImageReference: state.sharedReference,
    custom_image_reference: state.custom,
    customImageReference: state.custom,
    shared_status: state.sharedStatus,
    shared_source: state.sharedSource,
    shared_source_label: null,
    shared_sources: [],
    preserve_original_file: preservesOriginalFile(slot),
    updated_at: record?.updated_at || null
  };
};

const requestedSlots = (pageFilter) => {
  if (!pageFilter || pageFilter === 'all') return slots;
  const subpageKey = pageFilter.startsWith('subpage:') ? pageFilter.slice('subpage:'.length) : pageFilter;
  if (subpageByKey.has(subpageKey)) return subpageByKey.get(subpageKey);
  return slots.filter(slot => slot.page_key === pageFilter);
};

const allRecords = async () => {
  const saved = await HomeImage.find({ image_key: { $in: [...allConfiguredSlots.map(slot => slot.image_key), 'news_hero_banner'] } }).lean();
  const records = new Map(saved.map(item => [item.image_key, item]));
  // Backward compatibility for the old one-slot Tin tức banner.
  if (!records.has('news_hero_banner_1') && records.has('news_hero_banner')) {
    records.set('news_hero_banner_1', records.get('news_hero_banner'));
  }
  return records;
};

exports.previewImage = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Vui lòng chọn ảnh JPG, PNG hoặc WebP để xem trước.' });
    const processed = await processImageBuffer(req.file.buffer, { original_webp: 'true' });
    res.set({
      'Content-Type': processed.optimized.contentType,
      'Content-Length': String(processed.optimized.bytes),
      'X-Original-Width': String(processed.original.width),
      'X-Original-Height': String(processed.original.height),
      'X-Original-Bytes': String(processed.original.bytes),
      'X-Optimized-Width': String(processed.optimized.width),
      'X-Optimized-Height': String(processed.optimized.height),
      'X-Optimized-Bytes': String(processed.optimized.bytes),
      'X-Optimized-Format': processed.optimized.format,
      'X-Image-Quality': processed.settings.preserveOriginalFile
        ? 'original'
        : processed.settings.lossless ? 'lossless' : String(processed.settings.quality),
      'X-Image-Sharpness': String(processed.settings.sharpness),
      'Access-Control-Expose-Headers': 'Content-Length, X-Original-Width, X-Original-Height, X-Original-Bytes, X-Optimized-Width, X-Optimized-Height, X-Optimized-Bytes, X-Optimized-Format, X-Image-Quality, X-Image-Sharpness',
      'Cache-Control': 'no-store'
    });
    return res.send(processed.buffer);
  } catch (error) {
    return next(error);
  }
};

exports.getPublicImages = async (req, res, next) => {
  try {
    const pageFilter = req.query.page;
    const targetSlots = requestedSlots(pageFilter);
    const byKey = await allRecords();
    const images = Object.fromEntries(targetSlots.map(slot => [slot.image_key, resolveState(slot, byKey).activeImageUrl]));
    return res.json({ success: true, data: images });
  } catch (error) { next(error); }
};

exports.getAdminImages = async (req, res, next) => {
  try {
    const pageFilter = req.query.page;
    const targetSlots = requestedSlots(pageFilter).filter(isAdminVisibleSlot);
    const byKey = await allRecords();

    const pagesWithCounts = PAGES_LIST.map(p => ({
      key: p.key,
      label: p.label,
      count: p.key === 'all'
        ? slots.filter(isAdminVisibleSlot).length
        : slots.filter(s => s.page_key === p.key && isAdminVisibleSlot(s)).length
    }));

    return res.json({
      success: true,
      pages: pagesWithCounts,
      subpages: subpageList,
      data: targetSlots.map(slot => serializeSlot(slot, byKey.get(slot.image_key), byKey))
    });
  } catch (error) { next(error); }
};

exports.downloadImage = async (req, res, next) => {
  try {
    const slot = slotByKey.get(req.params.imageKey);
    if (!slot) return res.status(404).json({ success: false, message: 'Vị trí ảnh không hợp lệ.' });

    const recordsByKey = await allRecords();
    const state = resolveState(slot, recordsByKey);
    const imageUrl = state.activeImageUrl;
    const publicDirectory = path.resolve(__dirname, '../../public');
    const filenameStem = slot.image_key.replace(/[^a-z0-9_-]/gi, '-');

    if (imageUrl.startsWith('/images/')) {
      const imagePath = path.resolve(publicDirectory, `.${imageUrl}`);
      if (!imagePath.startsWith(`${publicDirectory}${path.sep}`)) {
        return res.status(400).json({ success: false, message: 'Đường dẫn ảnh không hợp lệ.' });
      }
      return res.download(imagePath, `${filenameStem}${path.extname(imagePath)}`);
    }

    let remoteUrl;
    try {
      remoteUrl = new URL(imageUrl);
    } catch (error) {
      return res.status(400).json({ success: false, message: 'Không thể tải ảnh hiện tại.' });
    }
    if (remoteUrl.protocol !== 'https:' || remoteUrl.hostname !== 'res.cloudinary.com') {
      return res.status(400).json({ success: false, message: 'Nguồn ảnh tải xuống không được hỗ trợ.' });
    }

    const remoteResponse = await fetch(remoteUrl);
    if (!remoteResponse.ok) {
      return res.status(502).json({ success: false, message: 'Không thể tải ảnh từ kho lưu trữ.' });
    }
    const contentType = (remoteResponse.headers.get('content-type') || 'application/octet-stream').split(';')[0];
    if (!contentType.startsWith('image/')) {
      return res.status(502).json({ success: false, message: 'Tệp tải về không phải là ảnh hợp lệ.' });
    }
    const extensions = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif' };
    const imageBuffer = Buffer.from(await remoteResponse.arrayBuffer());
    res.set({
      'Content-Type': contentType,
      'Content-Length': imageBuffer.length,
      'Content-Disposition': `attachment; filename="${filenameStem}${extensions[contentType] || '.img'}"`,
      'Cache-Control': 'no-store'
    });
    return res.send(imageBuffer);
  } catch (error) {
    return next(error);
  }
};

exports.updateImage = async (req, res, next) => {
  let uploaded;
  try {
    const slot = slotByKey.get(req.params.imageKey);
    if (!slot) return res.status(404).json({ success: false, message: 'Vị trí ảnh không hợp lệ.' });
    if (!req.file) return res.status(400).json({ success: false, message: 'Vui lòng chọn ảnh JPG, PNG hoặc WebP (tối đa 10 MB).' });

    const folder = `shome-luxury/${slot.page_key || 'general'}`;
    const processed = await processImageBuffer(req.file.buffer, {
      // Page image uploads always preserve the customer's dimensions and only
      // convert the source to WebP at quality 100.
      original_webp: 'true'
    });
    // Cloudinary receives the final WebP bytes directly. Every page image
    // keeps the customer's dimensions and is encoded at quality 100.
    uploaded = await uploadToCloudinary(processed.buffer, folder);
    const previous = await HomeImage.findOne({ image_key: slot.image_key }).lean();
    const previousCustom = customReferenceFor(previous, slot);
    const saved = await HomeImage.findOneAndUpdate(
      { image_key: slot.image_key },
      {
        $set: {
          page_key: slot.page_key,
          section_key: slot.section_key,
          image_url: uploaded.secure_url,
          cloudinary_public_id: uploaded.public_id,
          mode: 'custom',
          shared_image_reference: null,
          custom_image_reference: {
            image_url: uploaded.secure_url,
            cloudinary_public_id: uploaded.public_id
          }
        }
      },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    // Only delete an old managed asset after the database commit and only if no
    // other slot still refers to it. Cleanup failures never roll back the new URL.
    if (previousCustom?.cloudinary_public_id && previousCustom.cloudinary_public_id !== uploaded.public_id) {
      const stillUsed = await HomeImage.exists({
        $or: [
          { cloudinary_public_id: previousCustom.cloudinary_public_id },
          { 'custom_image_reference.cloudinary_public_id': previousCustom.cloudinary_public_id }
        ],
        image_key: { $ne: slot.image_key }
      });
      if (!stillUsed) destroyCloudinaryImage(previousCustom.cloudinary_public_id).catch(error => console.error('[Home image cleanup]', error.message));
    }

    // Sync to QuotePage if updating pricing images
    if (slot.page_key === 'quote' && slot.section_key === 'pricing') {
      const itemIndex = parseInt(slot.image_key.replace('quote_pricing_image_', ''), 10) - 1;
      if (!isNaN(itemIndex) && itemIndex >= 0) {
        try {
          const QuotePage = require('../models/QuotePage');
          const page = await QuotePage.findOne({ key: 'main' });
          if (page && page.sections?.pricing?.items?.[itemIndex]) {
            page.sections.pricing.items[itemIndex].image = uploaded.secure_url;
            page.markModified('sections');
            await page.save();
          }
        } catch (syncErr) {
          console.error('[Sync HomeImage to QuotePage error]', syncErr.message);
        }
      }
    }

    return res.json({
      success: true,
      message: 'Ảnh đã được cập nhật.',
      data: {
        ...saved,
        ...serializeSlot(slot, saved, new Map([[slot.image_key, saved]])),
        processing: {
          original: processed.original,
          optimized: processed.optimized,
          settings: processed.settings
        }
      }
    });
  } catch (error) {
    if (uploaded?.public_id) destroyCloudinaryImage(uploaded.public_id).catch(cleanupError => console.error('[Home image rollback]', cleanupError.message));
    return next(error);
  }
};

exports.deleteImage = async (req, res, next) => {
  try {
    const slot = slotByKey.get(req.params.imageKey);
    if (!slot) return res.status(404).json({ success: false, message: 'Vị trí ảnh không hợp lệ.' });

    const existing = await HomeImage.findOne({ image_key: slot.image_key }).lean();
    if (!existing) {
      return res.json({ success: true, message: 'Ảnh đã ở trạng thái mặc định.' });
    }

    const custom = customReferenceFor(existing, slot);

    await HomeImage.deleteOne({ image_key: slot.image_key });

    if (custom?.cloudinary_public_id) {
      const stillUsed = await HomeImage.exists({
        $or: [
          { cloudinary_public_id: custom.cloudinary_public_id },
          { 'custom_image_reference.cloudinary_public_id': custom.cloudinary_public_id }
        ]
      });
      if (!stillUsed) {
        destroyCloudinaryImage(custom.cloudinary_public_id).catch(err => console.error('[Home image delete cleanup]', err.message));
      }
    }

    if (slot.page_key === 'quote' && slot.section_key === 'pricing') {
      const itemIndex = parseInt(slot.image_key.replace('quote_pricing_image_', ''), 10) - 1;
      if (!isNaN(itemIndex) && itemIndex >= 0) {
        try {
          const QuotePage = require('../models/QuotePage');
          const page = await QuotePage.findOne({ key: 'main' });
          if (page && page.sections?.pricing?.items?.[itemIndex]) {
            page.sections.pricing.items[itemIndex].image = slot.image_url;
            page.markModified('sections');
            await page.save();
          }
        } catch (syncErr) {
          console.error('[Sync HomeImage to QuotePage delete error]', syncErr.message);
        }
      }
    }

    const recordsByKey = await allRecords();
    return res.json({
      success: true,
      message: 'Đã khôi phục ảnh mặc định.',
      data: serializeSlot(slot, null, recordsByKey)
    });
  } catch (error) {
    return next(error);
  }
};

exports.setImageMode = async (req, res, next) => {
  try {
    const slot = slotByKey.get(req.params.imageKey);
    if (!slot) return res.status(404).json({ success: false, message: 'Vị trí ảnh không hợp lệ.' });

    const requestedMode = req.body?.mode;
    if (requestedMode === 'shared') {
      return res.status(410).json({
        success: false,
        message: 'Tính năng dùng ảnh chung đã được gỡ bỏ. Mỗi vị trí ảnh sử dụng ảnh riêng.'
      });
    }
    if (requestedMode !== 'custom') {
      return res.status(400).json({ success: false, message: 'Nguồn hình ảnh không hợp lệ.' });
    }

    const existing = await HomeImage.findOne({ image_key: slot.image_key }).lean();
    const recordsByKey = await allRecords();
    const custom = customReferenceFor(existing, slot);

    const activeImageUrl = custom?.image_url || slot.image_url;
    const saved = existing
      ? await HomeImage.findOneAndUpdate(
        { image_key: slot.image_key },
        {
          $set: {
            page_key: slot.page_key,
            section_key: slot.section_key,
            image_url: activeImageUrl,
            cloudinary_public_id: custom?.cloudinary_public_id || null,
            mode: 'custom',
            shared_image_reference: null,
            custom_image_reference: custom
          }
        },
        { new: true, runValidators: true }
      ).lean()
      : await HomeImage.findOneAndUpdate(
        { image_key: slot.image_key },
        {
          $set: {
            page_key: slot.page_key,
            section_key: slot.section_key,
            image_url: slot.image_url,
            cloudinary_public_id: null,
            mode: 'custom',
            shared_image_reference: null,
            custom_image_reference: null
          }
        },
        { new: true, upsert: true, runValidators: true }
      ).lean();
    const currentRecords = new Map(recordsByKey);
    currentRecords.set(slot.image_key, saved);
    return res.json({ success: true, message: custom ? 'Đã khôi phục ảnh riêng đã lưu.' : 'Đã chuyển sang dùng ảnh riêng.', data: serializeSlot(slot, saved, currentRecords) });
  } catch (error) {
    return next(error);
  }
};
