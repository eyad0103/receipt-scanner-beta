import type { ReceiptData, ValidationIssue, ValidationResult } from '../types/index.js';
import { config } from '../config/index.js';

export function validateReceipt(receipt: ReceiptData): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Items validation
  if (receipt.items.length === 0) {
    issues.push({
      field: 'items',
      severity: 'warning',
      message: 'No line items were extracted',
    });
  }

  for (const item of receipt.items) {
    if (item.quantity < 1) {
      issues.push({
        field: `item:${item.name}`,
        severity: 'warning',
        message: `Item "${item.name}" has unusual quantity: ${item.quantity}`,
      });
    }

    if (item.unitPrice < 0) {
      issues.push({
        field: `item:${item.name}`,
        severity: 'error',
        message: `Item "${item.name}" has negative unit price`,
      });
    }

    if (item.total < 0) {
      issues.push({
        field: `item:${item.name}`,
        severity: 'error',
        message: `Item "${item.name}" has negative total`,
      });
    }

    // Check if line total is approximately correct
    const expectedTotal = Math.round(item.quantity * item.unitPrice * 100) / 100;
    if (Math.abs(item.total - expectedTotal) > config.parser.priceTolerance * 10) {
      issues.push({
        field: `item:${item.name}`,
        severity: 'info',
        message: `Item "${item.name}" line total (${item.total}) doesn't match qty×price (${expectedTotal})`,
      });
    }
  }

  // Total validation
  if (receipt.total !== null && receipt.total < 0) {
    issues.push({
      field: 'total',
      severity: 'error',
      message: 'Receipt total is negative',
    });
  }

  // Sanity check: absurdly high total (likely OCR error with lost decimal point)
  if (receipt.total !== null && receipt.total > 5000) {
    issues.push({
      field: 'total',
      severity: 'error',
      message: `Total ($${receipt.total.toFixed(2)}) is unreasonably high — likely an OCR decimal error`,
    });
  }

  // Sanity check: absurdly high individual item price
  for (const item of receipt.items) {
    if (item.unitPrice > 500) {
      issues.push({
        field: `item:${item.name}`,
        severity: 'warning',
        message: `Item "${item.name}" has unusually high price: $${item.unitPrice.toFixed(2)} — may be an OCR error`,
      });
    }
  }

  // Subtotal validation
  if (receipt.subtotal !== null && receipt.items.length > 0) {
    const itemsTotal = receipt.items.reduce((sum, it) => sum + it.total, 0);
    const diff = Math.abs(receipt.subtotal - itemsTotal);
    if (diff > config.parser.subtotalTolerance * Math.max(itemsTotal, 1)) {
      issues.push({
        field: 'subtotal',
        severity: 'warning',
        message: `Subtotal (${receipt.subtotal}) doesn't match sum of items (${itemsTotal.toFixed(2)})`,
      });
    }
  }

  // Tax plausibility
  if (receipt.tax !== null) {
    if (receipt.tax < 0) {
      issues.push({
        field: 'tax',
        severity: 'error',
        message: 'Tax is negative',
      });
    } else if (receipt.subtotal !== null && receipt.subtotal > 0) {
      const taxRate = receipt.tax / receipt.subtotal;
      if (taxRate > 0.3) {
        issues.push({
          field: 'tax',
          severity: 'warning',
          message: `Tax rate appears unusually high: ${(taxRate * 100).toFixed(1)}%`,
        });
      }
    }
  }

  // Arithmetic consistency: subtotal + tax - discounts ≈ total
  if (receipt.total !== null && receipt.subtotal !== null) {
    const calculated = receipt.subtotal + (receipt.tax || 0) - receipt.discounts;
    const diff = Math.abs(receipt.total - calculated);
    if (diff > config.parser.subtotalTolerance * Math.max(receipt.total, 1)) {
      issues.push({
        field: 'total',
        severity: 'warning',
        message: `Total (${receipt.total}) doesn't match subtotal+tax-discounts (${calculated.toFixed(2)})`,
      });
    }
  }

  // Merchant
  if (!receipt.merchant) {
    issues.push({
      field: 'merchant',
      severity: 'info',
      message: 'Merchant could not be identified',
    });
  }

  // Date
  if (!receipt.date) {
    issues.push({
      field: 'date',
      severity: 'info',
      message: 'Date could not be extracted',
    });
  }

  const hasErrors = issues.some((i) => i.severity === 'error');

  return {
    isValid: !hasErrors,
    issues,
  };
}
