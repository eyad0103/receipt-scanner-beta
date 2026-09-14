import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ReceiptText, Plus } from 'lucide-react';
import { SearchBar } from '../components/SearchBar';
import { FilterControls } from '../components/FilterControls';
import { ReceiptCard } from '../components/ReceiptCard';
import { EmptyState } from '../components/EmptyState';
import { useReceipts } from '../hooks/useReceipts';
import type { Filters } from '../types';
import { useNavigate } from 'react-router-dom';

export function HistoryPage() {
  const navigate = useNavigate();
  const { receipts } = useReceipts();
  const [filters, setFilters] = useState<Filters>({ search: '', dateFrom: '', dateTo: '', merchant: '', sort: 'date-desc' });

  const merchants = useMemo(() => [...new Set(receipts.map((r) => r.receipt.merchant).filter(Boolean))].sort() as string[], [receipts]);

  const filtered = useMemo(() => {
    let result = [...receipts];
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((r) => (r.receipt.merchant || '').toLowerCase().includes(q) || r.receipt.items.some((it) => it.name.toLowerCase().includes(q)));
    }
    // receipt.date is now always a valid YYYY-MM-DD (OCR date or scan date fallback)
    if (filters.dateFrom) result = result.filter((r) => (r.receipt.date || r.createdAt.slice(0, 10)) >= filters.dateFrom);
    if (filters.dateTo) result = result.filter((r) => (r.receipt.date || r.createdAt.slice(0, 10)) <= filters.dateTo);
    if (filters.merchant) result = result.filter((r) => r.receipt.merchant === filters.merchant);
    switch (filters.sort) {
      case 'date-desc': result.sort((a, b) => (b.receipt.date || b.createdAt.slice(0, 10)).localeCompare(a.receipt.date || a.createdAt.slice(0, 10))); break;
      case 'date-asc': result.sort((a, b) => (a.receipt.date || a.createdAt.slice(0, 10)).localeCompare(b.receipt.date || b.createdAt.slice(0, 10))); break;
      case 'amount-desc': result.sort((a, b) => (b.receipt.total ?? 0) - (a.receipt.total ?? 0)); break;
      case 'amount-asc': result.sort((a, b) => (a.receipt.total ?? 0) - (b.receipt.total ?? 0)); break;
      case 'merchant': result.sort((a, b) => (a.receipt.merchant || '').localeCompare(b.receipt.merchant || '')); break;
    }
    return result;
  }, [receipts, filters]);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Receipt History</h1>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{filtered.length} receipt{filtered.length === 1 ? '' : 's'}</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <SearchBar value={filters.search} onChange={(search) => setFilters((f) => ({ ...f, search }))} placeholder="Search receipts or items..." />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <FilterControls filters={filters} onChange={(partial) => setFilters((f) => ({ ...f, ...partial }))} merchants={merchants} />
      </motion.div>

      <div className="space-y-3">
        {filtered.map((r, i) => (
          <ReceiptCard key={r.id} receipt={r} index={i} />
        ))}
      </div>

      {filtered.length === 0 && (
        <EmptyState
          icon={<ReceiptText size={28} />}
          title="No receipts found"
          description={filters.search || filters.dateFrom || filters.dateTo || filters.merchant ? 'Try adjusting your filters.' : 'Start scanning receipts to build your history.'}
          action={!filters.search && !filters.dateFrom && !filters.dateTo && !filters.merchant ? (
            <button onClick={() => navigate('/scan')} className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white" style={{ backgroundColor: 'var(--color-brand-500)' }}>
              <Plus size={16} /> Scan a receipt
            </button>
          ) : undefined}
        />
      )}
    </div>
  );
}
