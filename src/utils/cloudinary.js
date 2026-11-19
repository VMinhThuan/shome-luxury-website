const cloudinary = require("cloudinary").v2;
const { CLOUDINARY_UPLOAD_RETRIES } = require('../config/imageUpload');

const readEnv = (name) => {
  const raw = process.env[name];
  if (raw === undefined || raw === null) return '';
  const value = String(raw).trim();
  // Also handle values entered directly in a process manager as "value".
  return value.replace(/^(['"])(.*)\1$/, '$2').trim();
};

const parseCloudinaryUrl = (value) => {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'cloudinary:' || !parsed.hostname || !parsed.username || !parsed.password) return null;
    return {
      cloud_name: parsed.hostname,
      api_key: decodeURIComponent(parsed.username),
      api_secret: decodeURIComponent(parsed.password)
    };
  } catch (_error) {
    return null;
  }
};

// Prefer CLOUDINARY_URL when supplied so cloud name, API key and secret always
// come from the same Cloudinary account. Otherwise use the three explicit vars.
const cloudinaryUrlConfig = parseCloudinaryUrl(readEnv('CLOUDINARY_URL'));
const configuredCloudinary = cloudinaryUrlConfig || {
  cloud_name: readEnv('CLOUDINARY_CLOUD_NAME'),
  api_key: readEnv('CLOUDINARY_API_KEY'),
  api_secret: readEnv('CLOUDINARY_API_SECRET')
};

cloudinary.config({ ...configuredCloudinary, secure: true });

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} fileBuffer - Image buffer from multer memoryStorage
 * @param {String} folderName - Cloudinary folder name (e.g. 'shome-luxury/recruitment')
 * @returns {Promise<Object>} Cloudinary upload result
 */
const uploadToCloudinary = (fileBuffer, folderName = "shome-luxury/recruitment", options = {}) => {
  return new Promise((resolve, reject) => {
    // If Cloudinary keys are missing, reject with helpful message
    const activeConfig = cloudinary.config();
    if (!activeConfig.cloud_name || !activeConfig.api_key || !activeConfig.api_secret) {
      return reject(new Error("Thiếu cấu hình Cloudinary (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) trong biến môi trường."));
    }

    const uploadOptions = {
      folder: folderName,
      resource_type: "image",
      ...options
    };
    if (uploadOptions.format === undefined) uploadOptions.format = 'webp';

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          if (/invalid signature/i.test(error.message || '')) {
            return reject(new Error('Cloudinary từ chối chữ ký upload. Hãy kiểm tra CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY và CLOUDINARY_API_SECRET có thuộc cùng một tài khoản Cloudinary trên production hay không.'));
          }
          return reject(error);
        }
        resolve(result);
      }
    );

    uploadStream.end(fileBuffer);
  });
};

const isRetryableUploadError = (error) => {
  const status = Number(error?.http_code || error?.statusCode || error?.status);
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '').toLowerCase();
  return status === 408 || status === 409 || status === 425 || status === 429
    || (status >= 500 && status < 600)
    || ['ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN', 'ECONNABORTED'].includes(code)
    || /timeout|temporar|socket hang up|connection reset|rate limit|too many requests/.test(message);
};

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

/**
 * Upload with bounded exponential backoff. A deterministic public_id supplied
 * by the caller makes a retried upload idempotent instead of creating copies.
 */
const uploadToCloudinaryWithRetry = async (fileBuffer, folderName, options = {}) => {
  let lastError;
  for (let attempt = 0; attempt <= CLOUDINARY_UPLOAD_RETRIES; attempt += 1) {
    try {
      return await uploadToCloudinary(fileBuffer, folderName, options);
    } catch (error) {
      lastError = error;
      if (attempt >= CLOUDINARY_UPLOAD_RETRIES || !isRetryableUploadError(error)) throw error;
      await wait(250 * (2 ** attempt));
    }
  }
  throw lastError;
};

const optimizedImageUrl = (url, { width = 480 } = {}) => {
  if (!url || !String(url).includes('/image/upload/')) return url || null;
  return String(url).replace('/image/upload/', `/image/upload/f_auto,q_auto,w_${width},c_limit/`);
};

const normalizeImageFormat = format => String(format || '').toLowerCase() === 'jpeg' ? 'jpg' : String(format || '').toLowerCase();
const imageFormatsMatch = (actual, expected) => normalizeImageFormat(actual) === normalizeImageFormat(expected);

const destroyCloudinaryImage = (publicId) => cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });

module.exports = {
  cloudinary,
  uploadToCloudinary,
  uploadToCloudinaryWithRetry,
  isRetryableUploadError,
  optimizedImageUrl,
  normalizeImageFormat,
  imageFormatsMatch,
  destroyCloudinaryImage
};
