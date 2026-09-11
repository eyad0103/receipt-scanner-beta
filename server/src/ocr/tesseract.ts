import Tesseract from 'tesseract.js';
import { log } from '../logging/index.js';
import type { OCRProvider, OCROutcome, OCRResult, OCRBlock, OCRLine, OCRWord } from '../types/index.js';

/**
 * Tesseract.js v5 OCR provider - optimized for speed and Arabic accuracy.
 *
 * ARABIC OCR OPTIMIZATIONS:
 * - PSM 6 (uniform block) best for receipts
 * - OEM 1 (LSTM only) for Arabic
 * - Arabic character whitelist
 * - Disable dictionary for receipts
 * - Single best PSM (6) for speed
 */
export class TesseractProvider implements OCRProvider {
  readonly name = 'tesseract';

  async process(image: Buffer, lang?: string): Promise<OCROutcome> {
    const start = Date.now();
    const language = lang || 'eng';

    const tessConfig = this.buildTesseractConfig();

    try {
      const result = await Tesseract.recognize(image, language, {
        ...this.buildTesseractConfig(),
        logger: () => {},
      });

      const elapsed = Date.now() - start;

      if (!result.data || !result.data.text || result.data.text.trim().length === 0) {
        return { status: 'no_text', result: null, error: 'OCR returned empty text' };
      }

      const conf = result.data.confidence ?? 0;

      if (conf < 5 && result.data.text.trim().length < 10) {
        return {
          status: 'low_confidence',
          result: null,
          error: `OCR confidence too low: ${conf.toFixed(1)}%`,
        };
      }

      const cleanedText = this.cleanOCRText(result.data.text);

      const ocrResult: OCRResult = {
        text: cleanedText,
        blocks: this.mapBlocks(result.data.blocks ?? []),
        confidence: conf,
        provider: this.name,
        metadata: {
          processingTimeMs: elapsed,
          language,
          pageCount: 1,
        },
      };

      log.info('Tesseract OCR completed', {
        confidence: conf.toFixed(1),
        textLength: cleanedText.length,
        lineCount: cleanedText.split('\n').length,
        language,
        elapsed: `${elapsed}ms`,
      });

      return { status: 'success', result: ocrResult };
    } catch (err) {
      const elapsed = Date.now() - start;
      log.error('Tesseract OCR failed', err, { elapsed: `${elapsed}ms` });
      return { status: 'failed', result: null, error: String(err) };
    }
  }

  private buildTesseractConfig() {
    return {
      logger: () => {},
      // PSM 6: Uniform block (best for receipts)
      tessedit_pageseg_mode: '6',
      // OEM 1: LSTM only (best for Arabic)
      tessedit_ocr_engine_mode: '1',
      // Character whitelist for Arabic + English + digits + symbols
      tessedit_char_whitelist: '0123456789٠١٢٣٤٥٦٧٨٩ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzابتثجحخدذرزسشصضطظعغفقكلمنهويىءآأؤإئ.,:/-_()[]{}$%@#&*+=|\\ ',
      // Preserve interword spaces for mixed RTL/LTR
      preserve_interword_spaces: '1',
      // Better handling of mixed RTL/LTR
      textord_heavy_nr: '1',
      // Disable dictionary correction for receipts
      load_system_dawg: '0',
      load_freq_dawg: '0',
      // Arabic-specific settings
      textord_min_linesize: '2.5',
      textord_dotmatrix_gap: '3',
    };
  }

  /**
   * Clean OCR text: fix common Tesseract artifacts for receipts.
   * Only fix CONFIDENT misreads — don't alter text we're unsure about.
   */
  private cleanOCRText(text: string): string {
    return text
      // Normalize whitespace within lines (preserve line breaks)
      .replace(/[^\S\n]+/g, ' ')
      // Remove isolated pipe characters (common noise from receipt paper edges)
      .replace(/^\s*\|\s*$/gm, '')
      // Fix dollar sign: S before number → $
      .replace(/\bS\s*(\d)/g, '$$$1')
      // Collapse multiple blank lines
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private mapBlocks(blocks: any[]): OCRBlock[] {
    if (!blocks || !Array.isArray(blocks)) return [];

    return blocks.map((block: any) => ({
      text: this.cleanOCRText(block.text || ''),
      confidence: block.confidence || 0,
      bbox: block.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
      lines: (block.lines || []).map((line: any): OCRLine => ({
        text: this.cleanOCRText(line.text || ''),
        confidence: line.confidence || 0,
        bbox: line.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
        words: (line.words || []).map((word: any): OCRWord => ({
          text: this.cleanOCRText(word.text || ''),
          confidence: word.confidence || 0,
          bbox: word.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
        })),
      })),
    }));
  }
}