const multer = require('multer');
const HomeImage = require('../models/HomeImage');
const slots = require('../data/homeImageSlots');
const { uploadToCloudinary, destroyCloudinaryImage } = require('../utils/cloudinary');

const slotByKey = new Map(slots.map(slot => [slot.image_key, slot]));
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\/(jpeg|png|webp)$/i.test(file.mimetype))
});

exports.uploadMiddleware = upload.single('image');

exports.getPublicImages = async (req, res, next) => {
  try {
    const saved = await HomeImage.find({ image_key: { $in: slots.map(slot => slot.image_key) } }).lean();
    const byKey = new Map(saved.map(item => [item.image_key, item]));
    const images = Object.fromEntries(slots.map(slot => [slot.image_key, byKey.get(slot.image_key)?.image_url || slot.image_url]));
    return res.json({ success: true, data: images });
  } catch (error) { next(error); }
};

exports.getAdminImages = async (req, res, next) => {
  try {
    const saved = await HomeImage.find({ image_key: { $in: slots.map(slot => slot.image_key) } }).lean();
    const byKey = new Map(saved.map(item => [item.image_key, item]));
    return res.json({ success: true, data: slots.map(slot => {
      const replacement = byKey.get(slot.image_key);
      return {
        section_key: slot.section_key,
        image_key: slot.image_key,
        label: slot.label,
        default_image_url: slot.image_url,
        replacement_image_url: replacement?.image_url || null,
        updated_at: replacement?.updated_at || null
      };
    }) });
  } catch (error) { next(error); }
};

exports.updateImage = async (req, res, next) => {
  let uploaded;
  try {
    const slot = slotByKey.get(req.params.imageKey);
    if (!slot) return res.status(404).json({ success: false, message: 'Vị trí ảnh không hợp lệ.' });
    if (!req.file) return res.status(400).json({ success: false, message: 'Vui lòng chọn ảnh JPG, PNG hoặc WebP (tối đa 10 MB).' });

    const crop = ['x', 'y', 'width', 'height'].reduce((out, key) => ({ ...out, [key]: Number(req.body[key]) }), {});
    if (!Object.values(crop).every(Number.isFinite) || crop.x < 0 || crop.y < 0 || crop.width <= 0 || crop.height <= 0 || Math.abs(crop.width / crop.height - 16 / 9) > 0.015) {
      return res.status(400).json({ success: false, message: 'Vùng cắt phải hợp lệ và đúng tỷ lệ 16:9.' });
    }

    uploaded = await uploadToCloudinary(req.file.buffer, 'shome-luxury/homepage', {
      format: 'webp',
      transformation: [
        { crop: 'crop', x: Math.round(crop.x), y: Math.round(crop.y), width: Math.round(crop.width), height: Math.round(crop.height) },
        { width: 1920, height: 1080, crop: 'limit' },
        { fetch_format: 'webp' }
      ]
    });
    const previous = await HomeImage.findOne({ image_key: slot.image_key }).lean();
    const saved = await HomeImage.findOneAndUpdate(
      { image_key: slot.image_key },
      { $set: { section_key: slot.section_key, image_url: uploaded.secure_url, cloudinary_public_id: uploaded.public_id } },
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
