import http from 'http';
import { Router } from 'express';
import multer from 'multer';
import { processReceipt } from '../pipeline/index.js';
import { log } from '../logging/index.js';
import { config } from '../config/index.js';
import { saveTrainingImage } from '../training/storage.js';

const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || 'http://localhost:8001/ocr';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase().split('.').pop();
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'tiff', 'tif', 'bmp'];
    if (!ext || !allowedExts.includes(ext)) {
      cb(new Error(`Unsupported file type: .${ext}`));
      return;
    }
    cb(null, true);
  },
});

export const receiptRouter = Router();

const multerErrorHandler = (err: any, req: any, res: any, next: any) => {
  log.error('Multer error:', { error: String(err?.message || err), stack: err?.stack });
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      status: 'failed',
      receipt: null,
      confidence: null,
      warnings: [],
      errors: [`Upload error: ${err.message}`],
      metadata: { processingTimeMs: 0, ocrProvider: 'none', ocrConfidence: 0, imageQuality: 0, variantsUsed: 0 },
    });
  }
  next(err);
};

receiptRouter.post('/scan', upload.single('receipt'), multerErrorHandler, async (req: any, res: any) => {
  try {
    if (!req.file) {
      log.warn('No file in request after multer', { body: req.body, contentType: req.headers['content-type'] });
      res.status(400).json({
        status: 'failed',
        receipt: null,
        confidence: null,
        warnings: [],
        errors: ['No file uploaded'],
        metadata: { processingTimeMs: 0, ocrProvider: 'none', ocrConfidence: 0, imageQuality: 0, variantsUsed: 0 },
      });
      return;
    }

    const consentGiven = req.body.consent === 'true' || req.body.consent === true;

    log.info('Scan request received', {
      filename: req.file.originalname,
      size: `${(req.file.size / 1024).toFixed(0)}KB`,
      mime: req.file.mimetype,
      consentGiven,
    });

    // Try SmolVLM via Python OCR service first
    const vlmResult = await trySmolVLM(req.file);
    if (vlmResult) {

      if (consentGiven) {
        try {
          await saveTrainingImage(req.file, {
            receipt: vlmResult.receipt,
            confidence: vlmResult.confidence,
            metadata: vlmResult.metadata,
          });
        } catch (err) {
          log.warn('Failed to save training image', { error: String(err) });
        }
      }

      res.json(vlmResult);
      return;
    }

    // Fallback to Node.js Tesseract pipeline
    log.info('SmolVLM unavailable, falling back to Tesseract pipeline');
    const result = await processReceipt(req.file);

    // Only save to training data if user explicitly consented
    if (consentGiven && result.status !== 'failed') {
      try {
        await saveTrainingImage(req.file, {
          receipt: result.receipt,
          confidence: result.confidence,
          metadata: result.metadata,
        });
        log.info('Image saved for OCR training', { filename: req.file.originalname });
      } catch (err) {
        log.warn('Failed to save training image', { error: String(err) });
      }
    } else if (consentGiven) {
      // Even failed scans can be useful for training
      try {
        await saveTrainingImage(req.file, { status: result.status, errors: result.errors });
      } catch (err) {
        log.warn('Failed to save training image (failed scan)', { error: String(err) });
      }
    }

    const statusCode = result.status === 'failed' ? 422 : 200;
    res.status(statusCode).json(result);
  } catch (err) {
    log.error('Unhandled error in scan endpoint', err);
    res.status(500).json({
      status: 'failed',
      receipt: null,
      confidence: null,
      warnings: [],
      errors: ['Internal server error'],
      metadata: { processingTimeMs: 0, ocrProvider: 'none', ocrConfidence: 0, imageQuality: 0, variantsUsed: 0 },
    });
  }
});

receiptRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function trySmolVLM(file: Express.Multer.File): Promise<any | null> {
  const start = Date.now();
  try {
    const CRLF = '\r\n';
    
    // Exact match to working test script
    const filePart = '--boundary' + CRLF + 
      'Content-Disposition: form-data; name="file"; filename="' + file.originalname + '"' + CRLF +
      'Content-Type: ' + file.mimetype + CRLF + CRLF;
    const enginePart = CRLF + '--boundary' + CRLF + 
      'Content-Disposition: form-data; name="engine"' + CRLF + CRLF + 'auto';
    const endPart = CRLF + '--boundary--' + CRLF;
    
    const body = Buffer.concat([
      Buffer.from(filePart),
      file.buffer,
      Buffer.from(enginePart),
      Buffer.from(endPart)
    ]);
    
    const options = {
      hostname: 'localhost',
      port: 8001,
      path: '/ocr',
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=boundary',
        'Content-Length': body.length,
      },
      timeout: 180000,
    };

    log.debug('trySmolVLM: Sending request to OCR service...');
    const response = await new Promise<any>((resolve, reject) => {
      const req = http.request(options, (res: any) => {
        let data = '';
        res.on('data', (chunk: any) => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      req.write(body);
      req.end();
    });

    const elapsed = Date.now() - start;

    if (response.status !== 200) {
      log.warn('SmolVLM OCR service returned non-OK', { status: response.status });
      return null;
    }

    const data = response.data;
    if (!data.success || !data.result) {
      log.warn('SmolVLM returned no result', { error: data.error });
      return null;
    }

    const r = data.result;
    const ocrConf = typeof r.confidence === 'number' && !isNaN(r.confidence) ? r.confidence : 0.7;

    const items = (r.items || []).map((item: any) => {
      const price = typeof item.price === 'number' && !isNaN(item.price) ? item.price : 0;
      const qty = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
      return {
        name: String(item.name || 'Item'),
        quantity: qty,
        unitPrice: price,
        total: price * qty,
        rawText: item.name || '',
        confidence: typeof item.confidence === 'number' ? item.confidence : ocrConf,
      };
    }).filter((item: any) => item.name && item.name !== 'Item' && item.total > 0);

    const total = typeof r.total === 'number' && !isNaN(r.total) ? r.total : null;
    const subtotal = typeof r.subtotal === 'number' && !isNaN(r.subtotal) ? r.subtotal : total;
    const tax = typeof r.tax === 'number' && !isNaN(r.tax) ? r.tax : null;
    const merchant = r.merchant ? String(r.merchant) : null;
    const currency = r.currency ? String(r.currency) : 'USD';
    const receiptNumber = r.receiptNumber ? String(r.receiptNumber) : null;

    const now = new Date();
    const dateStr = r.date || new Date().toISOString().slice(0, 10);
    const timeStr = r.time || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    return {
      status: 'success',
      receipt: {
        merchant,
        date: dateStr,
        time: timeStr,
        _ocrDate: r.date || null,
        _ocrTime: r.time || null,
        receiptNumber,
        currency,
        items,
        subtotal,
        discounts: 0,
        tax,
        total,
        paymentMethod: null,
        category: null,
      },
      confidence: {
        overall: ocrConf,
        merchant: { value: merchant ? 0.9 : 0, source: 'smolvlm' },
        date: { value: r.date ? 0.9 : 0, source: 'smolvlm' },
        items: { value: items.length > 0 ? ocrConf : 0, source: 'smolvlm' },
        total: { value: total !== null ? 0.9 : 0, source: 'smolvlm' },
        tax: { value: tax !== null ? 0.9 : 0, source: tax !== null ? 'smolvlm' : 'none' },
        imageQuality: 1.0,
        ocrConfidence: ocrConf,
      },
      warnings: [],
      errors: [],
      metadata: {
        processingTimeMs: elapsed,
        ocrProvider: data.engine_used || 'smolvlm',
        ocrConfidence: ocrConf,
        imageQuality: 1.0,
        variantsUsed: 1,
      },
    };
  } catch (err: any) {
    log.error('trySmolVLM error:', { error: String(err?.message || err), stack: err?.stack });
    if (err?.code === 'ECONNABORTED' || err?.name === 'AbortError') {
      log.warn('SmolVLM request timed out');
    } else {
      log.warn('SmolVLM unavailable', { error: String(err?.message || err) });
    }
    return null;
  }
}
