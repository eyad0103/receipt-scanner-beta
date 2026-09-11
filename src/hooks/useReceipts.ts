import { useState, useCallback, useEffect } from 'react';
import { getAllReceipts, onReceiptsChange } from '../api/client';
import type { SavedReceipt } from '../types';

export function useReceipts() {
  const [receipts, setReceipts] = useState<SavedReceipt[]>(() => getAllReceipts());

  const refresh = useCallback(() => {
    setReceipts(getAllReceipts());
  }, []);

  useEffect(() => {
    return onReceiptsChange(refresh);
  }, [refresh]);

  return { receipts, refresh };
}
