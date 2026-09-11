import { normalizeDigits, containsArabic, extractNumber, normalizeReceiptText } from '../parser/normalize.js';
import { parseReceipt } from '../parser/receipt.js';
import { validateReceipt } from '../validation/index.js';
import { computeConfidence } from '../confidence/index.js';
import { reconstructText } from '../ocr/reconstruct.js';
import type { OCRResult, ImageQuality } from '../types/index.js';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    ${err instanceof Error ? err.message : String(err)}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

function assertEq<T>(actual: T, expected: T, msg: string) {
  if (actual !== expected) throw new Error(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function assertClose(actual: number, expected: number, tolerance: number, msg: string) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${msg}: expected ~${expected}, got ${actual} (tolerance ${tolerance})`);
  }
}

// ── Digit Normalization Tests ──────────────────────────────

console.log('\n── Digit Normalization ──');

test('converts Arabic-Indic digits', () => {
  assertEq(normalizeDigits('١٢٣'), '123', 'Arabic-Indic');
  assertEq(normalizeDigits('٠٥٩'), '059', 'Arabic-Indic zeros');
});

test('converts Extended Arabic digits', () => {
  assertEq(normalizeDigits('۱۲۳'), '123', 'Extended Arabic');
});

test('leaves Western digits unchanged', () => {
  assertEq(normalizeDigits('123.45'), '123.45', 'Western');
});

test('detects Arabic text', () => {
  assert(containsArabic('مرحبا'), 'should detect Arabic');
  assert(!containsArabic('Hello'), 'should not detect Arabic in English');
});

test('extracts numbers from text', () => {
  assertEq(extractNumber('Price: 25.50'), 25.50, 'simple');
  assertEq(extractNumber('٢٥.٥٠'), 25.50, 'Arabic digits');
  assertEq(extractNumber('no numbers here'), null, 'no numbers');
});

test('normalizes receipt text lines', () => {
  const input = '١. Item  ٢٥.٠٠';
  const result = normalizeReceiptText(input);
  assert(result.includes('1'), 'should normalize Arabic-Indic digits');
  assert(result.includes('25'), 'should normalize price');
});

// ── Text Reconstruction Tests ─────────────────────────────

console.log('\n── Text Reconstruction ──');

test('reconstructs lines from OCR blocks', () => {
  const ocr: OCRResult = {
    text: 'Store Name\nItem 1  25.00\nTotal  25.00',
    blocks: [
      {
        text: 'Store Name',
        confidence: 90,
        bbox: { x0: 0, y0: 0, x1: 200, y1: 20 },
        lines: [{
          text: 'Store Name',
          confidence: 90,
          bbox: { x0: 0, y0: 0, x1: 200, y1: 20 },
          words: [],
        }],
      },
      {
        text: 'Item 1  25.00',
        confidence: 85,
        bbox: { x0: 0, y0: 30, x1: 200, y1: 50 },
        lines: [{
          text: 'Item 1  25.00',
          confidence: 85,
          bbox: { x0: 0, y0: 30, x1: 200, y1: 50 },
          words: [],
        }],
      },
    ],
    confidence: 88,
    provider: 'test',
    metadata: { processingTimeMs: 100 },
  };

  const result = reconstructText(ocr);
  assert(result.lines.length === 2, `should have 2 lines, got ${result.lines.length}`);
  assertEq(result.lines[0].text, 'Store Name', 'first line');
  assertEq(result.lines[1].text, 'Item 1  25.00', 'second line');
});

test('falls back to raw text when no blocks', () => {
  const ocr: OCRResult = {
    text: 'Line 1\nLine 2',
    blocks: [],
    confidence: 70,
    provider: 'test',
    metadata: { processingTimeMs: 50 },
  };

  const result = reconstructText(ocr);
  assert(result.lines.length === 2, `should have 2 lines, got ${result.lines.length}`);
});

// ── Receipt Parser Tests ───────────────────────────────────

console.log('\n── Receipt Parser ──');

test('parses a standard English receipt', () => {
  const text = `WHOLE FOODS MARKET
123 Main St
09/04/2026

Organic Bananas      2.49
Sourdough Bread      5.99
Almond Milk  2       7.98

Subtotal            16.46
Tax                  1.32
Total               17.78
Visa ****4242`;

  const receipt = parseReceipt(text, text);
  assertEq(receipt.merchant, 'WHOLE FOODS MARKET', 'merchant');
  assertEq(receipt.date, '2026-09-04', 'date');
  assert(receipt.items.length >= 2, `should have >= 2 items, got ${receipt.items.length}`);
  assertEq(receipt.currency, 'USD', 'currency');
  assertEq(receipt.paymentMethod, 'Visa ****4242', 'payment method');
});

test('parses receipt with Arabic-Indic digits', () => {
  const text = `متجر abc
٠٥/٠٩/٢٠٢٦

حليب       ١٥.٠٠
خبز        ٥.٥٠

الإجمالي  ٢٠.٥٠`;

  const receipt = parseReceipt(text, text);
  assertEq(receipt.date, '2026-09-05', 'date with Arabic digits');
  assert(receipt.items.length > 0, `should parse items, got ${receipt.items.length}`);
});

test('handles missing fields gracefully', () => {
  const text = `Some random text without structure`;
  const receipt = parseReceipt(text, text);
  assertEq(receipt.merchant, null, 'no merchant');
  assertEq(receipt.date, null, 'no date');
  assertEq(receipt.total, null, 'no total');
  assertEq(receipt.items.length, 0, 'no items');
});

test('parses quantities and prices', () => {
  const text = `STORE
2 x Widget    10.00
1 x Gadget     5.99
Total         25.99`;

  const receipt = parseReceipt(text, text);
  assert(receipt.items.length >= 2, `should parse items, got ${receipt.items.length}`);

  const widget = receipt.items.find((i) => i.name.includes('Widget'));
  assert(widget !== undefined, 'should find Widget');
  assertEq(widget!.quantity, 2, 'Widget quantity');
  assertEq(widget!.unitPrice, 10.00, 'Widget price');
});

// ── Validation Tests ───────────────────────────────────────

console.log('\n── Validation ──');

test('validates a good receipt', () => {
  const receipt = {
    merchant: 'Store',
    date: '2026-09-04',
    time: '14:30',
    receiptNumber: null,
    currency: 'USD',
    items: [
      { name: 'Item', quantity: 1, unitPrice: 10, total: 10, rawText: 'Item 10', confidence: 0.9 },
    ],
    subtotal: 10,
    discounts: 0,
    tax: 0.80,
    total: 10.80,
    paymentMethod: 'Cash',
  };
  const result = validateReceipt(receipt);
  assert(result.isValid, 'should be valid');
  assert(result.issues.filter((i) => i.severity === 'error').length === 0, 'should have no errors');
});

test('detects negative total', () => {
  const receipt = {
    merchant: 'Store',
    date: null,
    time: null,
    receiptNumber: null,
    currency: 'USD',
    items: [],
    subtotal: null,
    discounts: 0,
    tax: null,
    total: -5,
    paymentMethod: null,
  };
  const result = validateReceipt(receipt);
  assert(!result.isValid, 'should be invalid');
  assert(result.issues.some((i) => i.field === 'total' && i.severity === 'error'), 'should flag negative total');
});

test('detects empty items', () => {
  const receipt = {
    merchant: 'Store',
    date: null,
    time: null,
    receiptNumber: null,
    currency: 'USD',
    items: [],
    subtotal: null,
    discounts: 0,
    tax: null,
    total: 10,
    paymentMethod: null,
  };
  const result = validateReceipt(receipt);
  assert(result.issues.some((i) => i.field === 'items'), 'should warn about empty items');
});

// ── Confidence Tests ───────────────────────────────────────

console.log('\n── Confidence ──');

test('computes confidence for a complete receipt', () => {
  const receipt = {
    merchant: 'Whole Foods',
    date: '2026-09-04',
    time: '14:30',
    receiptNumber: '12345',
    currency: 'USD',
    items: [
      { name: 'Bananas', quantity: 1, unitPrice: 2.49, total: 2.49, rawText: 'Bananas 2.49', confidence: 0.95 },
    ],
    subtotal: 2.49,
    discounts: 0,
    tax: 0.20,
    total: 2.69,
    paymentMethod: 'Visa',
  };

  const ocr: OCRResult = {
    text: 'some text',
    blocks: [],
    confidence: 90,
    provider: 'tesseract',
    metadata: { processingTimeMs: 1000 },
  };

  const quality: ImageQuality = {
    score: 0.9,
    isBlurry: false,
    isDark: false,
    isLowContrast: false,
    isSmall: false,
    warnings: [],
  };

  const conf = computeConfidence(receipt, ocr, quality, []);
  assert(conf.overall > 0.5, `overall confidence should be > 0.5, got ${conf.overall}`);
  assert(conf.merchant.value > 0, 'merchant confidence should be > 0');
  assert(conf.total.value > 0, 'total confidence should be > 0');
});

test('lower confidence for missing fields', () => {
  const receipt = {
    merchant: null,
    date: null,
    time: null,
    receiptNumber: null,
    currency: 'USD',
    items: [],
    subtotal: null,
    discounts: 0,
    tax: null,
    total: null,
    paymentMethod: null,
  };

  const ocr: OCRResult = {
    text: 'some text',
    blocks: [],
    confidence: 50,
    provider: 'tesseract',
    metadata: { processingTimeMs: 500 },
  };

  const quality: ImageQuality = {
    score: 0.5,
    isBlurry: true,
    isDark: true,
    isLowContrast: true,
    isSmall: true,
    warnings: ['dark', 'blurry'],
  };

  const conf = computeConfidence(receipt, ocr, quality, []);
  assert(conf.overall < 0.4, `overall should be < 0.4, got ${conf.overall}`);
});

// ── Summary ────────────────────────────────────────────────

console.log(`\n═══════════════════════════════`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`═══════════════════════════════\n`);

process.exit(failed > 0 ? 1 : 0);
