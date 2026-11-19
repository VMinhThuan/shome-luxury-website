const multer = require('multer');
const constructionGalleryService = require('../services/constructionGalleryService');
const { uploadToCloudinary, destroyCloudinaryImage } = require('../utils/cloudinary');
const { processImageBuffer } = require('../utils/imageProcessing');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 100 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp)$/i.test(file.mimetype)) return cb(null, true);
    return cb(new Error('Chỉ hỗ trợ tải lên ảnh JPG, PNG hoặc WebP.'));
  }
});

exports.uploadMiddleware = (req, res, next) => upload.array('images', 100)(req, res, error => {
  if (!error) return next();
  return res.status(400).json({
    success: false,
    message: error.code === 'LIMIT_FILE_SIZE'
      ? 'Ảnh vượt quá dung lượng tối đa 10MB.'
      : error.message || 'Chỉ hỗ trợ tải lên ảnh JPG, PNG hoặc WebP.'
  });
});

exports.getPublic = async (req, res, next) => {
  try {
    const data = await constructionGalleryService.getGalleries(req.query.page);
    return res.json({ success: true, data });
  } catch (error) { return next(error); }
};

exports.getAdmin = async (req, res, next) => {
  try {
    const data = await constructionGalleryService.getGalleries(req.query.page);
    return res.json({ success: true, data });
  } catch (error) { return next(error); }
};

exports.uploadImages = async (req, res, next) => {
  const uploaded = [];
  try {
    const pageKey = constructionGalleryService.assertPageKey(req.params.pageKey);
    const sectionKey = constructionGalleryService.assertSectionKey(req.params.sectionKey);
    if (!req.files?.length) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn ít nhất một ảnh.' });
    }

    for (const file of req.files) {
      const processed = await processImageBuffer(file.buffer, { original_webp: 'true' });
      const result = await uploadToCloudinary(processed.buffer, `shome-luxury/construction-galleries/${pageKey}/${sectionKey}`);
      if (String(result.format || '').toLowerCase() !== 'webp') {
        if (result.public_id) await destroyCloudinaryImage(result.public_id).catch(() => null);
        throw new Error('Cloudinary không trả về ảnh WebP sau khi tối ưu.');
      }
      uploaded.push({
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        width: result.width || processed.optimized.width,
        height: result.height || processed.optimized.height,
        bytes: result.bytes || processed.optimized.bytes,
        alt: ''
      });
    }

    const images = await constructionGalleryService.addImages(pageKey, sectionKey, uploaded);
    return res.status(201).json({ success: true, message: `Đã lưu ${uploaded.length} ảnh.`, data: images });
  } catch (error) {
    await Promise.all(uploaded.filter(image => image.publicId).map(image => destroyCloudinaryImage(image.publicId).catch(() => null)));
    return next(error);
  }
};

exports.downloadImage = async (req, res, next) => {
  try {
    const image = await constructionGalleryService.getImage(req.params.pageKey, req.params.sectionKey, req.params.imageId);
    const response = await fetch(image.url);
    if (!response.ok) throw Object.assign(new Error('Không thể tải ảnh gallery.'), { status: 502 });

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'image/webp';
    const section = req.params.sectionKey === 'completed' ? 'hoan-cong' : 'dang-thi-cong';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="construction-${section}-${req.params.imageId}.webp"`);
    return res.send(buffer);
  } catch (error) { return next(error); }
};

exports.removeImage = async (req, res, next) => {
  try {
    const data = await constructionGalleryService.removeImage(req.params.pageKey, req.params.sectionKey, req.params.imageId);
    return res.json({ success: true, message: 'Đã xóa ảnh khỏi section.', data });
  } catch (error) { return next(error); }
};

exports.removeAllImages = async (req, res, next) => {
  try {
    const data = await constructionGalleryService.removeAllImages(req.params.pageKey, req.params.sectionKey);
    return res.json({ success: true, message: 'Đã xóa toàn bộ ảnh trong section.', data });
  } catch (error) { return next(error); }
};
