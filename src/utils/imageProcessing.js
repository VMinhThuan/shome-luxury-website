const sharp = require('sharp');

const MAX_INPUT_PIXELS = 40_000_000;
const MAX_OUTPUT_PIXELS = 24_000_000;
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);

const isEnabled = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return value === true || value === 'true' || value === '1' || value === 1;
};

const numberInRange = (value, minimum, maximum) => {
  const result = Number(value);
  return Number.isFinite(result) && result >= minimum && result <= maximum ? Math.round(result) : null;
};

const qualityFrom = (value) => numberInRange(value, 1, 100) || 100;

const LEGACY_SHARPNESS = { off: 0, low: 20, medium: 40, high: 60 };

function sharpnessPercentFrom(value) {
  if (value === undefined || value === null || value === '') return 100;
  if (Object.hasOwn(LEGACY_SHARPNESS, value)) return LEGACY_SHARPNESS[value];
  const percentage = numberInRange(value, 0, 100);
  if (percentage === null) throw new Error('Độ sắc nét cần nằm trong khoảng 0–100%.');
  return percentage;
}

// A bounded, deliberately conservative mapping. The output never exceeds
// the parameters below, so 100% remains usable instead of producing halos.
function sharpOptionsFromPercent(percentage) {
  if (percentage <= 0) return null;
  const intensity = percentage / 100;
  return {
    sigma: 0.4 + (0.8 * intensity),
    m1: 0.3 + (0.6 * intensity),
    m2: 0.5 + (0.8 * intensity),
    x1: 2,
    y2: Math.round(8 + (8 * intensity)),
    y3: Math.round(14 + (12 * intensity))
  };
}

function outputExtension(contentType) {
  return {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp'
  }[contentType] || '.img';
}

function contentTypeForFormat(format) {
  return {
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp'
  }[format] || 'application/octet-stream';
}

function outputOptionsFrom(body = {}) {
  // Source-preserving CMS images are customer-owned originals. When this mode
  // is requested, do not resize, crop, sharpen, or convert the uploaded file.
  // The normal WebP optimization flow remains unchanged for other slots.
  if (isEnabled(body.preserve_original_file)) {
    return {
      keepOriginalSize: true,
      keepAspectRatio: true,
      preserveOriginalFile: true,
      lossless: false,
      width: null,
      height: null,
      resizePreset: null,
      quality: 100,
      sharpness: 0,
      crop: null
    };
  }

  const resizePreset = ['2k', 'project'].includes(body.resize_preset) ? body.resize_preset : null;
  const presetMaxEdge = resizePreset === 'project' ? 2048 : 2560;
  const keepOriginalSize = resizePreset ? false : isEnabled(body.keep_original_size, true);
  const keepAspectRatio = resizePreset ? true : isEnabled(body.keep_aspect_ratio, true);
  const lossless = isEnabled(body.webp_lossless);
  const width = resizePreset ? presetMaxEdge : keepOriginalSize ? null : numberInRange(body.width, 1, 7680);
  const height = resizePreset ? presetMaxEdge : keepOriginalSize ? null : numberInRange(body.height, 1, 7680);
  const widthRequested = body.width !== undefined && body.width !== null && body.width !== '';
  const heightRequested = body.height !== undefined && body.height !== null && body.height !== '';
  if (!keepOriginalSize && ((widthRequested && !width) || (heightRequested && !height) || (!width && !height))) {
    throw new Error('Chiều rộng và chiều cao cần nằm trong khoảng 1–7680 px.');
  }

  const quality = qualityFrom(body.quality);
  if (body.quality !== undefined && body.quality !== null && body.quality !== '' && !numberInRange(body.quality, 1, 100)) {
    throw new Error('Chất lượng WebP cần nằm trong khoảng 1–100.');
  }
  const sharpness = sharpnessPercentFrom(body.sharpness);
  const cropEnabled = isEnabled(body.crop_enabled);
  const crop = cropEnabled ? {
    left: numberInRange(body.crop_x, 0, 100_000),
    top: numberInRange(body.crop_y, 0, 100_000),
    width: numberInRange(body.crop_width, 1, 100_000),
    height: numberInRange(body.crop_height, 1, 100_000)
  } : null;
  if (cropEnabled && (!crop || !Object.values(crop).every(Number.isInteger))) {
    throw new Error('Vùng cắt ảnh không hợp lệ.');
  }

  return {
    keepOriginalSize,
    keepAspectRatio,
    preserveOriginalFile: false,
    lossless,
    width,
    height,
    resizePreset,
    quality,
    sharpness,
    crop
  };
}

async function processImageBuffer(inputBuffer, body = {}) {
  const source = sharp(inputBuffer, { failOn: 'error', limitInputPixels: MAX_INPUT_PIXELS });
  let inputMetadata;
  try {
    inputMetadata = await source.metadata();
  } catch (error) {
    if (/pixel limit/i.test(error.message)) {
      throw new Error('Ảnh vượt giới hạn 40 megapixel. Hãy giảm kích thước ảnh trước khi tải lên.');
    }
    throw new Error('Tệp tải lên không phải ảnh JPG, PNG hoặc WebP hợp lệ.');
  }
  if (!ALLOWED_FORMATS.has(inputMetadata.format)) {
    throw new Error('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP hợp lệ.');
  }

  const options = outputOptionsFrom(body);
  const originalWidth = [5, 6, 7, 8].includes(inputMetadata.orientation) ? inputMetadata.height : inputMetadata.width;
  const originalHeight = [5, 6, 7, 8].includes(inputMetadata.orientation) ? inputMetadata.width : inputMetadata.height;

  if (options.preserveOriginalFile) {
    const contentType = contentTypeForFormat(inputMetadata.format);
    return {
      buffer: inputBuffer,
      original: {
        width: originalWidth,
        height: originalHeight,
        format: inputMetadata.format,
        bytes: inputBuffer.length
      },
      optimized: {
        width: originalWidth,
        height: originalHeight,
        format: inputMetadata.format,
        bytes: inputBuffer.length,
        contentType,
        extension: outputExtension(contentType)
      },
      settings: options
    };
  }

  let pipeline = sharp(inputBuffer, { failOn: 'error', limitInputPixels: MAX_INPUT_PIXELS }).rotate().toColourspace('srgb');

  if (options.crop) {
    // Browser previews already honor EXIF orientation. Keep those crop
    // coordinates aligned with Sharp's rotate() operation below.
    const hasSwappedOrientation = [5, 6, 7, 8].includes(inputMetadata.orientation);
    const sourceWidth = hasSwappedOrientation ? inputMetadata.height || 0 : inputMetadata.width || 0;
    const sourceHeight = hasSwappedOrientation ? inputMetadata.width || 0 : inputMetadata.height || 0;
    const crop = options.crop;
    // Auto-clamp boundary rounding from browser calculations
    if (crop.left < 0) crop.left = 0;
    if (crop.top < 0) crop.top = 0;
    if (crop.left >= sourceWidth || crop.top >= sourceHeight) {
      throw new Error('Vùng cắt không nằm trong phạm vi ảnh gốc.');
    }
    if (crop.left + crop.width > sourceWidth) {
      crop.width = Math.max(1, sourceWidth - crop.left);
    }
    if (crop.top + crop.height > sourceHeight) {
      crop.height = Math.max(1, sourceHeight - crop.top);
    }
    pipeline = pipeline.extract(crop);
  }

  const hasResize = !options.keepOriginalSize && Boolean(options.width || options.height);
  if (hasResize) {
    pipeline = pipeline.resize({
      width: options.width || undefined,
      height: options.height || undefined,
      fit: options.keepAspectRatio || !options.width || !options.height ? 'inside' : 'fill',
      withoutEnlargement: true,
      kernel: sharp.kernel.lanczos3
    });
  }

  const sharpOptions = sharpOptionsFromPercent(options.sharpness);
  if (sharpOptions) {
    pipeline = pipeline.sharpen(sharpOptions);
  }

  pipeline = options.lossless
    ? pipeline.webp({ lossless: true, effort: 6 })
    : pipeline.webp({ quality: options.quality, effort: 6, smartSubsample: true });

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  if (info.width * info.height > MAX_OUTPUT_PIXELS) {
    throw new Error('Ảnh đầu ra vượt giới hạn 24 megapixel. Hãy giảm chiều rộng hoặc chiều cao.');
  }

  return {
    buffer: data,
    original: {
      width: originalWidth,
      height: originalHeight,
      format: inputMetadata.format,
      bytes: inputBuffer.length
    },
    optimized: {
      width: info.width,
      height: info.height,
      format: info.format,
      bytes: info.size,
      contentType: 'image/webp',
      extension: outputExtension('image/webp')
    },
    settings: options
  };
}

module.exports = {
  processImageBuffer,
  outputOptionsFrom,
  sharpOptionsFromPercent,
  sharpnessPercentFrom,
  MAX_INPUT_PIXELS,
  MAX_OUTPUT_PIXELS
};
