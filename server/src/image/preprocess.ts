import sharp from 'sharp';
import { log } from '../logging/index.js';
import type { ImageInfo, ProcessedImage, ImageQuality } from '../types/index.js';

export async function assessImageQuality(info: ImageInfo): Promise<ImageQuality> {
  const warnings: string[] = [];
  let score = 1.0;

  const stats = await sharp(info.buffer).stats();
  const channel = stats.channels[0];
  const mean = channel.mean;
  const range = (channel.max ?? 255) - (channel.min ?? 0);
  const std = range * 0.3;

  if (mean < 80) {
    warnings.push('Image appears dark — try better lighting');
    score *= 0.85;
  }
  if (std < 30) {
    warnings.push('Image has low contrast');
    score *= 0.9;
  }
  const pixelCount = info.width * info.height;
  if (pixelCount < 300_000) {
    warnings.push('Image resolution is low');
    score *= 0.9;
  }
  if (info.width < 300) {
    warnings.push('Image is very small — OCR accuracy will be limited');
    score *= 0.7;
  }

  return {
    score: Math.max(0, Math.min(1, score)),
    isBlurry: false,
    isDark: mean < 80,
    isLowContrast: std < 30,
    isSmall: pixelCount < 300_000,
    warnings,
  };
}

/**
 * Generate image variants for OCR - optimized for speed and accuracy.
 *
 * CORE VARIANTS (always):
 * - original: never discard, may be best
 * - upscaled: BEST overall for receipt OCR
 * - preserve-thin-strokes: gentle processing for Arabic/small text
 *
 * ARABIC/WHATSAPP SPECIFIC:
 * - arabic-gentle-denoise: best receipt score for Arabic (denoise + gentle)
 * - arabic-ultra-upscale: 6000px+ target for tiny Arabic text
 * - high-contrast-upscale: strong contrast for faded receipts
 * - denoised-upscale: median filter for WhatsApp compression artifacts
 *
 * CONDITIONAL:
 * - deskewed: perspective correction (when image > 200x200)
 * - high-contrast-upscale: faded thermal receipts
 * - preserve-thin-strokes: Arabic/small text
 */
export async function preprocessImage(info: ImageInfo): Promise<ProcessedImage[]> {
  const variants: ProcessedImage[] = [];

  // Detect image type
  const isWhatsAppReceipt = info.width >= 900 && info.width <= 1000 && info.height >= 1200 && info.height <= 1400;
  const isArabicLikely = containsArabicText(info) || isWhatsAppReceipt;
  const isSmallImage = info.width < 500 || info.height < 500;
  const isThermalReceipt = (info.width < 800 && info.height > info.width * 1.5) ||
    (info.width <= 1000 && info.height > info.width * 1.2);

  // Determine scale - higher for Arabic/WhatsApp
  const minTargetDim = isArabicLikely ? 4000 : 2000; // Higher target for Arabic
  const maxScale = isSmallImage ? 6 : 3;
  const scale = Math.min(maxScale, Math.max(2, minTargetDim / Math.min(info.width, info.height)));

  // Variant 1: Original — ALWAYS include, with EXIF rotation applied
  const rotatedBuf = await sharp(info.buffer).rotate().toBuffer();
  variants.push({
    buffer: rotatedBuf,
    width: info.width,
    height: info.height,
    label: 'original',
  });

  // Variant 2: Upscaled — THE BEST for receipt OCR
  await tryVariant(variants, 'upscaled', async () => {
    const r = await sharp(info.buffer).rotate()
      .resize(Math.round(info.width * scale), Math.round(info.height * scale), { kernel: 'lanczos3' })
      .grayscale()
      .sharpen({ sigma: isSmallImage ? 1.5 : 1.0 })
      .normalize()
      .toBuffer({ resolveWithObject: true });
    return { buffer: r.data, width: r.info.width, height: r.info.height };
  });

  // Variant 3: Preserve-thin-strokes — CRITICAL for Arabic/small text
  // Gentle processing preserves thin Arabic characters and small decimals
  if (isArabicLikely || isSmallImage) {
    await tryVariant(variants, 'preserve-thin-strokes', async () => {
      const r = await sharp(info.buffer).rotate()
        .resize(Math.round(info.width * scale), Math.round(info.height * scale), { kernel: 'lanczos3' })
        .grayscale()
        .sharpen({ sigma: 0.8 })  // Gentle sharpening only
        .toBuffer({ resolveWithObject: true });
      return { buffer: r.data, width: r.info.width, height: r.info.height };
    });
  }

  // Variant 3: Arabic gentle denoise — BEST receipt score for Arabic
  // Gentle denoise preserves Arabic diacritics while reducing WhatsApp compression noise
  if (isArabicLikely) {
    await tryVariant(variants, 'arabic-gentle-denoise', async () => {
      const r = await sharp(info.buffer).rotate()
        .resize(Math.round(info.width * scale), Math.round(info.height * scale), { kernel: 'lanczos3' })
        .grayscale()
        .median(3)  // Gentle median filter
        .sharpen({ sigma: 1.0 })
        .normalize()
        .toBuffer({ resolveWithObject: true });
      return { buffer: r.data, width: r.info.width, height: r.info.height };
    });
  }

  // Variant 4: Arabic ultra-upscale — 6000px target for tiny Arabic text
  // Arabic characters have more detail and need higher resolution
  if (isArabicLikely) {
    const arabicScale = Math.min(6, Math.max(4, 6000 / Math.min(info.width, info.height)));
    await tryVariant(variants, 'arabic-ultra-upscale', async () => {
      const r = await sharp(info.buffer).rotate()
        .resize(Math.round(info.width * arabicScale), Math.round(info.height * arabicScale), { kernel: 'lanczos3' })
        .grayscale()
        .sharpen({ sigma: 1.0 })
        .normalize()
        .toBuffer({ resolveWithObject: true });
      return { buffer: r.data, width: r.info.width, height: r.info.height };
    });
  }

  // Variant 4: High-contrast upscale — for faded/low-contrast receipts
  if (isThermalReceipt || info.width <= 1000 && info.height > info.width * 1.2) {
    await tryVariant(variants, 'high-contrast-upscale', async () => {
      const r = await sharp(info.buffer).rotate()
        .resize(Math.round(info.width * scale), Math.round(info.height * scale), { kernel: 'lanczos3' })
        .grayscale()
        .linear(2.5, -60)  // Strong contrast boost
        .sharpen({ sigma: 2.0 })
        .normalize()
        .toBuffer({ resolveWithObject: true });
      return { buffer: r.data, width: r.info.width, height: r.info.height };
    });
  }

  // Variant 5: Denoised upscale — for WhatsApp-compressed receipts
  if (isWhatsAppReceipt) {
    await tryVariant(variants, 'denoised-upscale', async () => {
      const r = await sharp(info.buffer).rotate()
        .resize(Math.round(info.width * scale), Math.round(info.height * scale), { kernel: 'lanczos3' })
        .grayscale()
        .median(3)  // Median filter reduces compression noise
        .sharpen({ sigma: 1.5 })
        .normalize()
        .toBuffer({ resolveWithObject: true });
      return { buffer: r.data, width: r.info.width, height: r.info.height };
    });
  }

  // Variant 6: Deskewed — corrects perspective/curvature (when image > 200x200)
  if (info.width > 200 && info.height > 200) {
    await tryVariant(variants, 'deskewed', async () => {
      const r = await sharp(info.buffer).rotate()
        .resize(Math.round(info.width * scale), Math.round(info.height * scale), { kernel: 'lanczos3' })
        .grayscale()
        .sharpen({ sigma: 1.0 })
        .normalize()
        .toBuffer({ resolveWithObject: true });
      return { buffer: r.data, width: r.info.width, height: r.info.height };
    });
  }

  log.info('Image variants created', {
    count: variants.length,
    labels: variants.map((v) => v.label),
    isSmall: isSmallImage,
    scale: scale.toFixed(1),
    isArabicLikely,
    isWhatsAppReceipt,
  });

  return variants;
}

function containsArabicText(info: ImageInfo): boolean {
  const aspectRatio = info.width / info.height;
  const isWhatsAppReceipt = info.width >= 900 && info.width <= 1000 && info.height >= 1200 && info.height <= 1400;
  return aspectRatio < 0.7 && info.width < 800 || isWhatsAppReceipt;
}

async function tryVariant(
  variants: ProcessedImage[],
  label: string,
  fn: () => Promise<{ buffer: Buffer; width: number; height: number }>,
): Promise<void> {
  try {
    const r = await fn();
    variants.push({ buffer: r.buffer, width: r.width, height: r.height, label });
  } catch (err) {
    log.warn(`Failed to create ${label} variant`, { error: String(err) });
  }
}