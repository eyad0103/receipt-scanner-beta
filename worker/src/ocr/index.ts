import { createWorker } from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
  items: Array<{ name: string; price: number; quantity: number }>;
  merchant: string | null;
  total: number | null;
  date: string | null;
}

const ARABIC_TOTAL_KEYWORDS = ['الإجمالي', 'المجموع', 'الاجمالي', 'المبلغ', 'total', 'amount', 'sum'];
const ARABIC_DATE_KEYWORDS = ['التاريخ', 'التاربخ', 'تاريخ', 'date'];
const SKIP_NAMES = new Set(['cash', 'total', 'subtotal', 'tax', 'change', 'payment', 'card', 'visa', 'master', 'الإجمالي', 'المجموع', 'الضريبة', 'المبلغ', 'الدفع', 'balance', 'طريقة', 'نوع', 'رقم', 'الباقى']);

let workerPromise: Promise<Awaited<ReturnType<typeof createWorker>>> | null = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker('eng+ara', 1, {
      logger: undefined,
      workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@v5.1.1/dist/worker.min.js',
      corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@v5.1.0/tesseract-core.wasm.js',
      langPath: 'https://cdn.jsdelivr.net/npm/@tesseract-ocr/tessdata@4.1.0/',
    });
  }
  return workerPromise;
}

export async function processReceipt(imageBuffer: ArrayBuffer): Promise<OCRResult> {
  const worker = await getWorker();
  
  // Convert ArrayBuffer to base64 data URL for Tesseract
  const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
  const dataUrl = `data:image/jpeg;base64,${base64}`;
  
  const { data } = await worker.recognize(dataUrl);
  
  const lines = data.lines
    .filter(l => l.text.trim().length > 0)
    .map(l => ({ text: l.text.trim(), confidence: l.confidence / 100, bbox: l.bbox }));

  const fullText = lines.map(l => l.text).join('\n');
  const avgConfidence = lines.reduce((sum, l) => sum + l.confidence, 0) / (lines.length || 1);

  // Parse receipt structure
  const items: OCRResult['items'] = [];
  let merchant: string | null = null;
  let total: number | null = null;
  let date: string | null = null;

  // Find total
  for (const line of lines) {
    const lower = line.text.toLowerCase();
    for (const kw of ARABIC_TOTAL_KEYWORDS) {
      if (lower.includes(kw) || line.text.includes(kw)) {
        const nums = line.text.match(/[\d,]+\.?\d*/g);
        if (nums && nums.length > 0) {
          const lastNum = nums[nums.length - 1];
          if (lastNum) {
            const val = parseFloat(lastNum.replace(',', ''));
            if (val > 0) total = val;
          }
        }
        break;
      }
    }
  }

  // Find date
  for (const line of lines) {
    const dateMatch = line.text.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);
    if (dateMatch && dateMatch[1] && !date) date = dateMatch[1];
  }

  // Find merchant (first non-skip line without price)
  for (const line of lines) {
    const lower = line.text.toLowerCase();
    const hasPrice = /\d+[.,]\d{2}/.test(line.text);
    const isSkip = SKIP_NAMES.has(lower) || ARABIC_TOTAL_KEYWORDS.some(kw => lower.includes(kw) || line.text.includes(kw));
    if (!hasPrice && !isSkip && line.text.length > 2 && !merchant) {
      merchant = line.text;
      break;
    }
  }

  // Extract items (lines with prices)
  for (const line of lines) {
    const lower = line.text.toLowerCase();
    const isSkip = SKIP_NAMES.has(lower) || ARABIC_ITEM_EXCLUDE.some(kw => lower.includes(kw) || line.text.includes(kw));
    if (isSkip) continue;

    const priceMatches = line.text.match(/(\d+[,\.]\d{2})/g);
    if (priceMatches) {
      const itemName = line.text.replace(/\d+[,\.]\d{2}/g, '').trim();
      if (itemName && itemName.length > 1) {
        const price = parseFloat(priceMatches[0].replace(',', '.'));
        if (price > 0) {
          items.push({ name: itemName, price, quantity: 1 });
        }
      }
    }
  }

  // If no total found, sum items
  if (total === null && items.length > 0) {
    total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  return {
    text: fullText,
    confidence: avgConfidence,
    items,
    merchant,
    total,
    date,
  };
}

const ARABIC_ITEM_EXCLUDE = ['total', 'subtotal', 'tax', 'cash', 'card', 'date', 'time', 'الإجمالي', 'المجموع', 'الضريبة', 'المبلغ', 'الدفع', 'balance', 'change', 'visa', 'master', 'طريقة', 'نوع', 'رقم', 'الباقى'];