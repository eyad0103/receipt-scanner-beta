import { validateAndLoadImage } from '../image/validate.js';
import { assessImageQuality, preprocessImage } from '../image/preprocess.js';
import { createOCRProviders, runOCRWithFallback } from '../ocr/orchestrator.js';
import { reconstructText, cleanOCRPrices } from '../ocr/reconstruct.js';
import { normalizeReceiptText, containsArabic, normalizeDigits } from '../parser/normalize.js';
import { parseReceipt } from '../parser/receipt.js';
import { validateReceipt } from '../validation/index.js';
import { computeConfidence } from '../confidence/index.js';
import { log } from '../logging/index.js';
import type { ScanResult, OCRResult, ImageQuality } from '../types/index.js';

export async function processReceipt(
  file: Express.Multer.File,
): Promise<ScanResult> {
  const start = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  // Stage 1: Validate and load image
  log.info('Stage 1: Image validation');
  let imageInfo;
  try {
    imageInfo = await validateAndLoadImage(file);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    return buildResult('failed', null, null, warnings, errors, start, 'none', 0, 0, 0);
  }

  // Stage 2: Assess image quality
  log.info('Stage 2: Quality assessment');
  let quality: ImageQuality;
  try {
    quality = await assessImageQuality(imageInfo);
    warnings.push(...quality.warnings);

    if (imageInfo.width < 300 || imageInfo.height < 400) {
      warnings.push(`Image is very small (${imageInfo.width}×${imageInfo.height}). For best results, use a photo at least 800px wide.`);
      log.warn('Very small image detected', { width: imageInfo.width, height: imageInfo.height });
    }
  } catch (err) {
    log.warn('Quality assessment failed, continuing', { error: String(err) });
    quality = { score: 0.5, isBlurry: false, isDark: false, isLowContrast: false, isSmall: false, warnings: [] };
  }

  // Stage 3: Preprocess image into variants
  log.info('Stage 3: Image preprocessing');
  let variants;
  try {
    variants = await preprocessImage(imageInfo);
  } catch (err) {
    log.warn('Preprocessing failed, using original', { error: String(err) });
    variants = [{ buffer: imageInfo.buffer, width: imageInfo.width, height: imageInfo.height, label: 'original' }];
  }

  // Stage 4: Detect language and run OCR
  log.info('Stage 4: OCR processing');
  // BUG FIX: Create fresh providers per request (Tesseract workers are not thread-safe)
  const providers = createOCRProviders();
  const imageBuffers = variants.map((v) => ({ buffer: v.buffer, label: v.label }));

  let ocrOutcome;
  let detectedLang = 'eng';

  // Pre-detection: if image looks like a thermal receipt (narrow, tall, or portrait receipt-like), 
  // prioritize eng+ara for better Arabic/mixed support
  // Also check for WhatsApp-compressed receipts (960x1280 is common WhatsApp size)
  const isThermalReceipt = (imageInfo.width < 800 && imageInfo.height > imageInfo.width * 1.5) ||
    (imageInfo.width <= 1000 && imageInfo.height > imageInfo.width * 1.2) || // WhatsApp compressed receipts
    (imageInfo.height > imageInfo.width * 1.3 && imageInfo.width < 1200); // Portrait receipt-like
  
  try {
    // Language detection strategy:
    // 1. Run probe with English only (fast, produces clean text for English receipts)
    // 2. If probe confidence is LOW, try eng+ara as fallback (non-English receipt)
    // 3. If probe text contains Arabic Unicode chars, use eng+ara
    // 4. If image looks like thermal receipt, try eng+ara for better small text coverage
    // 5. If probe confidence is moderate but image looks like receipt, try eng+ara
    const langProbe = await providers[0].process(imageInfo.buffer, 'eng');
    if (langProbe.status === 'success' && langProbe.result) {
      const probeConf = langProbe.result.confidence;
      const hasArabicText = containsArabic(langProbe.result.text);

      if (hasArabicText) {
        // Arabic characters detected in English-only OCR = definitely Arabic text
        detectedLang = 'eng+ara';
        log.info('Arabic text detected via Unicode check', {
          confidence: probeConf.toFixed(1),
          textPreview: langProbe.result.text.slice(0, 100),
        });
      } else if (probeConf < 30) {
        // Low confidence with no Arabic detected = try bilingual as fallback
        // (could be a language we don't support, but eng+ara has wider coverage)
        log.info('Low OCR confidence, trying eng+ara fallback', {
          confidence: probeConf.toFixed(1),
        });
        detectedLang = 'eng+ara';
      } else if (isThermalReceipt && probeConf < 60) {
        // Thermal receipts often have small text that benefits from bilingual model
        // Even if no Arabic detected yet, the bilingual model has better small-text handling
        log.info('Thermal receipt detected with moderate confidence, trying eng+ara', {
          confidence: probeConf.toFixed(1),
          dimensions: `${imageInfo.width}x${imageInfo.height}`,
        });
        detectedLang = 'eng+ara';
      } else if (probeConf < 50 && (imageInfo.height > imageInfo.width * 1.2)) {
        // Moderate confidence but tall image = likely receipt with small text
        log.info('Tall image with moderate confidence, trying eng+ara for better small text', {
          confidence: probeConf.toFixed(1),
          dimensions: `${imageInfo.width}x${imageInfo.height}`,
        });
        detectedLang = 'eng+ara';
      }
    }

    ocrOutcome = await runOCRWithFallback(providers, imageBuffers, detectedLang);
  } catch (err) {
    errors.push(`OCR failed: ${err instanceof Error ? err.message : String(err)}`);
    return buildResult('failed', null, null, warnings, errors, start, 'none', 0, quality.score, 0);
  }

  if (ocrOutcome.outcome.status === 'failed' || !ocrOutcome.outcome.result) {
    errors.push(ocrOutcome.outcome.error || 'OCR failed to produce results');
    return buildResult('failed', null, null, warnings, errors, start, 'none', 0, quality.score, 0,
      { variantResults: ocrOutcome.variantResults, imageWidth: imageInfo.width, imageHeight: imageInfo.height, language: detectedLang });
  }

  const ocrResult = ocrOutcome.outcome.result;

  const isWhatsAppReceipt = imageInfo.width >= 900 && imageInfo.width <= 1000 && imageInfo.height >= 1200 && imageInfo.height <= 1400;
  const isLowQualityReceipt = ocrResult.confidence < 50 && (isWhatsAppReceipt || imageInfo.height > imageInfo.width * 1.3);

  if (ocrResult.confidence < 40) {
    warnings.push(`OCR confidence is critically low (${ocrResult.confidence.toFixed(0)}%). The image is likely too small, faded, or blurry for reliable text recognition.`);
  }

  // Quality gate: if OCR confidence is below 50%, the text is likely garbled.
  // BUT: for WhatsApp receipts and tall receipts, lower threshold to 35% since bilingual model + better preprocessing can recover
  const qualityGateThreshold = isLowQualityReceipt ? 35 : 50;
  if (ocrResult.confidence < qualityGateThreshold) {
    log.warn('OCR quality gate triggered', {
      confidence: ocrResult.confidence.toFixed(1),
      textLength: ocrResult.text.trim().length,
      imageWidth: imageInfo.width,
      imageHeight: imageInfo.height,
      threshold: qualityGateThreshold,
      isWhatsAppReceipt,
    });
    errors.push(`Image quality too low for reliable OCR (confidence: ${ocrResult.confidence.toFixed(0)}%). Please take a clearer, higher-resolution photo of the receipt (at least 800px wide).`);
    return buildResult('failed', null, null, warnings, errors, start,
      ocrResult.provider, ocrResult.confidence, quality.score, variants.length,
      { ocrText: ocrResult.text, variantResults: ocrOutcome.variantResults, imageWidth: imageInfo.width, imageHeight: imageInfo.height, language: detectedLang });
  }

  // Stage 5: Reconstruct text using bounding boxes
  log.info('Stage 5: Text reconstruction');
  let reconstructed;
  try {
    reconstructed = reconstructText(ocrResult);
  } catch (err) {
    log.warn('Reconstruction failed, using raw text', { error: String(err) });
    reconstructed = {
      lines: [],
      raw: ocrResult.text,
      normalized: ocrResult.text,
    };
  }

  // Stage 5b: Normalize digits BEFORE price reconstruction (critical for Arabic digits)
  log.info('Stage 5b: Digit normalization for price reconstruction');
  const digitNormalizedLines = reconstructed.lines.map(line => ({
    ...line,
    text: normalizeDigits(line.text),
    words: line.words.map(w => ({ ...w, text: normalizeDigits(w.text) })),
  }));
  const digitNormalizedText = normalizeDigits(reconstructed.normalized);
  reconstructed = {
    ...reconstructed,
    lines: digitNormalizedLines,
    normalized: digitNormalizedText,
  };

  // Stage 5c: Re-run price reconstruction on digit-normalized text
  log.info('Stage 5c: Price reconstruction on normalized digits');
  reconstructed.normalized = reconstructed.lines
    .map(l => l.text.replace(/\s+/g, ' ').trim())
    .filter(l => l.length > 0)
    .map(cleanOCRPrices)
    .join('\n');

  // Stage 6: Normalize text (digits, currencies)
  log.info('Stage 6: Text normalization');
  const normalizedText = normalizeReceiptText(reconstructed.normalized);

  // Stage 7: Parse receipt (with table structure awareness)
  log.info('Stage 7: Receipt parsing');
  let receipt;
  try {
    receipt = parseReceipt(normalizedText, reconstructed.raw, reconstructed.lines);
  } catch (err) {
    errors.push(`Parser error: ${err instanceof Error ? err.message : String(err)}`);
    return buildResult('failed', null, null, warnings, errors, start,
      ocrResult.provider, ocrResult.confidence, quality.score, variants.length);
  }

  // Stage 8: Validate
  log.info('Stage 8: Validation');
  const validation = validateReceipt(receipt);
  for (const issue of validation.issues) {
    if (issue.severity === 'warning') warnings.push(issue.message);
    if (issue.severity === 'error') errors.push(issue.message);
  }

  // Stage 9: Confidence scoring
  log.info('Stage 9: Confidence scoring');
  const confidence = computeConfidence(receipt, ocrResult, quality, validation.issues);

  let status: ScanResult['status'] = 'success';
  if (errors.length > 0 && receipt.items.length === 0 && receipt.total === null) {
    status = 'failed';
  } else if (confidence.overall < 0.4 || validation.issues.some((i) => i.severity === 'error')) {
    status = 'partial';
  }

  log.info('Pipeline complete', {
    status,
    confidence: confidence.overall.toFixed(2),
    items: receipt.items.length,
    merchant: receipt.merchant || '(unknown)',
    language: detectedLang,
    elapsed: `${Date.now() - start}ms`,
  });

  return buildResult(status, receipt, confidence, warnings, errors, start,
    ocrResult.provider, ocrResult.confidence, quality.score, variants.length,
    { ocrText: ocrResult.text, variantResults: ocrOutcome.variantResults, imageWidth: imageInfo.width, imageHeight: imageInfo.height, language: detectedLang });
}

function buildResult(
  status: ScanResult['status'],
  receipt: ScanResult['receipt'],
  confidence: ScanResult['confidence'],
  warnings: string[],
  errors: string[],
  startTime: number,
  ocrProvider: string,
  ocrConfidence: number,
  imageQuality: number,
  variantsUsed: number,
  debugInfo?: {
    ocrText?: string;
    variantResults?: Array<{
      variant: string;
      confidence: number;
      receiptScore: number;
      textPreview: string;
      textLength: number;
    }>;
    imageWidth?: number;
    imageHeight?: number;
    language?: string;
  },
): ScanResult {
  return {
    status,
    receipt,
    confidence,
    warnings,
    errors,
    metadata: {
      processingTimeMs: Date.now() - startTime,
      ocrProvider,
      ocrConfidence,
      imageQuality,
      variantsUsed,
    },
    debug: debugInfo ? {
      ocrText: debugInfo.ocrText || '',
      variantResults: debugInfo.variantResults || [],
      imageWidth: debugInfo.imageWidth || 0,
      imageHeight: debugInfo.imageHeight || 0,
      language: debugInfo.language || 'eng',
    } : undefined,
  };
}
