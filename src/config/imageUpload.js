const integerEnv = (name, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) => {
  const value = Number.parseInt(process.env[name], 10);
  if (!Number.isInteger(value)) return fallback;
  return Math.min(max, Math.max(min, value));
};

// Gallery uploads are intentionally bounded. The client can send several
// batches for a 30-image gallery, while the server only keeps one small batch
// in memory at a time.
const MAX_GALLERY_IMAGES = integerEnv('MAX_GALLERY_IMAGES', 30, { min: 1, max: 1000 });
const GALLERY_UPLOAD_BATCH_SIZE = integerEnv('GALLERY_UPLOAD_BATCH_SIZE', 5, { min: 1, max: 30 });
const GALLERY_UPLOAD_CONCURRENCY = integerEnv('GALLERY_UPLOAD_CONCURRENCY', 3, { min: 1, max: GALLERY_UPLOAD_BATCH_SIZE });
const IMAGE_MAX_FILE_SIZE = integerEnv('IMAGE_MAX_FILE_SIZE', 10 * 1024 * 1024, { min: 1, max: 100 * 1024 * 1024 });
const IMAGE_WEBP_QUALITY = integerEnv('IMAGE_WEBP_QUALITY', 85, { min: 1, max: 100 });
const CLOUDINARY_UPLOAD_RETRIES = integerEnv('CLOUDINARY_UPLOAD_RETRIES', 2, { min: 0, max: 5 });

module.exports = {
  MAX_GALLERY_IMAGES,
  GALLERY_UPLOAD_BATCH_SIZE,
  GALLERY_UPLOAD_CONCURRENCY,
  IMAGE_MAX_FILE_SIZE,
  IMAGE_WEBP_QUALITY,
  CLOUDINARY_UPLOAD_RETRIES
};
