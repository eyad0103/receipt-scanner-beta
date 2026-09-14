import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { TrendingUp, ReceiptText, ShoppingBag, Sparkles } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { EmptyState } from '../components/EmptyState';
import { useReceipts } from '../hooks/useReceipts';
import { formatCurrency, guessCategory, CATEGORY_COLORS } from '../utils/helpers';
import { useNavigate } from 'react-router-dom';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-md)', color: 'var(--text-primary)' }}>
      <p className="font-medium">{label}</p>
      <p className="font-semibold">{formatCurrency(payload[0].value)}</p>
    </div>
  );
};

export function StatsPage() {
  const navigate = useNavigate();
  const { receipts } = useReceipts();

  const totalSpent = useMemo(() => receipts.reduce((s, r) => s + (r.receipt.total ?? 0), 0), [receipts]);
  const avgPerReceipt = receipts.length > 0 ? totalSpent / receipts.length : 0;

  const topMerchants = useMemo(() => {
    const map = new Map<string, number>();
    receipts.forEach((r) => {
      const m = r.receipt.merchant || 'Unknown';
      map.set(m, (map.get(m) || 0) + (r.receipt.total ?? 0));
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, total]) => ({ name, total }));
  }, [receipts]);

  const spendingByCategory = useMemo(() => {
    const cats = new Map<string, number>();
    receipts.forEach((r) => {
      r.receipt.items.forEach((it) => {
        const cat = guessCategory(it.name);
        cats.set(cat, (cats.get(cat) || 0) + it.total);
      });
    });
    return [...cats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));
  }, [receipts]);

  const spendingByMonth = useMemo(() => {
    const months = new Map<string, number>();
    receipts.forEach((r) => {
      const d = r.receipt.date || r.createdAt.slice(0, 10);
      const month = d.slice(0, 7);
      months.set(month, (months.get(month) || 0) + (r.receipt.total ?? 0));
    });
    return [...months.entries()].sort().map(([month, amount]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
      amount,
    }));
  }, [receipts]);

  const frequentItems = useMemo(() => {
    const map = new Map<string, number>();
    receipts.forEach((r) => {
      r.receipt.items.forEach((it) => {
        map.set(it.name, (map.get(it.name) || 0) + it.quantity);
      });
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));
  }, [receipts]);

  if (receipts.length === 0) {
    return (
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Statistics</h1>
        </motion.div>
        <EmptyState
          icon={<TrendingUp size={28} />}
          title="No data yet"
          description="Scan some receipts to see your spending statistics."
          action={<button onClick={() => navigate('/scan')} className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white" style={{ backgroundColor: 'var(--color-brand-500)' }}>Scan a receipt</button>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Statistics</h1>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{receipts.length} receipts analyzed</p>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Spent" value={formatCurrency(totalSpent)} icon={<TrendingUp size={16} />} color="var(--color-brand-500)" />
        <StatCard label="Receipts" value={receipts.length.toString()} icon={<ReceiptText size={16} />} color="var(--color-emerald-500)" />
        <StatCard label="Avg / Receipt" value={formatCurrency(avgPerReceipt)} icon={<ShoppingBag size={16} />} color="var(--color-amber-500)" />
        <StatCard label="Top Merchant" value={topMerchants[0]?.name || '—'} icon={<Sparkles size={16} />} color="var(--color-rose-500)" sublabel={topMerchants[0] ? formatCurrency(topMerchants[0].total) : ''} />
      </div>

      {/* Spending Over Time */}
      {spendingByMonth.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
          <h3 className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Spending Over Time</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendingByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} axisLine={{ stroke: 'var(--border-primary)' }} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" fill="var(--color-brand-500)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {/* Categories */}
        {spendingByCategory.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
            <h3 className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>By Category</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={spendingByCategory} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                    {spendingByCategory.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              {spendingByCategory.map((cat, i) => (
                <div key={cat.name} className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{cat.name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Top Merchants */}
        {topMerchants.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
            <h3 className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Top Merchants</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topMerchants} layout="vertical">
                  <XAxis type="number" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" fill="var(--color-brand-500)" radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </div>

      {/* Frequent Items */}
      {frequentItems.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
          <h3 className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Most Purchased</h3>
          <div className="space-y-3">
            {frequentItems.map((item, i) => (
              <div key={item.name} className="flex items-center gap-3">
                <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)', width: 20 }}>#{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>{item.count}×</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(item.count / (frequentItems[0]?.count || 1)) * 100}%` }} transition={{ duration: 0.6, delay: 0.3 + i * 0.05 }} className="h-full rounded-full" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
