const assert = require('assert');
const sharp = require('sharp');
const { processImageBuffer, sharpOptionsFromPercent } = require('../src/utils/imageProcessing');

async function createInput(format, options = {}) {
  const image = sharp({
    create: { width: options.width || 1600, height: options.height || 900, channels: options.alpha ? 4 : 3, background: options.alpha ? { r: 30, g: 60, b: 90, alpha: 0.5 } : '#1e3a5f' }
  });
  if (format === 'png') return image.png().toBuffer();
  if (format === 'webp') return image.webp({ quality: 100 }).toBuffer();
  return image.jpeg({ quality: 100 }).toBuffer();
}

async function run() {
  const jpg = await createInput('jpg');
  const png = await createInput('png', { alpha: true });
  const webp = await createInput('webp');

  for (const source of [jpg, png, webp]) {
    const result = await processImageBuffer(source, { keep_original_size: 'true', quality: '95' });
    const metadata = await sharp(result.buffer).metadata();
    assert.equal(metadata.format, 'webp');
    assert.equal(metadata.width, 1600);
    assert.equal(metadata.height, 900);
  }

  const resized = await processImageBuffer(jpg, { keep_original_size: 'false', keep_aspect_ratio: 'true', width: '800', height: '800', quality: '95', sharpness: 'low' });
  assert.equal(resized.optimized.width, 800);
  assert.equal(resized.optimized.height, 450);

  const notUpscaled = await processImageBuffer(jpg, { keep_original_size: 'false', keep_aspect_ratio: 'true', width: '3000', height: '3000' });
  assert.equal(notUpscaled.optimized.width, 1600);
  assert.equal(notUpscaled.optimized.height, 900);

  const wide2k = await processImageBuffer(await createInput('jpg', { width: 4000, height: 2250 }), { resize_preset: '2k' });
  assert.deepEqual([wide2k.optimized.width, wide2k.optimized.height], [2560, 1440]);
  const standard2k = await processImageBuffer(await createInput('jpg', { width: 3000, height: 2000 }), { resize_preset: '2k' });
  assert.deepEqual([standard2k.optimized.width, standard2k.optimized.height], [2560, 1707]);
  const small2k = await processImageBuffer(await createInput('jpg', { width: 1920, height: 1080 }), { resize_preset: '2k' });
  assert.deepEqual([small2k.optimized.width, small2k.optimized.height], [1920, 1080]);

  // Project CMS preset caps the longest edge at 2048px and keeps smaller
  // images unchanged without stretching them.
  const projectWide = await processImageBuffer(await createInput('jpg', { width: 4000, height: 2250 }), { resize_preset: 'project', quality: '85' });
  assert.deepEqual([projectWide.optimized.width, projectWide.optimized.height], [2048, 1152]);
  assert.equal(projectWide.optimized.format, 'webp');
  assert.equal(projectWide.settings.quality, 85);
  const projectSmall = await processImageBuffer(await createInput('jpg', { width: 1200, height: 800 }), { resize_preset: 'project' });
  assert.deepEqual([projectSmall.optimized.width, projectSmall.optimized.height], [1200, 800]);

  // Vertical 2K tests: longest edge (height) limited to 2560px without cropping or stretching
  const verticalWide2k = await processImageBuffer(await createInput('jpg', { width: 2250, height: 4000 }), { resize_preset: '2k' });
  assert.deepEqual([verticalWide2k.optimized.width, verticalWide2k.optimized.height], [1440, 2560]);
  const verticalStandard2k = await processImageBuffer(await createInput('jpg', { width: 2000, height: 3000 }), { resize_preset: '2k' });
  assert.deepEqual([verticalStandard2k.optimized.width, verticalStandard2k.optimized.height], [1707, 2560]);
  const verticalSmall2k = await processImageBuffer(await createInput('jpg', { width: 1080, height: 1920 }), { resize_preset: '2k' });
  assert.deepEqual([verticalSmall2k.optimized.width, verticalSmall2k.optimized.height], [1080, 1920]);

  // Small image no upscale
  const small800 = await processImageBuffer(await createInput('jpg', { width: 800, height: 600 }), { resize_preset: '2k' });
  assert.deepEqual([small800.optimized.width, small800.optimized.height], [800, 600]);

  // Preset 2K does not mutate or override quality or sharpness
  const custom2k = await processImageBuffer(await createInput('jpg', { width: 3200, height: 1800 }), {
    resize_preset: '2k',
    quality: '80',
    sharpness: '45'
  });
  assert.deepEqual([custom2k.optimized.width, custom2k.optimized.height], [2560, 1440]);
  assert.equal(custom2k.settings.quality, 80);
  assert.equal(custom2k.settings.sharpness, 45);

  const manuallyCropped = await processImageBuffer(jpg, {
    keep_original_size: 'true', crop_enabled: 'true', crop_x: '200', crop_y: '100', crop_width: '1000', crop_height: '500'
  });
  assert.equal(manuallyCropped.optimized.width, 1000);
  assert.equal(manuallyCropped.optimized.height, 500);

  const lossless = await processImageBuffer(png, { keep_original_size: 'true', webp_lossless: 'true' });
  const losslessMetadata = await sharp(lossless.buffer).metadata();
  assert.equal(losslessMetadata.format, 'webp');
  assert.equal(losslessMetadata.hasAlpha, true);

  const exifRotated = await sharp(jpg).withMetadata({ orientation: 6 }).toBuffer();
  const oriented = await processImageBuffer(exifRotated, { keep_original_size: 'true' });
  assert.equal(oriented.optimized.width, 900);
  assert.equal(oriented.optimized.height, 1600);

  // Sharpness mapping check
  assert.equal(sharpOptionsFromPercent(0), null);
  const opt20 = sharpOptionsFromPercent(20);
  assert.equal(Number(opt20.sigma.toFixed(2)), 0.56);
  assert.equal(Number(opt20.m1.toFixed(2)), 0.42);
  assert.equal(Number(opt20.m2.toFixed(2)), 0.66);
  const opt100 = sharpOptionsFromPercent(100);
  assert.equal(Number(opt100.sigma.toFixed(2)), 1.20);
  assert.equal(Number(opt100.m1.toFixed(2)), 0.90);
  assert.equal(Number(opt100.m2.toFixed(2)), 1.30);
  assert.equal(opt100.y2, 16);
  assert.equal(opt100.y3, 26);

  for (const percentage of [0, 20, 40, 60, 80, 100]) {
    const result = await processImageBuffer(jpg, { keep_original_size: 'true', sharpness: String(percentage), quality: '85' });
    assert.equal(result.settings.sharpness, percentage);
    assert.equal(result.settings.quality, 85);
  }

  // Quality & sharpness independence
  const highQlowS = await processImageBuffer(jpg, { keep_original_size: 'true', quality: '95', sharpness: '10' });
  assert.equal(highQlowS.settings.quality, 95);
  assert.equal(highQlowS.settings.sharpness, 10);
  const lowQhighS = await processImageBuffer(jpg, { keep_original_size: 'true', quality: '50', sharpness: '90' });
  assert.equal(lowQhighS.settings.quality, 50);
  assert.equal(lowQhighS.settings.sharpness, 90);

  await assert.rejects(
    () => processImageBuffer(jpg, { keep_original_size: 'true', sharpness: '-5' }),
    /Độ sắc nét cần nằm trong khoảng 0–100%/
  );
  await assert.rejects(
    () => processImageBuffer(jpg, { keep_original_size: 'true', sharpness: '105' }),
    /Độ sắc nét cần nằm trong khoảng 0–100%/
  );
  await assert.rejects(
    () => processImageBuffer(jpg, { keep_original_size: 'true', sharpness: 'abc' }),
    /Độ sắc nét cần nằm trong khoảng 0–100%/
  );

  await assert.rejects(
    () => processImageBuffer(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), {}),
    /JPG, PNG hoặc WebP/
  );
  await assert.rejects(
    () => processImageBuffer(jpg, { keep_original_size: 'false', width: '9000', height: '200' }),
    /1–7680/
  );

  console.log('All image-processing checks passed: formats, 2K landscape & vertical, no-upscale, EXIF rotation, crop, sharpness 0–100 mapping and validation, independent quality, lossless alpha, and format rejection.');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
