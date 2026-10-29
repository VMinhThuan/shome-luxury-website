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
const uploadSingleMiddleware = upload.single("image");

// Controller action to process Cloudinary upload
const handleImageUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn 1 hình ảnh để tải lên!"
      });
    }

    const folder = req.body.folder || "shome-luxury/recruitment";

    const processed = await processImageBuffer(req.file.buffer, req.body);
    // Upload the already-encoded WebP directly. Keep Cloudinary free of a
    // second transformation/quality decision.
    const result = await uploadToCloudinary(processed.buffer, folder);

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
    return res.status(500).json({
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
