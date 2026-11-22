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
const { uploadToCloudinary, imageFormatsMatch, destroyCloudinaryImage } = require('../utils/cloudinary');
const { processImageBuffer } = require('../utils/imageProcessing');
const { IMAGE_MAX_FILE_SIZE } = require('../config/imageUpload');
const { getApartmentFallbackSlot } = require('../services/imageService');

const allConfiguredSlots = [...slots, ...subpageSlots];
const slotByKey = new Map(allConfiguredSlots.map(slot => [slot.image_key, slot]));
const publicDirectory = path.resolve(__dirname, '../../public');

// These benefit icons keep their website defaults and are no longer
// replaceable from the image-management screen.
const HIDDEN_ADMIN_IMAGE_KEYS = new Set([
  // The quote page now uses the desktop hero banners responsively. These
  // legacy mobile-only defaults are no longer editable image slots, so the
  // next visible quote images should be numbered 4, 5 and 6.
  'quote_hero_mobile_1',
  'quote_hero_mobile_2',
  'quote_hero_mobile_3',
  'quote_benefit_icon_1',
  'quote_benefit_icon_2',
  'quote_benefit_icon_3'
]);

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
  limits: { fileSize: IMAGE_MAX_FILE_SIZE },
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
  { key: 'profile', label: 'Hồ sơ năng lực' },
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

const customMobileReferenceFor = (record, slot) => {
  if (record?.custom_mobile_image_reference?.image_url) return {
    image_url: record.custom_mobile_image_reference.image_url,
    cloudinary_public_id: record.custom_mobile_image_reference.cloudinary_public_id || null
  };
  if (record?.mobile_image_url && record.mobile_image_url !== (slot.mobile_image_url || slot.image_url)) {
    return {
      image_url: record.mobile_image_url,
      cloudinary_public_id: record.mobile_cloudinary_public_id || null
    };
  }
  return null;
};

function resolveState(slot, recordsByKey) {
  const parentSlot = slot.parent_image_key ? slotByKey.get(slot.parent_image_key) : null;
  const fallbackSlot = getApartmentFallbackSlot(slot);
  const record = recordsByKey.get(slot.image_key);
  const custom = customReferenceFor(record, slot);
  const ownMobileCustom = customMobileReferenceFor(record, slot);
  const legacyMobileMatch = /^quote_hero_banner_(\d+)$/.exec(slot.image_key);
  const legacyMobileRecord = legacyMobileMatch && recordsByKey.get(`quote_hero_mobile_${legacyMobileMatch[1]}`);
  const legacyMobileCustom = legacyMobileRecord
    ? customReferenceFor(legacyMobileRecord, { image_url: slot.mobile_image_url || slot.image_url })
    : null;
  const mobileCustom = ownMobileCustom || legacyMobileCustom;
  const parentState = parentSlot && parentSlot.image_key !== slot.image_key
    ? resolveState(parentSlot, recordsByKey)
    : null;
  const fallbackState = fallbackSlot && fallbackSlot.image_key !== slot.image_key
    ? resolveState(fallbackSlot, recordsByKey)
    : null;

  return {
    mode: 'custom',
    custom,
    sharedReference: null,
    activeImageUrl: custom?.image_url || fallbackState?.activeImageUrl || parentState?.activeImageUrl || slot.image_url,
    activeCloudinaryPublicId: custom?.cloudinary_public_id || fallbackState?.activeCloudinaryPublicId || parentState?.activeCloudinaryPublicId || null,
    mobileCustom,
    activeMobileImageUrl: mobileCustom?.image_url || fallbackState?.activeMobileImageUrl || parentState?.activeMobileImageUrl || slot.mobile_image_url || slot.image_url,
    activeMobileCloudinaryPublicId: mobileCustom?.cloudinary_public_id || fallbackState?.activeMobileCloudinaryPublicId || parentState?.activeMobileCloudinaryPublicId || null,
    inheritedFrom: custom || !parentState ? null : {
      imageKey: parentSlot.image_key,
      label: parentSlot.label,
      imageUrl: parentState.activeImageUrl,
      mobileImageUrl: parentState.activeMobileImageUrl
    },
    sharedStatus: null,
    sharedSource: null
  };
}

const serializeSlot = (slot, record, recordsByKey) => {
  const state = resolveState(slot, recordsByKey);
  const isMobileOnlySlot = slot.image_key === 'quote_pricing_mobile_image_1'
    || slot.parent_image_key === 'quote_pricing_mobile_image_1';
  return {
    page_key: slot.page_key,
    pageKey: slot.page_key,
    page_label: isMobileOnlySlot
      ? `${slot.page_label || slot.page_key} — MOBILE`
      : (slot.page_label || slot.page_key),
    page_path: slot.page_path || null,
    section_key: slot.section_key,
    sectionKey: slot.section_key,
    image_key: slot.image_key,
    imageKey: slot.image_key,
    display_order: displayOrderForSlot(slot),
    displayOrder: displayOrderForSlot(slot),
    label: slot.label,
    default_image_url: slot.image_url,
    default_mobile_image_url: slot.mobile_image_url || slot.image_url,
    // Backward-compatible field: it always means the saved custom override.
    replacement_image_url: state.custom?.image_url || null,
    replacement_cloudinary_public_id: state.custom?.cloudinary_public_id || null,
    active_image_url: state.activeImageUrl,
    replacement_mobile_image_url: state.mobileCustom?.image_url || null,
    replacement_mobile_cloudinary_public_id: state.mobileCustom?.cloudinary_public_id || null,
    active_mobile_image_url: state.activeMobileImageUrl,
    is_responsive_banner: slot.section_key === 'hero',
    mode: state.mode,
    inherited_image_key: state.inheritedFrom?.imageKey || null,
    inherited_image_label: state.inheritedFrom?.label || null,
    inherited_image_url: state.inheritedFrom?.imageUrl || null,
    inherited_mobile_image_url: state.inheritedFrom?.mobileImageUrl || null,
    shared_image_reference: state.sharedReference,
    sharedImageReference: state.sharedReference,
    custom_image_reference: state.custom,
    customImageReference: state.custom,
    shared_status: state.sharedStatus,
    shared_source: state.sharedSource,
    shared_source_label: null,
    shared_sources: [],
    // Every slot uses the same 2K/WebP upload rule.
    preserve_original_file: false,
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
    const processed = await processImageBuffer(req.file.buffer);
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
    const images = Object.fromEntries(targetSlots.flatMap(slot => {
      const state = resolveState(slot, byKey);
      return [[slot.image_key, state.activeImageUrl], [`${slot.image_key}__mobile`, state.activeMobileImageUrl]];
    }));
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
    const variant = req.query.variant === 'mobile' ? 'mobile' : 'desktop';
    const state = resolveState(slot, recordsByKey);
    const imageUrl = variant === 'mobile' ? state.activeMobileImageUrl : state.activeImageUrl;
    const publicDirectory = path.resolve(__dirname, '../../public');
    const filenameStem = `${slot.image_key}-${variant}`.replace(/[^a-z0-9_-]/gi, '-');

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
    const variant = req.body?.variant === 'mobile' && slot.section_key === 'hero' ? 'mobile' : 'desktop';

    const folder = `shome-luxury/${slot.page_key || 'general'}`;
    const processed = await processImageBuffer(req.file.buffer);
    // Cloudinary receives the already-processed WebP directly. All slots,
    // including legacy background and hero slots, use the same 2K rule.
    uploaded = await uploadToCloudinary(processed.buffer, folder, { format: processed.optimized.format });
    if (!imageFormatsMatch(uploaded.format, processed.optimized.format)) {
      throw new Error(`Cloudinary trả về định dạng ${uploaded.format || 'không xác định'}, mong đợi ${processed.optimized.format}. Ảnh cũ vẫn được giữ nguyên.`);
    }
    const previous = await HomeImage.findOne({ image_key: slot.image_key }).lean();
    const previousCustom = variant === 'mobile'
      ? customMobileReferenceFor(previous, slot)
      : customReferenceFor(previous, slot);
    const customReference = {
      image_url: uploaded.secure_url,
      cloudinary_public_id: uploaded.public_id
    };
    const updateFields = variant === 'mobile'
      ? {
          mobile_image_url: uploaded.secure_url,
          mobile_cloudinary_public_id: uploaded.public_id,
          custom_mobile_image_reference: customReference
        }
      : {
          image_url: uploaded.secure_url,
          cloudinary_public_id: uploaded.public_id,
          custom_image_reference: customReference
        };
    const saved = await HomeImage.findOneAndUpdate(
      { image_key: slot.image_key },
      {
        $set: {
          page_key: slot.page_key,
          section_key: slot.section_key,
          mode: 'custom',
          shared_image_reference: null,
          ...updateFields
        },
        // A desktop upload already sets image_url, cloudinary_public_id and
        // custom_image_reference above. Repeating those paths in $setOnInsert
        // makes MongoDB reject the upsert with a path-conflict error. A mobile
        // upload still needs the desktop default fields when creating a new
        // document for the first time.
        ...(variant === 'mobile' ? {
          $setOnInsert: {
            image_url: slot.image_url,
            cloudinary_public_id: null,
            custom_image_reference: null
          }
        } : {})
      },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    // Only delete an old managed asset after the database commit and only if no
    // other slot still refers to it. Cleanup failures never roll back the new URL.
    if (previousCustom?.cloudinary_public_id && previousCustom.cloudinary_public_id !== uploaded.public_id) {
      const stillUsed = await HomeImage.exists({
        $or: [
          { cloudinary_public_id: previousCustom.cloudinary_public_id },
          { 'custom_image_reference.cloudinary_public_id': previousCustom.cloudinary_public_id },
          { mobile_cloudinary_public_id: previousCustom.cloudinary_public_id },
          { 'custom_mobile_image_reference.cloudinary_public_id': previousCustom.cloudinary_public_id }
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
            if (variant === 'desktop') page.sections.pricing.items[itemIndex].image = uploaded.secure_url;
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
      message: variant === 'mobile' ? 'Ảnh mobile đã được cập nhật.' : 'Ảnh desktop đã được cập nhật.',
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
    const variant = req.query.variant === 'mobile' && slot.section_key === 'hero' ? 'mobile' : 'desktop';

    const existing = await HomeImage.findOne({ image_key: slot.image_key }).lean();
    const legacyMobileMatch = variant === 'mobile' && /^quote_hero_banner_(\d+)$/.exec(slot.image_key);
    const legacyMobileKey = legacyMobileMatch ? `quote_hero_mobile_${legacyMobileMatch[1]}` : null;
    const legacyMobileSlot = legacyMobileKey ? slotByKey.get(legacyMobileKey) : null;
    const legacyMobileExisting = legacyMobileKey
      ? await HomeImage.findOne({ image_key: legacyMobileKey }).lean()
      : null;
    if (!existing && !legacyMobileExisting) {
      return res.json({ success: true, message: 'Ảnh đã ở trạng thái mặc định.' });
    }

    const custom = variant === 'mobile'
      ? customMobileReferenceFor(existing, slot)
        || customReferenceFor(legacyMobileExisting, legacyMobileSlot || { image_url: slot.mobile_image_url || slot.image_url })
      : customReferenceFor(existing, slot);
    const hasOtherVariant = variant === 'mobile'
      ? Boolean(customReferenceFor(existing, slot))
      : Boolean(customMobileReferenceFor(existing, slot));

    if (variant === 'mobile') {
      if (legacyMobileExisting) {
        await HomeImage.deleteOne({ image_key: legacyMobileKey });
      }
      if (!existing) {
        // The legacy quote mobile record was the only source for this variant.
      } else if (hasOtherVariant) {
        await HomeImage.updateOne({ image_key: slot.image_key }, {
          $unset: {
            mobile_image_url: 1,
            mobile_cloudinary_public_id: 1,
            custom_mobile_image_reference: 1
          }
        });
      } else {
        await HomeImage.deleteOne({ image_key: slot.image_key });
      }
    } else if (hasOtherVariant) {
      await HomeImage.updateOne({ image_key: slot.image_key }, {
        $set: {
          image_url: slot.image_url,
          cloudinary_public_id: null,
          custom_image_reference: null,
          mode: 'custom'
        }
      });
    } else {
      await HomeImage.deleteOne({ image_key: slot.image_key });
    }

    if (custom?.cloudinary_public_id) {
      const stillUsed = await HomeImage.exists({
        $or: [
          { cloudinary_public_id: custom.cloudinary_public_id },
          { 'custom_image_reference.cloudinary_public_id': custom.cloudinary_public_id },
          { mobile_cloudinary_public_id: custom.cloudinary_public_id },
          { 'custom_mobile_image_reference.cloudinary_public_id': custom.cloudinary_public_id }
        ]
      });
      if (!stillUsed) {
        destroyCloudinaryImage(custom.cloudinary_public_id).catch(err => console.error('[Home image delete cleanup]', err.message));
      }
    }

    if (variant === 'desktop' && slot.page_key === 'quote' && slot.section_key === 'pricing') {
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
      message: variant === 'mobile' ? 'Đã khôi phục ảnh mobile mặc định.' : 'Đã khôi phục ảnh desktop mặc định.',
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
