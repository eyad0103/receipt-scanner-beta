import { ChevronDown, Calendar, X } from 'lucide-react';
import type { Filters, SortOption } from '../types';

interface FilterControlsProps {
  filters: Filters;
  onChange: (filters: Partial<Filters>) => void;
  merchants: string[];
}

const DATE_PRESETS = [
  { label: 'All time', value: 'all', from: '', to: '' },
  { label: 'Today', value: 'today', from: () => today(), to: () => today() },
  { label: 'Last 7 days', value: 'last7', from: () => daysAgo(7), to: () => today() },
  { label: 'Last 30 days', value: 'last30', from: () => daysAgo(30), to: () => today() },
  { label: 'This month', value: 'thisMonth', from: () => monthStart(), to: () => today() },
  { label: 'Last 3 months', value: 'last3m', from: () => daysAgo(90), to: () => today() },
  { label: 'This year', value: 'thisYear', from: () => yearStart(), to: () => today() },
  { label: 'Custom', value: 'custom', from: '', to: '' },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function monthStart() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function yearStart() {
  return `${new Date().getFullYear()}-01-01`;
}

function getPreset(filters: Filters): string {
  if (!filters.dateFrom && !filters.dateTo) return 'all';
  if (filters.dateFrom === today() && filters.dateTo === today()) return 'today';
  if (filters.dateFrom === daysAgo(7) && filters.dateTo === today()) return 'last7';
  if (filters.dateFrom === daysAgo(30) && filters.dateTo === today()) return 'last30';
  if (filters.dateFrom === monthStart() && filters.dateTo === today()) return 'thisMonth';
  if (filters.dateFrom === daysAgo(90) && filters.dateTo === today()) return 'last3m';
  if (filters.dateFrom === yearStart() && filters.dateTo === today()) return 'thisYear';
  return 'custom';
}

function DateInput({ label, value, onChange, id, ariaLabel }: { 
  label: string; 
  value: string; 
  onChange: (val: string) => void; 
  id: string; 
  ariaLabel: string;
}) {
  const inputStyle = {
    backgroundColor: 'var(--bg-input)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-primary)',
  };

  return (
    <div className="flex-1 min-w-[140px]">
      <label htmlFor={id} className="mb-1 flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
        <Calendar size={11} />
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors appearance-none"
          style={inputStyle}
          aria-label={ariaLabel}
        />
        <Calendar
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--text-tertiary)' }}
          aria-hidden="true"
        />
        {value && (
          <button
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            className="absolute right-24 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            style={{ color: 'var(--text-tertiary)' }}
            aria-label="Clear date"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

export function FilterControls({ filters, onChange, merchants }: FilterControlsProps) {
  const inputStyle = {
    backgroundColor: 'var(--bg-input)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-primary)',
  };

  const activePreset = getPreset(filters);

  const handlePreset = (preset: typeof DATE_PRESETS[number]) => {
    if (preset.value === 'custom') return;
    const from = typeof preset.from === 'function' ? preset.from() : preset.from;
    const to = typeof preset.to === 'function' ? preset.to() : preset.to;
    onChange({ dateFrom: from, dateTo: to });
  };

  return (
    <div className="space-y-3">
      {/* Quick date presets */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick date filters">
        {DATE_PRESETS.map((preset) => (
          <button
            key={preset.value}
            onClick={() => handlePreset(preset)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
            style={{
              backgroundColor: activePreset === preset.value ? 'var(--color-brand-500)' : 'var(--bg-tertiary)',
              color: activePreset === preset.value ? 'white' : 'var(--text-secondary)',
            }}
            aria-pressed={activePreset === preset.value}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom date inputs + merchant + sort */}
      <div className="flex flex-wrap gap-3">
        <DateInput
          label="From"
          value={filters.dateFrom}
          onChange={(val) => onChange({ dateFrom: val })}
          id="filter-from"
          ariaLabel="Filter from date"
        />
        <DateInput
          label="To"
          value={filters.dateTo}
          onChange={(val) => onChange({ dateTo: val })}
          id="filter-to"
          ariaLabel="Filter to date"
        />
        <div className="flex-1 min-w-[140px]">
          <label htmlFor="filter-merchant" className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
            Merchant
          </label>
          <div className="relative">
            <select
              id="filter-merchant"
              value={filters.merchant}
              onChange={(e) => onChange({ merchant: e.target.value })}
              className="w-full appearance-none rounded-lg px-3 py-2 pr-8 text-sm outline-none transition-colors"
              style={inputStyle}
            >
              <option value="">All merchants</option>
              {merchants.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-tertiary)' }}
              aria-hidden="true"
            />
          </div>
        </div>
        <div className="flex-1 min-w-[140px]">
          <label htmlFor="filter-sort" className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
            Sort by
          </label>
          <div className="relative">
            <select
              id="filter-sort"
              value={filters.sort}
              onChange={(e) => onChange({ sort: e.target.value as SortOption })}
              className="w-full appearance-none rounded-lg px-3 py-2 pr-8 text-sm outline-none transition-colors"
              style={inputStyle}
            >
              <option value="date-desc">Newest first</option>
              <option value="date-asc">Oldest first</option>
              <option value="amount-desc">Highest amount</option>
              <option value="amount-asc">Lowest amount</option>
              <option value="merchant">Merchant A-Z</option>
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-tertiary)' }}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      {/* Clear filters */}
      {(filters.dateFrom || filters.dateTo || filters.merchant || filters.search) && (
        <button
          onClick={() => onChange({ dateFrom: '', dateTo: '', merchant: '', search: '' })}
          className="text-xs font-medium underline"
          style={{ color: 'var(--color-brand-500)' }}
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}