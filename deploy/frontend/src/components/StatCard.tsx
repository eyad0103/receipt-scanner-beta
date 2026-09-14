import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface StatCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  color: string;
  sublabel?: string;
}

export function StatCard({ label, value, icon, color, sublabel }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl p-5 transition-all duration-200 hover:scale-[1.02]"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-primary)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          {label}
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: color + '18', color }}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
        {value}
      </div>
      {sublabel && (
        <div className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {sublabel}
        </div>
      )}
    </motion.div>
  );
}
