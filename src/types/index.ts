export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  rawText?: string;
  confidence?: number;
}

export interface ReceiptData {
  merchant: string | null;
  date: string | null; // Effective date (YYYY-MM-DD) - OCR date if available, else scan date
  time: string | null; // Effective time (HH:MM) - OCR time if available, else scan time
  _ocrDate: string | null; // Original OCR date (for reference)
  _ocrTime: string | null; // Original OCR time (for reference)
  receiptNumber: string | null;
  currency: string;
  items: ReceiptItem[];
  subtotal: number | null;
  discounts: number;
  tax: number | null;
  total: number | null;
  paymentMethod: string | null;
  category: string | null;
}

export interface ConfidenceReport {
  overall: number;
  merchant: { value: number; source: string };
  date: { value: number; source: string };
  items: { value: number; source: string };
  total: { value: number; source: string };
  tax: { value: number; source: string };
  imageQuality: number;
  ocrConfidence: number;
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

export interface SavedReceipt {
  id: string;
  receipt: ReceiptData;
  confidence: ConfidenceReport | null;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type Theme = 'light' | 'dark' | 'system';
export type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'merchant';

export interface Filters {
  search: string;
  dateFrom: string;
  dateTo: string;
  merchant: string;
  sort: SortOption;
}
