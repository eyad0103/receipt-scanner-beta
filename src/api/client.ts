import type { ReceiptData, ConfidenceReport, ScanResult, SavedReceipt } from '../types';

const API_BASE = '/api';
const STORAGE_KEY = 'receiptflow_receipts';
let _listeners: Array<() => void> = [];

function getSavedReceipts(): SavedReceipt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveReceipts(receipts: SavedReceipt[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts));
  _listeners.forEach((l) => l());
}

export function onReceiptsChange(listener: () => void): () => void {
  _listeners.push(listener);
  return () => { _listeners = _listeners.filter((l) => l !== listener); };
}

// Helper: get effective date for a receipt (OCR date if available, else scan time)
function getEffectiveDate(receipt: ReceiptData, fallback: Date): string {
  if (receipt.date && receipt.date.trim()) {
    // Normalize OCR date to YYYY-MM-DD format
    const normalized = receipt.date.trim().replace(/[.\/]/g, '-');
    const parts = normalized.split('-');
    if (parts.length === 3) {
      let year = parts[0];
      let month = parts[1];
      let day = parts[2];
      // Handle DD-MM-YYYY format
      if (year.length === 4) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      // Handle YYYY-DD-MM (rare)
      if (day.length === 4) {
        return `${day}-${month.padStart(2, '0')}-${year.padStart(2, '0')}`;
      }
    }
  }
  // Fallback to scan time (local date)
  return fallback.toISOString().slice(0, 10);
}

// Helper: get effective time for a receipt (OCR time if available, else scan time)
function getEffectiveTime(receipt: ReceiptData, fallback: Date): string {
  if (receipt.time && receipt.time.trim()) {
    const normalized = receipt.time.trim();
    // Ensure HH:MM format
    if (/^\d{1,2}:\d{2}$/.test(normalized)) {
      return normalized.padStart(5, '0');
    }
  }
  // Fallback to scan time (local time)
  return fallback.toTimeString().slice(0, 5);
}

export function saveReceipt(result: ScanResult, imageUrl?: string): SavedReceipt {
  if (!result.receipt) throw new Error('No receipt data to save');

  const now = new Date();
  const effectiveDate = getEffectiveDate(result.receipt, now);
  const effectiveTime = getEffectiveTime(result.receipt, now);

  const receiptWithEffective: ReceiptData = {
    ...result.receipt,
    // Store both original OCR values and effective values
    date: effectiveDate,
    time: effectiveTime,
    // Keep original OCR values for reference (optional: could add separate fields)
    _ocrDate: result.receipt.date || null,
    _ocrTime: result.receipt.time || null,
  };

  const saved: SavedReceipt = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    receipt: receiptWithEffective,
    confidence: result.confidence,
    imageUrl,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  const receipts = getSavedReceipts();
  receipts.unshift(saved);
  saveReceipts(receipts);
  return saved;
}

export function getAllReceipts(): SavedReceipt[] {
  return getSavedReceipts();
}

export function getReceipt(id: string): SavedReceipt | undefined {
  return getSavedReceipts().find((r) => r.id === id);
}

export function updateReceipt(id: string, updates: Partial<ReceiptData>): SavedReceipt | undefined {
  const receipts = getSavedReceipts();
  const idx = receipts.findIndex((r) => r.id === id);
  if (idx === -1) return undefined;
  receipts[idx] = {
    ...receipts[idx],
    receipt: { ...receipts[idx].receipt, ...updates },
    updatedAt: new Date().toISOString(),
  };
  saveReceipts(receipts);
  return receipts[idx];
}

export function deleteReceipt(id: string): boolean {
  const receipts = getSavedReceipts();
  const filtered = receipts.filter((r) => r.id !== id);
  if (filtered.length === receipts.length) return false;
  saveReceipts(filtered);
  return true;
}

export function clearAllReceipts(): void {
  saveReceipts([]);
}

export async function scanReceipt(file: File, consent = false): Promise<ScanResult> {
  const formData = new FormData();
  formData.append('receipt', file);
  formData.append('consent', String(consent));

  const res = await fetch(`${API_BASE}/receipts/scan`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ errors: ['Network error'] }));
    throw new Error(err.errors?.[0] || `Request failed with status ${res.status}`);
  }

  return res.json();
}
