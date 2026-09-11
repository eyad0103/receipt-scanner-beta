import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Calendar, ShoppingBag } from 'lucide-react';
import type { SavedReceipt } from '../types';
import { formatCurrency, formatDate } from '../utils/helpers';

interface ReceiptCardProps {
  receipt: SavedReceipt;
  index?: number;
}

export function ReceiptCard({ receipt, index = 0 }: ReceiptCardProps) {
  const navigate = useNavigate();
  const r = receipt.receipt;

  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => navigate(`/receipt/${receipt.id}`)}
      className="w-full rounded-2xl p-5 text-left transition-all duration-200 cursor-pointer"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-primary)',
        boxShadow: 'var(--shadow-sm)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-focus)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-primary)';
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 text-base font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {r.merchant || 'Unknown Merchant'}
          </div>
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {formatDate(r.date || receipt.createdAt.slice(0, 10))}
            </span>
            <span className="flex items-center gap-1">
              <ShoppingBag size={12} />
              {r.items.length} {r.items.length === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {formatCurrency(r.total ?? 0)}
          </div>
          {receipt.confidence && receipt.confidence.overall < 0.8 && (
            <div className="mt-1 text-xs" style={{ color: 'var(--color-amber-600)' }}>
              Review suggested
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
}
