import type {
  ReceiptData,
  ConfidenceReport,
  ReceiptFieldConfidence,
  OCRResult,
  ImageQuality,
  ValidationIssue,
} from '../types/index.js';

/**
 * Compute confidence for each field independently.
 *
 * EVIDENCE-BASED APPROACH:
 * - Each field gets its own confidence based on what we found
 * - OCR confidence is separate from field extraction confidence
 * - Missing fields get 0 confidence (not penalty-based)
 * - Overall is weighted: items + total matter most for receipts
 * - We NEVER reject a receipt based on confidence alone
 *   (let the user correct low-confidence fields)
 */
export function computeConfidence(
  receipt: ReceiptData,
  ocr: OCRResult,
  imageQuality: ImageQuality,
  validationIssues: ValidationIssue[],
): ConfidenceReport {
  const merchantConf = computeMerchantConfidence(receipt.merchant, ocr);
  const dateConf = computeDateConfidence(receipt.date, ocr);
  const itemsConf = computeItemsConfidence(receipt);
  const totalConf = computeTotalConfidence(receipt.total, ocr);
  const taxConf = computeTaxConfidence(receipt.tax, ocr);

  const ocrConf = Math.min(1, ocr.confidence / 100);

  // Weighted overall: items + total matter most for receipts
  const weights = {
    merchant: 0.1,
    date: 0.05,
    items: 0.3,
    total: 0.25,
    ocr: 0.2,
    imageQuality: 0.1,
  };

  const errorPenalty = validationIssues.filter((i) => i.severity === 'error').length * 0.05;
  const warningPenalty = validationIssues.filter((i) => i.severity === 'warning').length * 0.02;

  const overall = Math.max(0, Math.min(1,
    merchantConf.value * weights.merchant +
    dateConf.value * weights.date +
    itemsConf.value * weights.items +
    totalConf.value * weights.total +
    ocrConf * weights.ocr +
    imageQuality.score * weights.imageQuality -
    errorPenalty -
    warningPenalty
  ));

  return {
    overall: round(overall),
    merchant: merchantConf,
    date: dateConf,
    items: itemsConf,
    total: totalConf,
    tax: taxConf,
    imageQuality: round(imageQuality.score),
    ocrConfidence: round(ocrConf),
  };
}

function computeMerchantConfidence(merchant: string | null, ocr: OCRResult): ReceiptFieldConfidence {
  if (!merchant) {
    return { value: 0, source: 'unknown' };
  }

  // Check if merchant name appears in OCR text with high word confidence
  const words = merchant.split(/\s+/);
  const ocrWords = ocr.text.toLowerCase();
  let foundCount = 0;

  for (const word of words) {
    if (ocrWords.includes(word.toLowerCase())) {
      foundCount++;
    }
  }

  const wordRatio = foundCount / words.length;

  if (wordRatio >= 0.8) return { value: 0.9, source: 'high' };
  if (wordRatio >= 0.5) return { value: 0.7, source: 'medium' };
  if (merchant.length > 2) return { value: 0.5, source: 'low' };
  return { value: 0.3, source: 'low' };
}

function computeDateConfidence(date: string | null, ocr: OCRResult): ReceiptFieldConfidence {
  if (!date) {
    return { value: 0, source: 'unknown' };
  }

  // Check if the date pattern appears in OCR text
  const datePattern = date.replace(/-/g, '[\/\-]');
  const hasDateInOCR = new RegExp(datePattern).test(ocr.text) ||
    /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(ocr.text);

  if (hasDateInOCR) return { value: 0.85, source: 'high' };
  return { value: 0.6, source: 'medium' };
}

function computeItemsConfidence(receipt: ReceiptData): ReceiptFieldConfidence {
  if (receipt.items.length === 0) {
    return { value: 0, source: 'unknown' };
  }

  const hasReasonablePrices = receipt.items.every(
    (it) => it.unitPrice > 0 && it.unitPrice < 10000,
  );
  const hasReasonableQuantities = receipt.items.every(
    (it) => it.quantity > 0 && it.quantity <= 20,
  );
  const hasValidNames = receipt.items.every(
    (it) => it.name.length >= 2,
  );

  let conf = 0.4;
  if (receipt.items.length > 0) conf += 0.15;
  if (hasReasonablePrices) conf += 0.15;
  if (hasReasonableQuantities) conf += 0.1;
  if (hasValidNames) conf += 0.1;

  // Bonus: check if items total roughly matches subtotal
  if (receipt.subtotal !== null) {
    const itemsTotal = receipt.items.reduce((sum, it) => sum + it.total, 0);
    if (Math.abs(itemsTotal - receipt.subtotal) < 1) conf += 0.1;
  }

  const source = conf > 0.8 ? 'high' : conf > 0.6 ? 'medium' : 'low';
  return { value: Math.min(1, conf), source };
}

function computeTotalConfidence(total: number | null, ocr: OCRResult): ReceiptFieldConfidence {
  if (total === null) {
    return { value: 0, source: 'unknown' };
  }

  // Sanity check: absurdly high total is likely an OCR decimal error
  if (total > 5000) {
    return { value: 0.1, source: 'low' };
  }

  // Check if the total amount appears in OCR text
  const totalStr = total.toFixed(2);
  const hasTotalInOCR = ocr.text.includes(totalStr);

  // Check if "total" keyword appears
  const hasTotalKeyword = /\btotal\b/i.test(ocr.text);

  if (hasTotalInOCR && hasTotalKeyword) return { value: 0.95, source: 'high' };
  if (hasTotalInOCR) return { value: 0.8, source: 'medium' };
  if (hasTotalKeyword) return { value: 0.6, source: 'medium' };
  return { value: 0.4, source: 'low' };
}

function computeTaxConfidence(tax: number | null, ocr: OCRResult): ReceiptFieldConfidence {
  if (tax === null) {
    return { value: 0, source: 'unknown' };
  }

  const taxStr = tax.toFixed(2);
  const hasTaxInOCR = ocr.text.includes(taxStr);
  const hasTaxKeyword = /\btax\b/i.test(ocr.text);

  if (hasTaxInOCR && hasTaxKeyword) return { value: 0.9, source: 'high' };
  if (hasTaxInOCR) return { value: 0.7, source: 'medium' };
  if (hasTaxKeyword) return { value: 0.5, source: 'medium' };
  return { value: 0.3, source: 'low' };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
