import sharp from 'sharp';
import { config } from '../config/index.js';
import { UploadError } from '../errors/index.js';
import { log } from '../logging/index.js';
import type { ImageInfo } from '../types/index.js';

export async function validateAndLoadImage(file: Express.Multer.File): Promise<ImageInfo> {
  if (!file) {
    throw new UploadError('No file provided');
  }

  if (!file.buffer || file.buffer.length === 0) {
    throw new UploadError('File is empty');
  }

  const ext = getExtension(file.originalname);
  const mime = file.mimetype.toLowerCase();

  if (!config.upload.allowedMimeTypes.includes(mime)) {
    throw new UploadError(`Unsupported MIME type: ${mime}`, {
      allowed: config.upload.allowedMimeTypes,
    });
  }

  if (!config.upload.allowedExtensions.includes(ext)) {
    throw new UploadError(`Unsupported file extension: ${ext}`, {
      allowed: config.upload.allowedExtensions,
    });
  }

  if (file.size > config.upload.maxFileSize) {
    throw new UploadError(
      `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max ${config.upload.maxFileSize / 1024 / 1024}MB)`,
    );
  }

  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(file.buffer).metadata();
  } catch {
    throw new UploadError('File could not be decoded as an image. It may be corrupted.');
  }

  if (!metadata.width || !metadata.height) {
    throw new UploadError('Could not determine image dimensions');
  }

  if (metadata.width < config.image.minWidth || metadata.height < config.image.minHeight) {
    throw new UploadError(
      `Image too small: ${metadata.width}×${metadata.height} (min ${config.image.minWidth}×${config.image.minHeight})`,
    );
  }

  if (metadata.width > config.image.maxWidth || metadata.height > config.image.maxHeight) {
    log.warn('Image exceeds max dimensions, will be downscaled', {
      width: metadata.width,
      height: metadata.height,
    });
  }

  const info: ImageInfo = {
    buffer: file.buffer,
    width: metadata.width,
    height: metadata.height,
    format: metadata.format || 'unknown',
    channels: metadata.channels || 3,
    hasAlpha: metadata.hasAlpha || false,
    size: file.size,
    orientation: metadata.orientation,
  };

  log.info('Image validated', {
    format: info.format,
    dimensions: `${info.width}×${info.height}`,
    size: `${(info.size / 1024).toFixed(0)}KB`,
  });

  return info;
}

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx >= 0 ? filename.slice(idx).toLowerCase() : '';
}
