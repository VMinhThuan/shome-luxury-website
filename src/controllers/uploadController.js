const multer = require("multer");
const crypto = require('crypto');
const { uploadToCloudinary, uploadToCloudinaryWithRetry, isRetryableUploadError, imageFormatsMatch, destroyCloudinaryImage } = require("../utils/cloudinary");
const { processImageBuffer } = require('../utils/imageProcessing');
const projectService = require('../services/projectService');
const { mapWithConcurrency } = require('../utils/async');
const {
  GALLERY_UPLOAD_BATCH_SIZE,
  GALLERY_UPLOAD_CONCURRENCY,
  IMAGE_MAX_FILE_SIZE,
  IMAGE_WEBP_QUALITY
} = require('../config/imageUpload');

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
    fileSize: IMAGE_MAX_FILE_SIZE // Max 10MB by default
  }
});

// The batch endpoint validates the actual bytes with Sharp below. Accepting
// the MIME header here lets one bad file fail independently while the other
// files in the same batch can still be processed and reported as successful.
const galleryBatchUpload = multer({
  storage,
  limits: {
    fileSize: IMAGE_MAX_FILE_SIZE,
    files: GALLERY_UPLOAD_BATCH_SIZE
  },
  fileFilter: (_req, _file, cb) => cb(null, true)
});

// Middleware for single image upload with field name 'image' or 'file'
const uploadSingle = upload.single("image");
const uploadSingleMiddleware = (req, res, next) => uploadSingle(req, res, (error) => {
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.code === 'LIMIT_FILE_SIZE'
        ? `Ảnh vượt quá dung lượng tối đa ${Math.round(IMAGE_MAX_FILE_SIZE / (1024 * 1024))}MB.`
        : error.message || 'Tệp ảnh không hợp lệ.'
    });
  }
  return next();
});

const uploadGalleryBatchMiddleware = (req, res, next) => galleryBatchUpload.array('files', GALLERY_UPLOAD_BATCH_SIZE)(req, res, (error) => {
  if (!error) return next();
  const message = error.code === 'LIMIT_FILE_SIZE'
    ? `Ảnh vượt quá dung lượng tối đa ${Math.round(IMAGE_MAX_FILE_SIZE / (1024 * 1024))}MB.`
    : error.code === 'LIMIT_FILE_COUNT'
      ? `Mỗi batch chỉ được tối đa ${GALLERY_UPLOAD_BATCH_SIZE} ảnh.`
      : error.message || 'Batch ảnh không hợp lệ.';
  return res.status(400).json({ success: false, code: error.code || 'INVALID_BATCH', message });
});

// Controller action to process Cloudinary upload
const handleImageUpload = async (req, res) => {
  let uploaded;
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
          quality: req.body.quality || String(IMAGE_WEBP_QUALITY),
          sharpness: req.body.sharpness || '100'
        }
      : req.body;
    const processed = await processImageBuffer(req.file.buffer, processingBody);
    // Upload the already-processed buffer directly. Keep Cloudinary free of a
    // second transformation/quality decision.
    uploaded = await uploadToCloudinary(processed.buffer, folder, { format: processed.optimized.format });
    if (!imageFormatsMatch(uploaded.format, processed.optimized.format)) {
      throw new Error(`Cloudinary trả về định dạng ${uploaded.format || 'không xác định'}, mong đợi ${processed.optimized.format}. Ảnh cũ vẫn được giữ nguyên.`);
    }

    return res.status(200).json({
      success: true,
      message: "Tải ảnh lên Cloudinary thành công!",
      data: {
        url: uploaded.secure_url,
        secure_url: uploaded.secure_url,
        public_id: uploaded.public_id,
        format: uploaded.format,
        width: uploaded.width,
        height: uploaded.height,
        bytes: uploaded.bytes,
        storedFormat: uploaded.format,
        storedBytes: uploaded.bytes,
        processing: {
          original: processed.original,
          optimized: processed.optimized,
          settings: processed.settings
        }
      }
    });
  } catch (error) {
    if (uploaded?.public_id) {
      destroyCloudinaryImage(uploaded.public_id).catch(cleanupError => console.error('[Upload rollback]', cleanupError.message));
    }
    console.error("[Upload Error]", error);
    const validationError = /Tệp tải lên|Chỉ hỗ trợ|vượt giới hạn|Vùng cắt|Chất lượng WebP|Độ sắc nét/i.test(error.message || '');
    return res.status(validationError ? 400 : 500).json({
      success: false,
      message: error.message || "Lỗi khi tải ảnh lên Cloudinary.",
      error: error.message
    });
  }
};

const galleryUploadError = (error) => ({
  name: error?.name || null,
  message: error?.message || 'Tải ảnh thất bại.',
  retryable: isRetryableUploadError(error)
});

const processGalleryFile = async (file, index, projectId) => {
  let uploaded;
  try {
    const processed = await processImageBuffer(file.buffer, {
      resize_preset: 'project',
      quality: String(IMAGE_WEBP_QUALITY),
      sharpness: '100'
    });
    const hash = crypto.createHash('sha256').update(processed.buffer).digest('hex');
    uploaded = await uploadToCloudinaryWithRetry(
      processed.buffer,
      `shome-luxury/projects/${projectId}/gallery`,
      {
        public_id: `gallery-${hash}`,
        overwrite: true,
        unique_filename: false,
        use_filename: false,
        format: processed.optimized.format
      }
    );
    if (!imageFormatsMatch(uploaded.format, processed.optimized.format)) {
      throw new Error(`Cloudinary trả về định dạng ${uploaded.format || 'không xác định'}, mong đợi ${processed.optimized.format}.`);
    }
    return {
      index,
      originalName: file.originalname || `image-${index + 1}`,
      image: {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        alt: '',
        metadata: {
          format: uploaded.format,
          width: uploaded.width || processed.optimized.width,
          height: uploaded.height || processed.optimized.height,
          bytes: uploaded.bytes || processed.optimized.bytes
        }
      },
      processing: {
        original: processed.original,
        optimized: processed.optimized
      }
    };
  } catch (error) {
    if (uploaded?.public_id) {
      await destroyCloudinaryImage(uploaded.public_id).catch(cleanupError => {
        console.error('[Gallery upload rollback]', cleanupError.message);
      });
    }
    return {
      index,
      originalName: file.originalname || `image-${index + 1}`,
      error: galleryUploadError(error)
    };
  }
};

/**
 * POST /api/admin/projects/:id/gallery/upload
 * Accepts a small multipart batch. The client can send multiple batches for
 * a 30-image gallery; the server never starts 30 Cloudinary uploads at once.
 */
const uploadProjectGalleryBatch = async (req, res, next) => {
  const uploadedPublicIds = [];
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) {
      return res.status(400).json({ success: false, code: 'NO_FILES', message: 'Vui lòng chọn ít nhất một ảnh.' });
    }

    const capacity = await projectService.getGalleryCapacity(req.params.id);
    if (files.length > capacity.remaining) {
      return res.status(409).json({
        success: false,
        code: 'GALLERY_LIMIT_EXCEEDED',
        message: `Gallery chỉ còn ${capacity.remaining} vị trí trên tối đa ${capacity.limit} ảnh.`,
        data: { limit: capacity.limit, current: capacity.current, remaining: capacity.remaining }
      });
    }

    const results = await mapWithConcurrency(
      files,
      GALLERY_UPLOAD_CONCURRENCY,
      (file, index) => processGalleryFile(file, index, req.params.id)
    );
    const successful = results.filter(result => result.image);
    successful.forEach(result => uploadedPublicIds.push(result.image.publicId));
    const failed = results.filter(result => result.error);

    let project = null;
    if (successful.length) {
      try {
        project = await projectService.addBatchToGallery(
          req.params.id,
          successful.map(result => ({
            ...result.image,
            alt: req.body.alt || result.image.alt
          }))
        );
      } catch (error) {
        await Promise.all(uploadedPublicIds.map(publicId => destroyCloudinaryImage(publicId).catch(cleanupError => {
          console.error('[Gallery batch database rollback]', cleanupError.message);
        })));
        throw error;
      }
    }

    if (!successful.length) {
      return res.status(422).json({
        success: false,
        code: 'BATCH_UPLOAD_FAILED',
        message: 'Không có ảnh nào tải lên thành công.',
        data: { requested: files.length, succeeded: 0, failed }
      });
    }

    const status = failed.length ? 207 : 201;
    return res.status(status).json({
      success: true,
      message: failed.length
        ? `Đã lưu ${successful.length}/${files.length} ảnh; có ${failed.length} ảnh lỗi.`
        : `Đã lưu ${successful.length} ảnh gallery.`,
      data: {
        project,
        uploaded: successful.map(result => ({
          index: result.index,
          originalName: result.originalName,
          format: result.image.metadata.format,
          bytes: result.image.metadata.bytes,
          originalBytes: result.processing.original.bytes,
          convertedToWebp: result.processing.optimized.convertedToWebp,
          keptOriginal: result.processing.optimized.keptOriginal
        })),
        requested: files.length,
        succeeded: successful.length,
        failed,
        limit: capacity.limit,
        remaining: Math.max(0, capacity.limit - (project?.galleryItems?.length || project?.gallery?.length || 0))
      }
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  uploadSingleMiddleware,
  handleImageUpload,
  uploadGalleryBatchMiddleware,
  uploadProjectGalleryBatch
};
