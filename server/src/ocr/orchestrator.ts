import { log } from '../logging/index.js';
import type { OCRProvider, OCROutcome, OCRResult } from '../types/index.js';
import { TesseractProvider } from './tesseract.js';

/**
 * OCR orchestrator — runs provider×variant combinations and picks the best.
 *
 * KEY RULES:
 * - Only 2-3 variants (original + upscaled + contrast-upscale for small images)
 * - Score by receipt-quality signals, NOT text length
 * - EARLY REJECTION: if OCR is garbage, don't pretend it's good
 * - Honest confidence: if we can't read it, say so
 */

interface ScoredOutcome {
  outcome: OCROutcome;
  variantLabel: string;
  receiptScore: number;
}

export function createOCRProviders(): OCRProvider[] {
  return [new TesseractProvider()];
}

export async function runOCRWithFallback(
  providers: OCRProvider[],
  imageBuffers: { buffer: Buffer; label: string }[],
  lang?: string,
): Promise<{
  outcome: OCROutcome;
  variantLabel: string;
  variantResults: Array<{
    variant: string;
    confidence: number;
    receiptScore: number;
    textPreview: string;
    textLength: number;
  }>;
}> {
  const scored: ScoredOutcome[] = [];
  const variantResults: Array<{
    variant: string;
    confidence: number;
    receiptScore: number;
    textPreview: string;
    textLength: number;
  }> = [];

  for (const variant of imageBuffers) {
    for (const provider of providers) {
      log.debug('Running OCR', { provider: provider.name, variant: variant.label });

      const outcome = await withTimeout(provider.process(variant.buffer, lang), 60_000);

      if (outcome.status === 'success' && outcome.result) {
        const score = scoreReceiptOCR(outcome.result, variant.label);
        log.info('OCR variant completed', {
          provider: provider.name,
          variant: variant.label,
          confidence: outcome.result.confidence.toFixed(1),
          receiptScore: score.toFixed(2),
          textLength: outcome.result.text.trim().length,
        });

        // Collect variant results for debug
        variantResults.push({
          variant: variant.label,
          confidence: outcome.result.confidence,
          receiptScore: score,
          textPreview: outcome.result.text.slice(0, 100),
          textLength: outcome.result.text.trim().length,
        });

        // EARLY REJECTION: if score is terrible, don't even consider this variant
        if (score < 5) {
          log.warn('OCR variant rejected — garbage quality', {
            variant: variant.label,
            score: score.toFixed(2),
          });
          continue;
        }

        scored.push({ outcome, variantLabel: variant.label, receiptScore: score });

        // Early exit: if we get an excellent score, no need to try more variants
        if (score >= 60) {
          log.info('Early exit — excellent score achieved', {
            variant: variant.label,
            score: score.toFixed(2),
          });
          return { outcome, variantLabel: variant.label, variantResults };
        }
      } else {
        log.warn('OCR variant failed', {
          provider: provider.name,
          variant: variant.label,
          status: outcome.status,
          error: outcome.error,
        });
      }
    }
  }

  // Pick the best scored outcome
  scored.sort((a, b) => b.receiptScore - a.receiptScore);

  if (scored.length > 0) {
    const best = scored[0];

    // If the best score is still poor, mark it honestly
    if (best.receiptScore < 20) {
      log.warn('All OCR variants produced poor results', {
        bestScore: best.receiptScore.toFixed(2),
        bestConfidence: best.outcome.result?.confidence.toFixed(1),
      });
    }

    log.info('Best OCR selected', {
      variant: best.variantLabel,
      receiptScore: best.receiptScore.toFixed(2),
      confidence: best.outcome.result?.confidence.toFixed(1),
      textPreview: best.outcome.result?.text.slice(0, 100),
    });
    return { outcome: best.outcome, variantLabel: best.variantLabel, variantResults };
  }

  log.error('All OCR attempts failed', undefined, { attempts: scored.length });
  return {
    outcome: { status: 'failed', result: null, error: 'All OCR providers and variants failed' },
    variantLabel: 'none',
    variantResults,
  };
}

/**
 * Score an OCR result for receipt quality.
 *
 * CRITICAL: Do NOT use text.length as a primary signal.
 * Garbage OCR produces MORE text than good OCR.
 *
 * Receipt-quality signals:
 * - Price patterns (XX.XX) — receipts always have prices
 * - Receipt keywords (total, tax, receipt) — structural signals
 * - Line structure — receipts have many short lines with prices
 * - Confidence — secondary signal (garbage can have high confidence)
 * - Readable text ratio — garbage has mostly special characters
 */
function scoreReceiptOCR(result: OCRResult, variantLabel: string): number {
  const text = result.text;
  const lines = text.split('\n').filter((l) => l.trim().length > 0);

  let score = 0;

  // 1. OCR confidence (PRIMARY — high confidence = reliable text)
  // This is the most important signal. Low confidence means unreliable OCR.
  score += (result.confidence / 100) * 15;

  // 2. Valid price patterns (receipts always have prices)
  const prices = text.match(/\b\d{1,4}\.\d{2}\b/g) || [];
  score += Math.min(prices.length * 2, 15);

  // 3. Receipt keywords (structural signal)
  const keywords = ['total', 'subtotal', 'tax', 'receipt', 'change', 'cash',
    'visa', 'mastercard', 'amex', 'credit', 'debit', 'amount', 'discount',
    'savings', 'coupon', 'paid', 'bill'];
  const textLower = text.toLowerCase();
  const foundKeywords = keywords.filter((k) => textLower.includes(k));
  score += foundKeywords.length * 3;

  // 4. Date pattern
  if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(text)) score += 4;

  // 5. Time pattern
  if (/\d{1,2}:\d{2}/.test(text)) score += 1;

  // 6. Dollar/currency sign
  if (/\$/.test(text) || /\bCHF\b/.test(text) || /\bEUR\b/.test(text)) score += 1;

  // 7. Line structure: receipts have many short lines (items)
  const shortLines = lines.filter((l) => {
    const trimmed = l.trim();
    return trimmed.length > 3 && trimmed.length < 60;
  });
  score += Math.min(shortLines.length * 0.5, 5);

  // 8. READABLE TEXT RATIO (critical for garbage detection)
  const readableLines = lines.filter((l) => {
    const trimmed = l.trim();
    const alphaCount = (trimmed.match(/[a-zA-Z\u0600-\u06FF]/g) || []).length;
    const spaceCount = (trimmed.match(/\s/g) || []).length;
    return alphaCount > trimmed.length * 0.3 && spaceCount > 0;
  });
  const readableRatio = lines.length > 0 ? readableLines.length / lines.length : 0;
  if (readableRatio > 0.7) score += 5;
  else if (readableRatio > 0.4) score += 2;
  else score -= 5;

  // 9. PENALIZE gibberish patterns
  const gibberishLines = lines.filter((l) => /[bcdfghjklmnpqrstvwxyz]{5,}/i.test(l));
  if (gibberishLines.length > lines.length * 0.3) score -= 10;

  // 10. PENALIZE if text is mostly special characters
  const alphaNum = (text.match(/[a-zA-Z0-9]/g) || []).length;
  const totalChars = text.replace(/\s/g, '').length;
  if (totalChars > 0) {
    const readableRatio2 = alphaNum / totalChars;
    if (readableRatio2 < 0.5) score *= 0.3;
  }

  // 11. Penalize very short text
  if (text.trim().length < 20) score *= 0.2;

  // 12. Penalize very long text
  if (text.trim().length > 2000) score *= 0.7;

  // 13. Variant preference — upscaled is benchmark-proven best
  if (variantLabel === 'upscaled') score += 3;
  if (variantLabel === 'original') score += 1;
  if (variantLabel === 'contrast-upscale') score += 1;

  return Math.max(0, score);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`OCR timed out after ${ms}ms`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}
