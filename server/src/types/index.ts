// ── OCR Types ──────────────────────────────────────────────

export interface OCRWord {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export interface OCRLine {
  text: string;
  confidence: number;
  words: OCRWord[];
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export interface OCRBlock {
  text: string;
  confidence: number;
  lines: OCRLine[];
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export interface OCRResult {
  text: string;
  blocks: OCRBlock[];
  confidence: number;
  provider: string;
  metadata: {
    processingTimeMs: number;
    language?: string;
    pageCount?: number;
  };
}

export type OCRStatus = 'success' | 'no_text' | 'low_confidence' | 'failed';

export interface OCROutcome {
  status: OCRStatus;
  result: OCRResult | null;
  error?: string;
}

// ── Image Types ────────────────────────────────────────────

export interface ImageInfo {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  channels: number;
  hasAlpha: boolean;
  size: number;
  orientation?: number;
}

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  label: string;
}

export interface ImageQuality {
  score: number;
  isBlurry: boolean;
  isDark: boolean;
  isLowContrast: boolean;
  isSmall: boolean;
  warnings: string[];
}

// ── Receipt Types ──────────────────────────────────────────

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  rawText: string;
  confidence: number;
}

export interface ReceiptData {
  merchant: string | null;
  date: string | null;
  time: string | null;
  receiptNumber: string | null;
  currency: string;
  items: ReceiptItem[];
  subtotal: number | null;
  discounts: number;
  tax: number | null;
  total: number | null;
  paymentMethod: string | null;
}

export type ReceiptFieldConfidence = {
  value: number;
  source: 'high' | 'medium' | 'low' | 'unknown';
};

export interface ConfidenceReport {
  overall: number;
  merchant: ReceiptFieldConfidence;
  date: ReceiptFieldConfidence;
  items: ReceiptFieldConfidence;
  total: ReceiptFieldConfidence;
  tax: ReceiptFieldConfidence;
  imageQuality: number;
  ocrConfidence: number;
}

// ── Validation Types ───────────────────────────────────────

export interface ValidationIssue {
  field: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
}

// ── Pipeline Types ─────────────────────────────────────────

export interface ScanRequest {
  file: Express.Multer.File;
}

export interface ScanResult {
  status: 'success' | 'partial' | 'failed';
  receipt: ReceiptData | null;
  confidence: ConfidenceReport | null;
  warnings: string[];
  errors: string[];
  metadata: {
    processingTimeMs: number;
    ocrProvider: string;
    ocrConfidence: number;
    imageQuality: number;
    variantsUsed: number;
  };
  debug?: {
    ocrText: string;
    variantResults: Array<{
      variant: string;
      confidence: number;
      receiptScore: number;
      textPreview: string;
      textLength: number;
    }>;
    imageWidth: number;
    imageHeight: number;
    language: string;
  };
}

// ── OCR Provider Interface ─────────────────────────────────

export interface OCRProvider {
  readonly name: string;
  process(image: Buffer, lang?: string): Promise<OCROutcome>;
}

// ── Digit Normalization ────────────────────────────────────

export type DigitMap = Record<string, string>;
