import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ScanLine, TrendingUp, ReceiptText, ShoppingBag, ArrowRight, Plus } from 'lucide-react';
import { useReceipts } from '../hooks/useReceipts';
import { StatCard } from '../components/StatCard';
import { ReceiptCard } from '../components/ReceiptCard';
import { EmptyState } from '../components/EmptyState';
import { formatCurrency, getGreeting, guessCategory, CATEGORY_COLORS } from '../utils/helpers';

export function DashboardPage() {
  const navigate = useNavigate();
  const { receipts } = useReceipts();

  const totalSpent = receipts.reduce((s, r) => s + (r.receipt.total ?? 0), 0);
  const avgPerReceipt = receipts.length > 0 ? totalSpent / receipts.length : 0;

  const topMerchants = (() => {
    const map = new Map<string, number>();
    receipts.forEach((r) => {
      const m = r.receipt.merchant || 'Unknown';
      map.set(m, (map.get(m) || 0) + (r.receipt.total ?? 0));
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  })();

  const categories = (() => {
    const cats = new Map<string, number>();
    receipts.forEach((r) => {
      r.receipt.items.forEach((it) => {
        const cat = guessCategory(it.name);
        cats.set(cat, (cats.get(cat) || 0) + it.total);
      });
    });
    return [...cats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  })();

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {getGreeting()}
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          {receipts.length === 0 ? 'Scan your first receipt to get started' : `You have ${receipts.length} receipt${receipts.length === 1 ? '' : 's'}`}
        </p>
      </motion.div>

      {/* Primary Scan Card */}
      <motion.button
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => navigate('/scan')}
        className="group relative w-full overflow-hidden rounded-2xl p-6 text-left cursor-pointer"
        style={{ background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))', boxShadow: '0 4px 20px rgba(76, 110, 245, 0.3)' }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20" />
          <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/15" />
        </div>
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
            <ScanLine size={28} className="text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">Scan Receipt</h2>
            <p className="text-sm text-white/70">Upload or photograph a receipt</p>
          </div>
          <ArrowRight size={20} className="text-white/70 transition-transform group-hover:translate-x-1" />
        </div>
      </motion.button>

      {receipts.length === 0 ? (
        <EmptyState
          icon={<ReceiptText size={28} />}
          title="No receipts yet"
          description="Scan your first receipt to start tracking your spending and organizing your expenses."
          action={
            <button onClick={() => navigate('/scan')} className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-colors" style={{ backgroundColor: 'var(--color-brand-500)' }}>
              <Plus size={16} /> Scan your first receipt
            </button>
          }
        />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Total Spent" value={formatCurrency(totalSpent)} icon={<TrendingUp size={16} />} color="var(--color-brand-500)" sublabel="All time" />
            <StatCard label="Receipts" value={receipts.length.toString()} icon={<ReceiptText size={16} />} color="var(--color-emerald-500)" sublabel="Scanned" />
            <StatCard label="Avg / Receipt" value={formatCurrency(avgPerReceipt)} icon={<ShoppingBag size={16} />} color="var(--color-amber-500)" />
            <StatCard label="Top Merchant" value={topMerchants[0]?.[0] || '—'} icon={<TrendingUp size={16} />} color="var(--color-rose-500)" sublabel={topMerchants[0] ? formatCurrency(topMerchants[0][1]) : ''} />
          </div>

          {/* Recent Receipts */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Receipts</h2>
              <button onClick={() => navigate('/history')} className="text-xs font-medium" style={{ color: 'var(--color-brand-500)' }}>View all</button>
            </div>
            <div className="space-y-3">
              {receipts.slice(0, 5).map((r, i) => (
                <ReceiptCard key={r.id} receipt={r} index={i} />
              ))}
            </div>
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div>
              <h2 className="mb-4 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Spending Breakdown</h2>
              <div className="space-y-3">
                {categories.map(([cat, amount], i) => {
                  const pct = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
                  return (
                    <div key={cat} className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{cat}</span>
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(amount)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.2 }} className="h-full rounded-full" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top Merchants */}
          {topMerchants.length > 1 && (
            <div>
              <h2 className="mb-4 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Top Merchants</h2>
              <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
                {topMerchants.map(([name, amount], i) => (
                  <div key={name} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: i < topMerchants.length - 1 ? '1px solid var(--border-primary)' : 'none' }}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}>
                        {name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{name}</span>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
