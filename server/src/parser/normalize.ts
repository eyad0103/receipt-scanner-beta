// Arabic-Indic digits: ٠١٢٣٤٥٦٧٨٩ → 0123456789
const ARABIC_INDIC_DIGITS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

// Extended Arabic-Indic digits: ۰۱۲۳۴۵۶۷۸۹ → 0123456789
const EXTENDED_ARABIC_DIGITS: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
};

const ALL_DIGIT_MAPS = [ARABIC_INDIC_DIGITS, EXTENDED_ARABIC_DIGITS];

/**
 * Normalize Arabic-Indic and Extended Arabic digits to Western Arabic digits.
 * Only transforms digits, leaves Arabic text untouched.
 */
export function normalizeDigits(text: string): string {
  let result = text;
  for (const map of ALL_DIGIT_MAPS) {
    for (const [arabic, western] of Object.entries(map)) {
      result = result.split(arabic).join(western);
    }
  }
  return result;
}

/**
 * Detect if text contains Arabic characters (not just digits).
 */
export function containsArabic(text: string): boolean {
  // Arabic range: \u0600-\u06FF, Arabic Supplement: \u0750-\u077F,
  // Arabic Extended-A: \u08A0-\u08FF, Arabic Presentation Forms-A: \uFB50-\uFDFF, \uFE70-\uFEFF
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

/**
 * Normalize a currency/price string:
 * - Normalize digits
 * - Standardize currency symbols
 * - Handle Arabic currency notations
 */
export function normalizeCurrency(text: string): string {
  let result = normalizeDigits(text);

  // Normalize common currency representations
  result = result.replace(/美元/g, 'USD');
  result = result.replace(/ريال/g, 'SAR');
  result = result.replace(/درهم/g, 'AED');
  result = result.replace(/جنيه/g, 'EGP');

  return result;
}

/**
 * Extract the first number found in text, normalizing digits first.
 */
export function extractNumber(text: string): number | null {
  const normalized = normalizeDigits(text);
  const match = normalized.match(/[\d,]+\.?\d*/);
  if (!match) return null;
  const cleaned = match[0].replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Normalize a complete receipt text block: normalize all digits,
 * preserve Arabic text, normalize currency.
 */
export function normalizeReceiptText(text: string): string {
  const lines = text.split('\n');
  return lines.map((line) => normalizeDigits(line.trim())).join('\n');
}
