const multer = require('multer');
const path = require('path');
const HomeImage = require('../models/HomeImage');
const slots = require('../data/homeImageSlots');
const { uploadToCloudinary, destroyCloudinaryImage } = require('../utils/cloudinary');

const slotByKey = new Map(slots.map(slot => [slot.image_key, slot]));
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
  { key: 'booking', label: 'Đặt lịch tư vấn' }
];

exports.uploadMiddleware = upload.single('image');

exports.getPublicImages = async (req, res, next) => {
  try {
    const pageFilter = req.query.page;
    const targetSlots = pageFilter && pageFilter !== 'all'
      ? slots.filter(s => s.page_key === pageFilter)
      : slots;

    const saved = await HomeImage.find({ image_key: { $in: targetSlots.map(slot => slot.image_key) } }).lean();
    const byKey = new Map(saved.map(item => [item.image_key, item]));
    const images = Object.fromEntries(targetSlots.map(slot => [slot.image_key, byKey.get(slot.image_key)?.image_url || slot.image_url]));
    return res.json({ success: true, data: images });
  } catch (error) { next(error); }
};

exports.getAdminImages = async (req, res, next) => {
  try {
    const pageFilter = req.query.page;
    const targetSlots = pageFilter && pageFilter !== 'all'
      ? slots.filter(slot => slot.page_key === pageFilter)
      : slots;

    const saved = await HomeImage.find({ image_key: { $in: targetSlots.map(slot => slot.image_key) } }).lean();
    const byKey = new Map(saved.map(item => [item.image_key, item]));

    const pagesWithCounts = PAGES_LIST.map(p => ({
      key: p.key,
      label: p.label,
      count: p.key === 'all' ? slots.length : slots.filter(s => s.page_key === p.key).length
    }));

    return res.json({
      success: true,
      pages: pagesWithCounts,
      data: targetSlots.map(slot => {
        const replacement = byKey.get(slot.image_key);
        return {
          page_key: slot.page_key,
          page_label: slot.page_label || slot.page_key,
          section_key: slot.section_key,
          image_key: slot.image_key,
          label: slot.label,
          default_image_url: slot.image_url,
          replacement_image_url: replacement?.image_url || null,
          updated_at: replacement?.updated_at || null
        };
      })
    });
  } catch (error) { next(error); }
};

exports.downloadImage = async (req, res, next) => {
  try {
    const slot = slotByKey.get(req.params.imageKey);
    if (!slot) return res.status(404).json({ success: false, message: 'Vị trí ảnh không hợp lệ.' });

    const replacement = await HomeImage.findOne({ image_key: slot.image_key }).lean();
    const imageUrl = replacement?.image_url || slot.image_url;
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
    const useOriginal = req.body.use_original === 'true' || req.body.mode === 'original' || !req.body.width;
    let transformation;

    if (useOriginal) {
      // Mặc định: Dùng ảnh gốc, tự động vừa khít khung 16:9 và tối ưu WebP
      transformation = [
        { width: 1920, height: 1080, crop: 'fill', gravity: 'auto' },
        { fetch_format: 'webp' }
      ];
    } else {
      const crop = ['x', 'y', 'width', 'height'].reduce((out, key) => ({ ...out, [key]: Number(req.body[key]) }), {});
      if (Object.values(crop).every(Number.isFinite) && crop.x >= 0 && crop.y >= 0 && crop.width > 0 && crop.height > 0) {
        transformation = [
          { crop: 'crop', x: Math.round(crop.x), y: Math.round(crop.y), width: Math.round(crop.width), height: Math.round(crop.height) },
          { width: 1920, height: 1080, crop: 'limit' },
          { fetch_format: 'webp' }
        ];
      } else {
        transformation = [
          { width: 1920, height: 1080, crop: 'fill', gravity: 'auto' },
          { fetch_format: 'webp' }
        ];
      }
    }

    uploaded = await uploadToCloudinary(req.file.buffer, folder, {
      format: 'webp',
      transformation
    });
    const previous = await HomeImage.findOne({ image_key: slot.image_key }).lean();
    const saved = await HomeImage.findOneAndUpdate(
      { image_key: slot.image_key },
      { $set: { page_key: slot.page_key, section_key: slot.section_key, image_url: uploaded.secure_url, cloudinary_public_id: uploaded.public_id } },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    // Only delete an old managed asset after the database commit and only if no
    // other slot still refers to it. Cleanup failures never roll back the new URL.
    if (previous?.cloudinary_public_id && previous.cloudinary_public_id !== uploaded.public_id) {
      const stillUsed = await HomeImage.exists({ image_key: { $ne: slot.image_key }, cloudinary_public_id: previous.cloudinary_public_id });
      if (!stillUsed) destroyCloudinaryImage(previous.cloudinary_public_id).catch(error => console.error('[Home image cleanup]', error.message));
    }
    return res.json({ success: true, message: 'Ảnh đã được cập nhật.', data: saved });
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

    await HomeImage.deleteOne({ image_key: slot.image_key });

    if (existing.cloudinary_public_id) {
      const stillUsed = await HomeImage.exists({ cloudinary_public_id: existing.cloudinary_public_id });
      if (!stillUsed) {
        destroyCloudinaryImage(existing.cloudinary_public_id).catch(err => console.error('[Home image delete cleanup]', err.message));
      }
    }

    return res.json({ success: true, message: 'Đã khôi phục ảnh mặc định.' });
  } catch (error) {
    return next(error);
  }
};
