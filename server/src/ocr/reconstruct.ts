import type { OCRResult, OCRLine, OCRWord } from '../types/index.js';

export interface ReconstructedLine {
  text: string;
  y: number;
  x0: number;
  x1: number;
  confidence: number;
  words: { text: string; x0: number; x1: number; confidence: number }[];
  // Column assignment (for table structure)
  column?: 'item' | 'quantity' | 'unitPrice' | 'total' | 'unknown';
}

/**
 * Column definition for table structure detection
 */
export interface ReceiptColumn {
  label: 'item' | 'quantity' | 'unitPrice' | 'total';
  xRange: [number, number]; // [minX, maxX] in normalized coordinates (0-1000)
  confidence: number;
}

/**
 * Detected table structure
 */
export interface TableStructure {
  columns: ReceiptColumn[];
  itemRows: TableRow[];
  hasTable: boolean;
}

/**
 * A row in the item table
 */
export interface TableRow {
  y: number;
  cells: Map<'item' | 'quantity' | 'unitPrice' | 'total', string>;
  confidence: number;
}

/**
 * Reconstruct text from OCR results using bounding box information.
 *
 * LAYOUT-AWARE APPROACH:
 * - Sort lines by vertical position (y coordinate)
 * - Group lines that are close together (same receipt section)
 * - Preserve word-level positions for column alignment detection
 * - Merge broken lines when appropriate (same section, no price boundary)
 *
 * This is critical for receipts because:
 * - Items are arranged in columns (name ... price)
 * - Totals are aligned to the right
 * - Headers/footers are spatially distinct from items
 */
export function reconstructText(ocr: OCRResult): {
  lines: ReconstructedLine[];
  raw: string;
  normalized: string;
} {
  const allLines: ReconstructedLine[] = [];

  // Extract lines from blocks with bounding box info
  for (const block of ocr.blocks) {
    for (const line of block.lines) {
      if (line.text.trim().length > 0) {
        allLines.push(extractLine(line));
      }
    }
  }

  // Fall back to raw text if no structured blocks
  if (allLines.length === 0 && ocr.text.trim()) {
    const rawLines = ocr.text.split('\n');
    rawLines.forEach((text, i) => {
      if (text.trim().length > 0) {
        allLines.push({
          text: text.trim(),
          y: i * 20,
          x0: 0,
          x1: 1000,
          confidence: ocr.confidence,
          words: [],
        });
      }
    });
  }

  // Sort by vertical position (top to bottom)
  allLines.sort((a, b) => a.y - b.y || a.x0 - b.x0);

  // Merge broken lines: if a line doesn't end with a price pattern
  // and the next line starts without one, they might be one line
  const merged = mergeBrokenLines(allLines);

  const raw = merged.map((l) => l.text).join('\n');
  const normalized = merged
    .map((l) => l.text.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 0)
    .map(cleanOCRPrices)
    .join('\n');

  return { lines: merged, raw, normalized };
}

/**
 * Merge lines that were broken across multiple OCR lines.
 *
 * Receipt lines often break because:
 * - The receipt is wider than the OCR expects
 * - Thermal printer fonts have inconsistent spacing
 * - The image is rotated or skewed
 *
 * Strategy: If two lines are close vertically and neither starts/ends
 * with a price pattern, they're likely one line that was broken.
 */
function mergeBrokenLines(lines: ReconstructedLine[]): ReconstructedLine[] {
  if (lines.length <= 1) return lines;

  const merged: ReconstructedLine[] = [];
  let current = lines[0];

  for (let i = 1; i < lines.length; i++) {
    const next = lines[i];
    const gap = next.y - current.y;
    const currentEndsWithPrice = /\d+\.\d{2}\s*$/.test(current.text);
    const nextStartsWithPrice = /^\s*\d+\.\d{2}/.test(next.text);
    const nextIsItem = /^\s*\d+\s*[x×]/i.test(next.text);

    // If lines are very close vertically and neither ends/starts with a price,
    // and the next line isn't a new item, they're likely one broken line
    if (gap < 15 && !currentEndsWithPrice && !nextStartsWithPrice && !nextIsItem) {
      current = {
        text: current.text + ' ' + next.text,
        y: current.y,
        x0: Math.min(current.x0, next.x0),
        x1: Math.max(current.x1, next.x1),
        confidence: Math.min(current.confidence, next.confidence),
        words: [...current.words, ...next.words],
      };
    } else {
      merged.push(current);
      current = next;
    }
  }
  merged.push(current);
  return merged;
}

/**
 * Detect table structure from reconstructed lines using bounding box positions.
 * 
 * This is critical for thermal receipts with column layouts:
 * - Item name (left)
 * - Quantity (center-left)
 * - Unit price (center-right)
 * - Line total (right)
 */
export function detectTableStructure(lines: ReconstructedLine[]): TableStructure {
  if (lines.length < 3) {
    return { columns: [], itemRows: [], hasTable: false };
  }

  // Find candidate item rows (lines with text that looks like items)
  const candidateRows = lines.filter(l => 
    l.text.length > 3 && 
    !/^(subtotal|tax|total|grand|amount|balance|discount|savings|change|cash|credit|debit|visa|mastercard|amex|card|payment|received|paid|thank|store|items|tel|fax|phone|address|receipt|rech|invoice|bill|order)/i.test(l.text.trim())
  );

  if (candidateRows.length < 2) {
    return { columns: [], itemRows: [], hasTable: false };
  }

  // Analyze X positions to detect columns
  const allWords = candidateRows.flatMap(l => l.words);
  if (allWords.length < 4) {
    return { columns: [], itemRows: [], hasTable: false };
  }

  // Normalize X coordinates to 0-1000 range
  const minX = Math.min(...allWords.map(w => w.x0));
  const maxX = Math.max(...allWords.map(w => w.x1));
  const width = maxX - minX;
  if (width < 100) {
    return { columns: [], itemRows: [], hasTable: false };
  }

  const normalizeX = (x: number) => ((x - minX) / width) * 1000;

  // Cluster words by X position to find column centers
  const wordPositions = allWords.map(w => ({
    text: w.text,
    xCenter: normalizeX((w.x0 + w.x1) / 2),
    x0: normalizeX(w.x0),
    x1: normalizeX(w.x1),
    confidence: w.confidence,
    rowY: candidateRows.find(r => r.words.includes(w))?.y ?? 0,
  }));

  // Simple clustering: group by X position ranges
  // For thermal receipts, typical layout: item(0-300), qty(300-450), unitPrice(450-650), total(650-1000)
  const columns = detectColumns(wordPositions, minX, maxX);
  
  if (columns.length < 2) {
    return { columns: [], itemRows: [], hasTable: false };
  }

  // Build table rows by grouping words by Y position
  const itemRows = buildTableRows(candidateRows, columns, normalizeX);

  return {
    columns,
    itemRows,
    hasTable: itemRows.length >= 1 && columns.length >= 2,
  };
}

function detectColumns(words: { xCenter: number; x0: number; x1: number; text: string; confidence: number; rowY: number }[], minX: number, maxX: number): ReceiptColumn[] {
  // For thermal receipts, we know the typical column layout
  // Use position-based assignment rather than pure clustering
  const width = maxX - minX;
  
  const columns: ReceiptColumn[] = [
    { label: 'item', xRange: [0, 350], confidence: 0.8 },
    { label: 'quantity', xRange: [350, 480], confidence: 0.7 },
    { label: 'unitPrice', xRange: [480, 700], confidence: 0.8 },
    { label: 'total', xRange: [700, 1000], confidence: 0.85 },
  ];

  // Validate columns have supporting words
  return columns.filter(col => {
    const supportingWords = words.filter(w => w.xCenter >= col.xRange[0] && w.xCenter <= col.xRange[1]);
    return supportingWords.length > 0;
  });
}

function buildTableRows(lines: ReconstructedLine[], columns: ReceiptColumn[], normalizeX: (x: number) => number): TableRow[] {
  const rows: TableRow[] = [];

  for (const line of lines) {
    const cells = new Map<'item' | 'quantity' | 'unitPrice' | 'total', string>();
    let cellCount = 0;

    for (const col of columns) {
      const colWords = line.words.filter(w => {
        const xCenter = normalizeX((w.x0 + w.x1) / 2);
        return xCenter >= col.xRange[0] && xCenter <= col.xRange[1];
      });

      if (colWords.length > 0) {
        // Sort words by X position and join
        colWords.sort((a, b) => a.x0 - b.x0);
        cells.set(col.label, colWords.map(w => w.text).join(' '));
        cellCount++;
      }
    }

    // Only create row if we have at least 2 columns (item + price minimum)
    if (cellCount >= 2 && (cells.has('item') || cells.has('unitPrice') || cells.has('total'))) {
      rows.push({
        y: line.y,
        cells,
        confidence: line.confidence,
      });
    }
  }

  return rows;
}

function extractLine(line: OCRLine): ReconstructedLine {
  return {
    text: line.text.trim(),
    y: line.bbox.y0,
    x0: line.bbox.x0,
    x1: line.bbox.x1,
    confidence: line.confidence,
    words: (line.words || []).map((w: OCRWord) => ({
      text: w.text,
      x0: w.bbox.x0,
      x1: w.bbox.x1,
      confidence: w.confidence,
    })),
  };
}

/**
 * Fix OCR decimal point loss in prices.
 *
 * Tesseract commonly drops decimal points:
 *   "5.50" → "55", "12.99" → "1299", "3.45" → "345"
 *
 * Receipt prices almost always have exactly 2 decimal places.
 * When we see an integer at the end of a line (price position),
 * we try inserting a decimal 2 digits from the right.
 *
 * Rules:
 * - Only fix numbers at end of line (price position)
 * - Only fix 2-4 digit integers (reasonable receipt prices)
 * - Result must be between $0.10 and $999.99
 * - Skip lines that are clearly not item lines (headers, totals, etc.)
 */
export function cleanOCRPrices(line: string): string {
  const trimmed = line.trim();

  // Skip summary/header lines — these should NOT have prices reconstructed
  if (/^(subtotal|sub-total|sub total|tax|vat|gst|total|grand total|amount|balance|discount|savings|change|cash|credit|debit|visa|mastercard|amex|card|payment|received|paid|thank|store|items|tel|fax|phone|address|receipt|rech|invoice|bill|order)/i.test(trimmed)) {
    return line;
  }

  // Skip lines that already have decimal prices
  if (/\d+\.\d{2}\b/.test(trimmed)) return line;

  // Skip lines that contain date patterns (e.g., 01/15/2024)
  if (/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(trimmed)) return line;

  // Skip lines that contain time patterns (e.g., 13:29)
  if (/\d{1,2}:\d{2}/.test(trimmed)) return line;

  // Skip lines that are just numbers (not item lines)
  if (/^[\d\s.,]+$/.test(trimmed)) return line;

  // Skip very short lines
  if (trimmed.length < 5) return line;

  // Look for a trailing integer that could be a price
  // Match: item text followed by optional currency symbol and a 2-6 digit integer
  const trailingMatch = trimmed.match(/^(.+?)\s+(\$|€|£|CHF|EUR|USD|GBP)?\s*(\d{2,6})\s*$/);
  if (!trailingMatch) return line;

  const [, prefix, currency, numStr] = trailingMatch;
  const num = parseInt(numStr, 10);

  // The prefix must contain alphabetic characters (it's an item name, not a number)
  if (!/[a-zA-Z]{2,}/.test(prefix)) return line;

  // Skip if prefix is mostly digits (addresses, postal codes, etc.)
  const prefixAlpha = (prefix.match(/[a-zA-Z]/g) || []).length;
  const prefixTotal = prefix.replace(/\s/g, '').length;
  if (prefixTotal > 0 && prefixAlpha / prefixTotal < 0.4) return line;

  // Try inserting decimal 2 digits from the right
  const withDecimal = num / 100;

  // Sanity: receipt items are typically $0.50 - $500.00
  if (withDecimal < 0.50 || withDecimal > 500.00) return line;

  // For 2-digit numbers (10-99), only reconstruct if the result is a common price range
  // e.g., 55 → 5.50 (reasonable), 12 → 0.12 (too cheap for most items, skip)
  if (numStr.length === 2 && withDecimal < 1.00) return line;

  // Reconstruct: insert decimal point
  const fixedNum = withDecimal.toFixed(2);
  const suffix = currency ? ` ${currency}` : '';
  return `${prefix}${suffix} ${fixedNum}`.trim();
}
