export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',

  upload: {
    maxFileSize: 20 * 1024 * 1024, // 20MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
      'image/tiff',
      'image/bmp',
    ] as string[],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.tiff', '.tif', '.bmp'] as string[],
    tempDir: './tmp-uploads',
  },

  image: {
    maxWidth: 4096,
    maxHeight: 4096,
    minWidth: 100,
    minHeight: 100,
    maxDpi: 600,
    minDpi: 72,
  },

  ocr: {
    timeoutMs: 30_000,
    tesseract: {
      languages: ['eng', 'ara'],
      workerCount: 2,
    },
    minConfidence: 10,
    minTextLength: 10,
  },

  parser: {
    maxItems: 100,
    priceTolerance: 0.02,
    subtotalTolerance: 0.50,
  },

  logging: {
    level: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
    logImagePaths: false,
  },
} as const;
