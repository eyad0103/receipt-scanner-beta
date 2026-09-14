import { Hono } from 'hono';
import { z } from 'zod';
import { Database } from '../db';
import type { Receipt } from '../db';
import { getUserFromRequest } from '../auth';
import { processReceipt } from '../ocr';
import type { Env } from '../index';

const receiptRouter = new Hono<{ Bindings: Env }>();

const scanSchema = z.object({
  consent: z.string().optional(),
});

function parseReceiptResult(ocr: Awaited<ReturnType<typeof processReceipt>>, userId: string, imageUrl: string | null, consent: boolean): Omit<Receipt, 'created_at' | 'updated_at'> {
  const id = crypto.randomUUID();
  return {
    id,
    user_id: userId,
    merchant: ocr.merchant,
    date: ocr.date,
    time: null,
    receipt_number: null,
    currency: 'USD',
    items: JSON.stringify(ocr.items),
    subtotal: ocr.total,
    discounts: 0,
    tax: null,
    total: ocr.total,
    payment_method: null,
    category: null,
    image_url: imageUrl,
    ocr_confidence: ocr.confidence,
    ocr_provider: 'tesseract_wasm',
  };
}

receiptRouter.post('/scan', async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const contentType = c.req.header('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return c.json({ error: 'Expected multipart/form-data' }, 400);
  }

  const formData = await c.req.formData();
  const file = formData.get('receipt') as File | null;
  const consent = formData.get('consent') === 'true';

  if (!file) return c.json({ error: 'No file uploaded' }, 400);

  const arrayBuffer = await file.arrayBuffer();
  if (arrayBuffer.byteLength > 20 * 1024 * 1024) {
    return c.json({ error: 'File too large (max 20MB)' }, 400);
  }

  // Process with Tesseract
  const ocrResult = await processReceipt(arrayBuffer);
  const db = new Database(c.env.DB);
  const receiptData = parseReceiptResult(ocrResult, user.id, null, consent);
  
  await db.createReceipt(receiptData);

  // Build response matching frontend ScanResult type
  const response = {
    status: 'success' as const,
    receipt: {
      merchant: receiptData.merchant,
      date: receiptData.date,
      time: receiptData.time,
      receiptNumber: receiptData.receipt_number,
      currency: receiptData.currency,
      items: ocrResult.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        total: item.price * item.quantity,
        rawText: item.name,
        confidence: ocrResult.confidence,
      })),
      subtotal: receiptData.subtotal,
      discounts: 0,
      tax: receiptData.tax,
      total: receiptData.total,
      paymentMethod: receiptData.payment_method,
      category: receiptData.category,
    },
    confidence: {
      overall: ocrResult.confidence,
      merchant: { value: receiptData.merchant ? 0.7 : 0, source: 'tesseract' },
      date: { value: receiptData.date ? 0.7 : 0, source: 'tesseract' },
      items: { value: ocrResult.items.length > 0 ? ocrResult.confidence : 0, source: 'tesseract' },
      total: { value: receiptData.total !== null ? 0.8 : 0, source: 'tesseract' },
      tax: { value: 0, source: 'none' },
      imageQuality: 1.0,
      ocrConfidence: ocrResult.confidence,
    },
    warnings: [],
    errors: [],
    metadata: {
      processingTimeMs: 0,
      ocrProvider: 'tesseract_wasm',
      ocrConfidence: ocrResult.confidence,
      imageQuality: 1.0,
      variantsUsed: 1,
    },
  };

  return c.json(response);
});

receiptRouter.get('/', async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const db = new Database(c.env.DB);
  const receipts = await db.getReceipts(user.id);
  
  return c.json(receipts.map(r => ({
    id: r.id,
    receipt: {
      merchant: r.merchant,
      date: r.date,
      time: r.time,
      receiptNumber: r.receipt_number,
      currency: r.currency,
      items: JSON.parse(r.items),
      subtotal: r.subtotal,
      discounts: r.discounts,
      tax: r.tax,
      total: r.total,
      paymentMethod: r.payment_method,
      category: r.category,
    },
    confidence: { overall: r.ocr_confidence },
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  })));
});

receiptRouter.get('/:id', async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const db = new Database(c.env.DB);
  const receipt = await db.getReceipt(c.req.param('id'), user.id);
  if (!receipt) return c.json({ error: 'Not found' }, 404);

  return c.json({
    id: receipt.id,
    receipt: {
      merchant: receipt.merchant,
      date: receipt.date,
      time: receipt.time,
      receiptNumber: receipt.receipt_number,
      currency: receipt.currency,
      items: JSON.parse(receipt.items),
      subtotal: receipt.subtotal,
      discounts: receipt.discounts,
      tax: receipt.tax,
      total: receipt.total,
      paymentMethod: receipt.payment_method,
      category: receipt.category,
    },
    confidence: { overall: receipt.ocr_confidence },
    createdAt: receipt.created_at,
    updatedAt: receipt.updated_at,
  });
});

receiptRouter.put('/:id', async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const db = new Database(c.env.DB);
  const existing = await db.getReceipt(c.req.param('id'), user.id);
  if (!existing) return c.json({ error: 'Not found' }, 404);

  const body = await c.req.json();
  const updates: Partial<Receipt> = {};
  
  // Only allow updating specific fields
  const allowedFields = ['merchant', 'date', 'time', 'currency', 'items', 'subtotal', 'discounts', 'tax', 'total', 'payment_method', 'category'];
  for (const field of allowedFields) {
    if (field in body) (updates as any)[field] = body[field];
  }

  if (updates.items) updates.items = JSON.stringify(updates.items);
  
  await db.updateReceipt(c.req.param('id'), user.id, updates);
  return c.json({ success: true });
});

receiptRouter.delete('/:id', async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const db = new Database(c.env.DB);
  const deleted = await db.deleteReceipt(c.req.param('id'), user.id);
  if (!deleted) return c.json({ error: 'Not found' }, 404);

  return c.json({ success: true });
});

export { receiptRouter };