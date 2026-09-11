export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class UploadError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, message, 'UPLOAD_ERROR', details);
    this.name = 'UploadError';
  }
}

export class ImageError extends AppError {
  constructor(message: string, details?: unknown) {
    super(422, message, 'IMAGE_ERROR', details);
    this.name = 'ImageError';
  }
}

export class OCRError extends AppError {
  constructor(message: string, details?: unknown) {
    super(502, message, 'OCR_ERROR', details);
    this.name = 'OCRError';
  }
}

export class ParserError extends AppError {
  constructor(message: string, details?: unknown) {
    super(422, message, 'PARSER_ERROR', details);
    this.name = 'ParserError';
  }
}

export class PipelineError extends AppError {
  constructor(message: string, details?: unknown) {
    super(500, message, 'PIPELINE_ERROR', details);
    this.name = 'PipelineError';
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
