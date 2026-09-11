import { normalizeDigits, containsArabic } from './normalize.js';
import { log } from '../logging/index.js';
import type { ReceiptData, ReceiptItem } from '../types/index.js';
import { config } from '../config/index.js';
import { detectTableStructure, TableStructure, TableRow } from '../ocr/reconstruct.js';

// ─── Keywords ────────────────────────────────────────────────
const TOTAL_KEYWORDS = ['total', 'grand total', 'amount due', 'balance due', 'total due', 'total amount'];
const SUBTOTAL_KEYWORDS = ['subtotal', 'sub-total', 'sub total', 'net subtotal', 'total before tax'];
const TAX_KEYWORDS = ['tax', 'vat', 'sales tax', 'gst', 'hst', 'pst'];
const DISCOUNT_KEYWORDS = ['discount', 'savings', 'coupon', 'promotion', 'promo'];
const PAYMENT_KEYWORDS = ['cash', 'credit', 'debit', 'visa', 'mastercard', 'amex', 'apple pay', 'google pay', 'paypal', 'card'];

// Summary lines that should NEVER be treated as items
const SUMMARY_LINE_PATTERNS = /^(subtotal|sub-total|sub total|tax|vat|gst|hst|pst|total|grand total|amount due|balance due|total due|discount|savings|coupon|change|cash|credit|debit|visa|mastercard|amex|card|payment|received|paid|thank|store|items sold|savings)/i;

// Header lines that should be skipped when looking for items
const HEADER_LINE_PATTERNS = /^(tel|fax|phone|address|receipt|rech\.|invoice|bill|order|store\s*#|reg\s|cashier|register|bar\s|tisch|table)/i;
// Also match lines that contain "Tisch" or "Bar" anywhere (table/section info)
const HEADER_LINE_KEYWORDS = /\b(tisch|bar\s+trink|bar\s+tisch|table\s+number)\b/i;

const DATE_PATTERNS = [
  /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/,
  /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/,
];

const TIME_PATTERNS = [
  /(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?/,
];

export function parseReceipt(normalizedText: string, rawText: string, reconstructedLines?: any[]): ReceiptData {
  const lines = normalizedText.split('\n').filter((l) => l.trim().length > 0);

  const merchant = extractMerchant(lines);
  const date = extractDate(lines);
  const time = extractTime(lines);
  const receiptNumber = extractReceiptNumber(lines);
  const paymentMethod = extractPaymentMethod(lines);
  
  // Try table-aware parsing if we have reconstructed lines with bounding boxes
  let items: ReceiptItem[] = [];
  let tableStructure: TableStructure | null = null;
  
  if (reconstructedLines && reconstructedLines.length > 0) {
    tableStructure = detectTableStructure(reconstructedLines);
    if (tableStructure.hasTable && tableStructure.itemRows.length > 0) {
      items = parseItemsFromTable(tableStructure);
      log.info('Table structure detected and parsed', { 
        columns: tableStructure.columns.map(c => c.label),
        rows: tableStructure.itemRows.length 
      });
    }
  }
  
  // Fallback to line-based parsing if table parsing failed or not available
  if (items.length === 0) {
    const extracted = extractItems(lines);
    items = extracted.items;
  }
  
  let total = extractField(lines, TOTAL_KEYWORDS, SUBTOTAL_KEYWORDS);
  let subtotal = extractField(lines, SUBTOTAL_KEYWORDS, []);
  let tax = extractField(lines, TAX_KEYWORDS, []);
  const discounts = extractField(lines, DISCOUNT_KEYWORDS, []) || 0;
  const currency = detectCurrency(lines);

  // Post-process: attempt to fix common OCR price errors
  const correctedItems = postProcessItems(items, total);
  const itemsSum = correctedItems.reduce((acc, i) => acc + i.total, 0);

  if (subtotal === null && itemsSum > 0) {
    subtotal = Math.round(itemsSum * 100) / 100;
  }

  // Tax sanity check: tax cannot exceed subtotal or total or 50% of subtotal
  if (tax !== null) {
    const ref = subtotal || total || 0;
    if (ref > 0 && (tax >= ref || tax > ref * 0.5)) {
      log.warn('Tax sanity check failed — discarding absurd tax value', { tax, ref });
      tax = null;
    }
  }

  // Recalculate total if missing or absurdly inconsistent with items sum
  if (subtotal !== null) {
    const calculatedTotal = Math.round((subtotal + (tax || 0) - discounts) * 100) / 100;
    if (total === null) {
      total = calculatedTotal;
    } else if (Math.abs(total - calculatedTotal) > 50 && itemsSum > 0 && Math.abs(itemsSum - total) > 50) {
      log.warn('Total OCR value inconsistent with items sum — fixing total', { total, calculatedTotal });
      total = calculatedTotal;
    }
  }

  return {
    merchant,
    date,
    time,
    receiptNumber,
    currency,
    items: correctedItems,
    subtotal,
    discounts,
    tax,
    total,
    paymentMethod,
  };
}

function parseItemsFromTable(table: TableStructure): ReceiptItem[] {
  const items: ReceiptItem[] = [];
  
  for (const row of table.itemRows) {
    const itemCell = row.cells.get('item');
    const quantityCell = row.cells.get('quantity');
    const unitPriceCell = row.cells.get('unitPrice');
    const totalCell = row.cells.get('total');
    
    if (!itemCell && !unitPriceCell && !totalCell) continue;
    
    // Parse quantity (default to 1)
    let quantity = 1;
    if (quantityCell) {
      const qtyMatch = quantityCell.match(/(\d+)/);
      if (qtyMatch) quantity = parseInt(qtyMatch[1]);
    }
    
    // Parse unit price
    let unitPrice: number | null = null;
    if (unitPriceCell) {
      unitPrice = parseNum(unitPriceCell);
    }
    
    // Parse total
    let total: number | null = null;
    if (totalCell) {
      total = parseNum(totalCell);
    }
    
    // If no total but have unit price, compute
    if (total === null && unitPrice !== null) {
      total = Math.round(unitPrice * quantity * 100) / 100;
    }
    
    // If no unit price but have total, compute
    if (unitPrice === null && total !== null && quantity > 0) {
      unitPrice = Math.round(total / quantity * 100) / 100;
    }
    
    // Clean item name
    const name = cleanItemName(itemCell || '');
    if (!name || name.length < 2) continue;
    
    // Sanity check prices
    if (unitPrice !== null && (unitPrice < 0 || unitPrice > 500)) continue;
    if (total !== null && (total < 0 || total > 2000)) continue;
    
    items.push({
      name,
      quantity,
      unitPrice: unitPrice ?? 0,
      total: total ?? 0,
      rawText: `${itemCell} | ${quantityCell || ''} | ${unitPriceCell || ''} | ${totalCell || ''}`,
      confidence: row.confidence,
    });
  }
  
  return items;
}

/**
 * Post-process items to fix common OCR price errors.
 *
 * Common OCR mistakes on receipts:
 * - "875.00" instead of "8.75" (decimal point shifted)
 * - "2.50" instead of "26.50" (digit dropped)
 * - "1840.00" instead of "16.50" (digits inserted)
 *
 * Strategy: if the sum of items is close to the total, we can detect
 * which items have wrong prices by checking if removing/fixing them
 * makes the sum match the total.
 */
function postProcessItems(items: ReceiptItem[], total: number | null): ReceiptItem[] {
  if (items.length === 0 || !total || total <= 0) return items;

  const itemsTotal = items.reduce((sum, item) => sum + item.total, 0);

  // If the sum is already close to total, no correction needed
  if (Math.abs(itemsTotal - total) / total < 0.15) return items;

  // If items sum is way MORE than total, some items have inflated prices
  if (itemsTotal > total * 2) {
    // Try to find and fix items with absurd prices
    const fixed = items.map((item) => {
      if (item.total > 100) {
        // Attempt to reconstruct price from item name context
        // Common pattern: OCR dropped decimal, e.g., "875.00" should be "8.75"
        const fixedPrice = attemptDecimalFix(item.total);
        if (fixedPrice && Math.abs(fixedPrice - item.total) > 10) {
          return {
            ...item,
            unitPrice: fixedPrice,
            total: fixedPrice * item.quantity,
          };
        }
      }
      return item;
    });

    // If the fixed version is closer to total, use it
    const fixedTotal = fixed.reduce((sum, item) => sum + item.total, 0);
    if (Math.abs(fixedTotal - total) < Math.abs(itemsTotal - total)) {
      return fixed;
    }
  }

  // If items sum is way LESS than total, some items have deflated prices
  if (itemsTotal < total * 0.5 && items.length > 0) {
    // Scale all items proportionally to match total
    const scale = total / itemsTotal;
    if (scale > 1.5 && scale < 5) {
      return items.map((item) => ({
        ...item,
        unitPrice: Math.round(item.unitPrice * scale * 100) / 100,
        total: Math.round(item.total * scale * 100) / 100,
      }));
    }
  }

  return items;
}

/**
 * Attempt to fix OCR decimal point errors.
 * E.g., 875.00 → 8.75, 1840.00 → 16.50
 */
function attemptDecimalFix(price: number): number | null {
  const str = price.toFixed(2);

  // Pattern: X75.00 → X.75 (e.g., 875.00 → 8.75)
  const match1 = str.match(/^(\d)(\d{2})\.00$/);
  if (match1) {
    const fixed = parseFloat(`${match1[1]}.${match1[2]}`);
    if (fixed > 0 && fixed < 100) return fixed;
  }

  // Pattern: X840.00 → 1X.50 (e.g., 1840.00 → 16.50)
  const match2 = str.match(/^(\d)(\d)(\d{2})\.00$/);
  if (match2) {
    const fixed = parseFloat(`${match2[1]}${match2[2]}.${match2[3]}`);
    if (fixed > 0 && fixed < 100) return fixed;
  }

  // Pattern: XX50.00 → XX.50 (e.g., 3650.00 → 36.50)
  const match3 = str.match(/^(\d{2})(\d{2})\.00$/);
  if (match3) {
    const fixed = parseFloat(`${match3[1]}.${match3[2]}`);
    if (fixed > 0 && fixed < 100) return fixed;
  }

  return null;
}

function extractMerchant(lines: string[]): string | null {
  // Merchant is typically in the first few lines
  // Strategy: find the best candidate from the first 5 lines
  const candidates: { line: string; score: number }[] = [];

  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim();

    if (line.length < 2) continue;
    if (/^\d+$/.test(line)) continue;
    if (/^[\d\s\-().+]+$/.test(line)) continue;
    if (/^tel[:\s]/i.test(line)) continue;
    if (/^fax[:\s]/i.test(line)) continue;
    if (/^\d{1,2}[\/\-]/.test(line)) continue;
    if (/^\d{4,}/.test(line)) continue;

    if (/^(total|subtotal|tax|amount|discount|change|cash|credit|debit|visa|receipt|invoice|bll|bill|order|ticket|table|tisch|bar|guest|reg|register|cashier)/i.test(line)) continue;
    if (/(bill\s*(number|no|\:|#)|order\s*(number|no|\:|#)|ticket\s*(number|no|\:|#)|table\s*(number|no|\:|#)|tax\s*invoice)/i.test(line)) continue;

    // Skip lines that look like item lines with prices or quantities
    if (/[£$€]\s*\d+/.test(line)) continue;
    if (/\d+[.,]\d{2}\s*$/.test(line)) continue;
    if (/^\d+\s+[a-zA-Z\u0600-\u06FF]/.test(line)) continue;

    // Skip common greeting phrases
    if (/^(welcome|thank you|thanks|hello|hi |dear|menu|today)/i.test(line)) continue;

    let cleaned = line
      .replace(/^\|[\s]*/, '')  // Strip leading | from OCR
      .replace(/[\|]$/, '')     // Strip trailing | from OCR
      .replace(/[$]\d+.*/, '')
      .replace(/\s+\d{4,}\s*$/, '')
      .replace(/\s+\d{3}\s*$/, '')
      .trim();

    if (cleaned.length < 2) continue;

    const alphaCount = (cleaned.match(/[a-zA-Z\u0600-\u06FF]/g) || []).length;
    if (alphaCount / cleaned.length < 0.4) continue;

    const wordCount = cleaned.split(/\s+/).length;
    if (wordCount > 6) continue;

    // Score this candidate
    let score = 0;

    // ALL CAPS lines are likely store names
    if (cleaned === cleaned.toUpperCase() && cleaned.length > 3) score += 10;

    // Reasonable length (2-4 words)
    if (wordCount >= 2 && wordCount <= 4) score += 5;

    // Contains common store suffixes
    if (/\b(market|store|shop|grill|cafe|restaurant|bakery|deli|pharmacy|mart)\b/i.test(cleaned)) score += 5;

    // First line gets priority
    if (i === 0) score += 3;
    if (i === 1) score += 2;

    // Penalize lines that look like addresses
    if (/\d+\s+\w+\s+(st|ave|blvd|rd|dr|way|ln|ct)/i.test(cleaned)) score -= 5;

    // Penalize lines with zip codes
    if (/\b\d{5}\b/.test(cleaned)) score -= 3;

    candidates.push({ line: cleaned, score });
  }

  if (candidates.length === 0) return null;

  // Pick the highest-scored candidate
  candidates.sort((a, b) => b.score - a.score);

  // Require minimum score — random text shouldn't be a merchant
  // Real store names get 5+ from ALL CAPS or store suffix or 2-4 word count
  if (candidates[0].score < 5) return null;

  return candidates[0].line;
}

function extractDate(lines: string[]): string | null {
  const fullText = lines.join(' ');
  const hasArabic = containsArabic(fullText);
  const hasNonUSCurrency = /€|£|EUR|GBP|SAR|AED|EGP|KHR|CHF/.test(fullText);
  const useDDMM = hasArabic || hasNonUSCurrency;

  for (const line of lines) {
    const normalized = normalizeDigits(line);
    for (const pattern of DATE_PATTERNS) {
      const match = normalized.match(pattern);
      if (match) {
        let [, part1, part2, part3] = match;
        const year = (part3 || '').length === 2 ? `20${part3}` : (part3 || '');

        if (useDDMM) {
          return `${year}-${part2.padStart(2, '0')}-${part1.padStart(2, '0')}`;
        } else {
          return `${year}-${part1.padStart(2, '0')}-${part2.padStart(2, '0')}`;
        }
      }
    }
  }
  return null;
}

function extractTime(lines: string[]): string | null {
  for (const line of lines) {
    const normalized = normalizeDigits(line);
    for (const pattern of TIME_PATTERNS) {
      const match = normalized.match(pattern);
      if (match) {
        let hour = parseInt(match[1]);
        const minute = match[2];
        const ampm = match[4];
        if (ampm) {
          if (ampm.toLowerCase() === 'pm' && hour < 12) hour += 12;
          if (ampm.toLowerCase() === 'am' && hour === 12) hour = 0;
        }
        return `${hour.toString().padStart(2, '0')}:${minute}`;
      }
    }
  }
  return null;
}

function extractReceiptNumber(lines: string[]): string | null {
  for (const line of lines) {
    const match = line.match(/(?:receipt|invoice|bill|ref|order)[\s#:]*(\w+)/i);
    if (match) return match[1];
  }
  return null;
}

function extractPaymentMethod(lines: string[]): string | null {
  for (const line of lines) {
    const normalized = normalizeDigits(line.toLowerCase());
    for (const keyword of PAYMENT_KEYWORDS) {
      if (normalized.includes(keyword)) {
        const cardMatch = normalized.match(/(\*+\d{4}|\d{4}\*+|•+\d{4}|\d{4}•+)/);
        if (cardMatch) {
          return `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} ${cardMatch[1]}`;
        }
        return keyword.charAt(0).toUpperCase() + keyword.slice(1);
      }
    }
  }
  return null;
}

function extractItems(lines: string[]): { items: ReceiptItem[]; itemLines: Set<number> } {
  const items: ReceiptItem[] = [];
  const itemLines = new Set<number>();
  const seenItems = new Set<string>();

  const startIdx = findItemStart(lines);
  const endIdx = findItemEnd(lines);

  for (let i = startIdx; i < endIdx; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip summary/footer lines
    if (SUMMARY_LINE_PATTERNS.test(trimmed)) continue;
    if (HEADER_LINE_PATTERNS.test(trimmed)) continue;
    if (HEADER_LINE_KEYWORDS.test(trimmed)) continue;

    // Skip lines that look like addresses or phone numbers
    if (/^\d+\s+\w+\s+(st|ave|blvd|rd|dr|way|ln|ct)\b/i.test(trimmed)) continue;
    if (/^tel[:\s]/i.test(trimmed)) continue;
    if (/^\d{3}[-.\s]\d{3}[-.\s]\d{4}/.test(trimmed)) continue;

    // Skip date/time only lines
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(trimmed)) continue;
    if (/^\d{1,2}:\d{2}\s*(AM|PM)?$/i.test(trimmed)) continue;

    if (trimmed.length < 3) continue;

    // Handle add-on/modifier lines (start with +, Add, Extra, etc.)
    // These are NOT standalone items — they modify the previous item
    const isModifier = /^[+]\s/.test(trimmed) || /^(add|extra|sub|no |less )\s/i.test(trimmed);
    if (isModifier && items.length > 0) {
      const parsed = parseItemLine(line);
      if (parsed && parsed.unitPrice > 0) {
        // Add modifier price to previous item's total
        const prevItem = items[items.length - 1];
        prevItem.total = Math.round((prevItem.total + parsed.unitPrice) * 100) / 100;
        prevItem.rawText += ' | ' + line;
      }
      continue;
    }

    const parsed = parseItemLine(line);

    if (parsed && !seenItems.has(parsed.name.toLowerCase())) {
      if (parsed.quantity > 0 && parsed.quantity <= config.parser.maxItems) {
        if (parsed.total >= 0 && parsed.total < 100000) {
          if (parsed.unitPrice >= 0) {
            if (!SUMMARY_LINE_PATTERNS.test(parsed.name)) {
              // Price sanity: reject obviously wrong prices
              // Restaurant items are rarely > $500, and never > $2000
              if (parsed.unitPrice <= 500 && parsed.total <= 2000) {
                items.push(parsed);
                itemLines.add(i);
                seenItems.add(parsed.name.toLowerCase());
              }
            }
          }
        }
      }
    }
  }

  return { items, itemLines };
}

function parseItemLine(line: string): ReceiptItem | null {
  let normalized = normalizeDigits(line);

  // Clean OCR artifacts: leading/trailing |, extra spaces, stray characters
  normalized = normalized.replace(/^\|[\s]*/, '').replace(/[\|]$/, '').trim();

  // Fix common OCR quantity errors: "Ix" → "1x", standalone "x" → "1x"
  normalized = normalized.replace(/^Ix/i, '1x');
  normalized = normalized.replace(/^(\s*)x\s/i, '$11x ');

  // Strip trailing noise: OCR often adds random letters/punctuation after the last price
  // e.g., "9.00 at" → "9.00", "22.00 ERE" → "22.00", "22.00 ;" → "22.00"
  normalized = normalized.replace(/(\d+\.?\d{0,2})\s+[A-Za-z;:,]{1,4}\s*$/, '$1');

  // Pattern 1: Swiss/European style "1xLatte Macchiato a 4.50 CHF 9.00"
  // "a" means "at" (price per unit), CHF/EUR/USD is the currency code
  // REQUIRES "a" keyword and currency code between the two prices
  const swissMatch = normalized.match(/^(\d+)\s*[x×]\s*(.+?)\s+a\s+([\d,]+\.\d{2})\s+(?:CHF|EUR|USD|GBP)\s+([\d,]+\.\d{2})\s*$/i);
  if (swissMatch) {
    const quantity = parseInt(swissMatch[1]);
    const name = cleanItemName(swissMatch[2]);
    const unitPrice = parseNum(swissMatch[3]);
    const total = parseNum(swissMatch[4]);
    if (name && unitPrice !== null && total !== null && quantity > 0) {
      return {
        name,
        quantity,
        unitPrice,
        total,
        rawText: line,
        confidence: 0.8,
      };
    }
  }

  // Pattern 2: "1xItem 4.50 CHF 9.00" (quantity x name, unit price, total)
  // REQUIRES a non-whitespace char (like CHF/$/€) between the two prices to avoid ambiguity
  const qtyPriceTotal = normalized.match(/^(\d+)\s*[x×]\s*(.+?)\s+([\d,]+\.\d{2})\s+(?:CHF|EUR|USD|GBP|\$|€|£)\s*([\d,]+\.\d{2})\s*$/i);
  if (qtyPriceTotal) {
    const quantity = parseInt(qtyPriceTotal[1]);
    const name = cleanItemName(qtyPriceTotal[2]);
    const unitPrice = parseNum(qtyPriceTotal[3]);
    const total = parseNum(qtyPriceTotal[4]);
    if (name && unitPrice !== null && total !== null && quantity > 0) {
      return {
        name,
        quantity,
        unitPrice,
        total,
        rawText: line,
        confidence: 0.8,
      };
    }
  }

  // Pattern 3: "2 x Widget    10.00" (quantity x name, single price)
  const qtyMatch = normalized.match(/^(\d+)\s*[x×]\s+(.+?)\s+([\d,]+\.?\d{0,2})\s*$/i);
  if (qtyMatch) {
    const quantity = parseInt(qtyMatch[1]);
    const name = cleanItemName(qtyMatch[2]);
    const unitPrice = parseNum(qtyMatch[3]);
    if (name && unitPrice !== null && quantity > 0) {
      return {
        name,
        quantity,
        unitPrice,
        total: Math.round(unitPrice * quantity * 100) / 100,
        rawText: line,
        confidence: 0.8,
      };
    }
  }

  // Pattern 4: "Item Name a 9.00 CHF" (Swiss style without quantity prefix)
  // REQUIRES "a" keyword and currency code
  const swissNoQty = normalized.match(/^(.+?)\s+a\s+([\d,]+\.\d{2})\s+(?:CHF|EUR|USD|GBP)\s+([\d,]+\.\d{2})\s*$/i);
  if (swissNoQty) {
    const name = cleanItemName(swissNoQty[1]);
    const unitPrice = parseNum(swissNoQty[2]);
    const total = parseNum(swissNoQty[3]);
    if (name && unitPrice !== null && total !== null) {
      return {
        name,
        quantity: 1,
        unitPrice,
        total,
        rawText: line,
        confidence: 0.8,
      };
    }
  }

  // Pattern 4b: "Item Name a 9.00 CHF" (single price, Swiss style)
  const swissSingle = normalized.match(/^(.+?)\s+a\s+([\d,]+\.\d{2})\s*(?:CHF|EUR|USD|GBP|\$|€|£)?\s*$/i);
  if (swissSingle) {
    const name = cleanItemName(swissSingle[1]);
    const price = parseNum(swissSingle[2]);
    if (name && price !== null && price >= 0) {
      return {
        name,
        quantity: 1,
        unitPrice: price,
        total: price,
        rawText: line,
        confidence: 0.8,
      };
    }
  }

  // Pattern 5: "Item Name    9.00" (name followed by price at end)
  // Also handles "Item Name CHF 9.00"
  const namePriceMatch = normalized.match(/^(.+?)\s+(?:CHF|EUR|USD|GBP|\$|€|£)?\s*([\d,]+\.?\d{0,2})\s*$/i);
  if (namePriceMatch) {
    const name = cleanItemName(namePriceMatch[1]);
    const price = parseNum(namePriceMatch[2]);
    if (name && price !== null && price >= 0) {
      return {
        name,
        quantity: 1,
        unitPrice: price,
        total: price,
        rawText: line,
        confidence: 0.8,
      };
    }
  }

  // Pattern 5: Generic — extract prices from the line
  const priceMatches = normalized.match(/[\d,]+\.?\d{0,2}(?=\s*$)/g);
  if (!priceMatches || priceMatches.length === 0) return null;

  let total: number;
  let unitPrice: number;
  let quantity: number;
  let name: string;

  if (priceMatches.length >= 2) {
    const num1 = parseNum(priceMatches[priceMatches.length - 2]);
    const num2 = parseNum(priceMatches[priceMatches.length - 1]);

    if (num1 !== null && num2 !== null) {
      if (Number.isInteger(num1) && num1 > 0 && num1 <= 20 && num2 >= num1) {
        quantity = num1;
        unitPrice = num2;
        total = num1 * num2;
      } else {
        quantity = 1;
        unitPrice = num1;
        total = num2;
      }
    } else {
      return null;
    }
  } else {
    const price = parseNum(priceMatches[0]);
    if (price === null || price < 0) return null;
    quantity = 1;
    unitPrice = price;
    total = price;
  }

  // Extract name (everything before the last numbers)
  const nameMatch = normalized.replace(/[\d,]+\.?\d{0,2}\s*$/, '').trim();
  if (nameMatch.length < 1) return null;

  name = cleanItemName(nameMatch) ?? '';
  if (!name) return null;

  return {
    name,
    quantity,
    unitPrice: Math.round(unitPrice * 100) / 100,
    total: Math.round(total * 100) / 100,
    rawText: line,
    confidence: 0.8,
  };
}

/**
 * Clean an item name extracted from OCR text.
 * Returns null if the name is too short or looks like garbage.
 */
function cleanItemName(raw: string): string | null {
  let name = raw
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-—|]+|[\s\-—|]+$/g, '')
    .trim();

  if (name.length < 2) return null;
  if (SUMMARY_LINE_PATTERNS.test(name)) return null;
  // Skip single-character or noise names (e.g., "x" from "x 3.74" OCR artifact)
  if (name.replace(/[^a-zA-Z\u0600-\u06FF]/g, '').length < 2) return null;

  return name;
}

function parseNum(s: string): number | null {
  const cleaned = s.replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function findItemStart(lines: string[]): number {
  // Look for explicit item headers
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    if (/(item|product|qty|description|quantity|items purchased)/i.test(lines[i])) {
      return i + 1;
    }
  }

  // For receipts without headers, find where items begin
  for (let i = 0; i < Math.min(12, lines.length); i++) {
    const line = lines[i].trim();
    // Separator line often marks end of header
    if (/^[-=_*#.\s]{3,}$/.test(line)) {
      return i + 1;
    }
    // Date/time line often marks end of header block
    if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(line)) {
      if (i + 1 < lines.length) {
        const next = lines[i + 1].trim();
        if (/^[-=_*#.\s]{3,}$/.test(next)) return i + 2;
        if (/\d+\.\d{2}\s*$/.test(next)) return i + 1;
      }
      return i + 1;
    }
    // "Tisch" (German for table) or "Bar" prefix often marks end of header
    if (/^(tisch|bar|table|reg|register|cashier)/i.test(line)) {
      if (i + 1 < lines.length) return i + 1;
    }
    // If this line has a price at the end, it's likely an item
    if (/\d+\.\d{2}\s*$/.test(line)) {
      return i;
    }
  }

  return Math.min(1, lines.length);
}

function findItemEnd(lines: string[]): number {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim().toLowerCase();
    if (TOTAL_KEYWORDS.some((k) => {
      if (k === 'total') {
        return /\btotal\b/.test(line) && !/\bsubtotal\b/.test(line);
      }
      return line.includes(k);
    })) {
      return i;
    }
    if (SUBTOTAL_KEYWORDS.some((k) => line.includes(k))) {
      return i;
    }
  }
  return lines.length;
}

function extractField(lines: string[], keywords: string[], excludeKeywords: string[]): number | null {
  for (const line of lines) {
    const normalized = normalizeDigits(line.toLowerCase());
    const trimmed = normalized.trim();

    let matched = false;
    for (const keyword of keywords) {
      const pattern = new RegExp(`\\b${keyword}\\b`, 'i');
      if (pattern.test(trimmed)) {
        if (excludeKeywords.length > 0) {
          const excluded = excludeKeywords.some((ek) => {
            const ep = new RegExp(`\\b${ek}\\b`, 'i');
            return ep.test(trimmed);
          });
          if (excluded) continue;
        }
        matched = true;
        break;
      }
    }

    if (matched) {
      const priceMatch = trimmed.match(/([\d,]+\.?\d{0,2})\s*$/);
      if (priceMatch) {
        const val = parseNum(priceMatch[1]);
        if (val !== null) return val;
      }
      const priceMatch2 = trimmed.match(/([\d,]+\.?\d{0,2})\s/);
      if (priceMatch2) {
        const val = parseNum(priceMatch2[1]);
        if (val !== null) return val;
      }
    }
  }
  return null;
}

function detectCurrency(lines: string[]): string {
  const text = lines.join(' ');
  if (/£|GBP|\bpounds?\b/i.test(text)) return 'GBP';
  if (/€|EUR|\beuros?\b/i.test(text)) return 'EUR';
  if (/\bEGP\b|\bL\.E\.\b|\bLE\b|جنيه/i.test(text)) return 'EGP';
  if (/\bSAR\b|\bSR\b|ريال|ر\.س/i.test(text)) return 'SAR';
  if (/\bAED\b|درهم|د\.إ/i.test(text)) return 'AED';
  if (/\bCHF\b/i.test(text)) return 'CHF';
  if (/\$|\bUSD\b|\bdollars?\b/i.test(text)) return 'USD';
  if (/\bKHR\b|riel|៛/i.test(text)) return 'KHR';
  return 'USD';
}
