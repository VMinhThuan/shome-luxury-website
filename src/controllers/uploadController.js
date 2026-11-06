const multer = require("multer");
const { uploadToCloudinary } = require("../utils/cloudinary");
const { processImageBuffer } = require('../utils/imageProcessing');

// Multer memory storage configuration (in-memory buffer for streaming to Cloudinary)
const storage = multer.memoryStorage();

// File filter: Only allow image MIME types
const fileFilter = (req, file, cb) => {
  if (/^image\/(jpeg|png|webp)$/i.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ hỗ trợ tải lên ảnh JPG, PNG hoặc WebP!"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // Max 10MB
  }
});

// Middleware for single image upload with field name 'image' or 'file'
const uploadSingle = upload.single("image");
const uploadSingleMiddleware = (req, res, next) => uploadSingle(req, res, (error) => {
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.code === 'LIMIT_FILE_SIZE'
        ? 'Ảnh vượt quá dung lượng tối đa 10MB.'
        : error.message || 'Tệp ảnh không hợp lệ.'
    });
  }
  return next();
});

// Controller action to process Cloudinary upload
const handleImageUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn 1 hình ảnh để tải lên!"
      });
    }

    const folder = String(req.body.folder || "shome-luxury/recruitment");

    const isProjectAsset = folder === 'shome-luxury/projects' || folder.startsWith('shome-luxury/projects/');
    const processingBody = isProjectAsset
      ? {
          ...req.body,
          resize_preset: 'project',
          quality: req.body.quality || '100',
          sharpness: req.body.sharpness || '100'
        }
      : req.body;
    const processed = await processImageBuffer(req.file.buffer, processingBody);
    // Upload the already-encoded WebP directly. Keep Cloudinary free of a
    // second transformation/quality decision.
    const result = await uploadToCloudinary(processed.buffer, folder);
    if (isProjectAsset && String(result.format || '').toLowerCase() !== 'webp') {
      throw new Error('Cloudinary không trả về ảnh WebP sau khi tối ưu. Ảnh cũ vẫn được giữ nguyên.');
    }

    return res.status(200).json({
      success: true,
      message: "Tải ảnh lên Cloudinary thành công!",
      data: {
        url: result.secure_url,
        secure_url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        processing: {
          original: processed.original,
          optimized: processed.optimized,
          settings: processed.settings
        }
      }
    });
  } catch (error) {
    console.error("[Upload Error]", error);
    const validationError = /Tệp tải lên|Chỉ hỗ trợ|vượt giới hạn|Vùng cắt|Chất lượng WebP|Độ sắc nét/i.test(error.message || '');
    return res.status(validationError ? 400 : 500).json({
      success: false,
      message: error.message || "Lỗi khi tải ảnh lên Cloudinary.",
      error: error.message
    });
  }
};

module.exports = {
  uploadSingleMiddleware,
  handleImageUpload
};
