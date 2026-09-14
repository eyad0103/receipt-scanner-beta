import { motion } from 'framer-motion';
import { ThemeToggle } from '../components/ThemeToggle';
import { Download, Trash2, Globe, FileText, AlertTriangle, LogOut, User, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../components/Modal';
import { clearAllReceipts, getAllReceipts } from '../api/client';
import { useAuth } from '../context/AuthContext';

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '\u20AC', label: 'Euro' },
  { code: 'GBP', symbol: '\u00A3', label: 'British Pound' },
  { code: 'CHF', symbol: 'CHF', label: 'Swiss Franc' },
  { code: 'SAR', symbol: '\uFDFC', label: 'Saudi Riyal' },
  { code: 'AED', symbol: '\u0639.\u200F', label: 'UAE Dirham' },
  { code: 'EGP', symbol: 'E\u00A3', label: 'Egyptian Pound' },
];

const CURRENCY_KEY = 'receiptflow_currency';

export function SettingsPage() {
  const { user, logout } = useAuth();
  const [showClearModal, setShowClearModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [currency, setCurrency] = useState(() => localStorage.getItem(CURRENCY_KEY) || 'USD');
  const [dataContributionEnabled, setDataContributionEnabled] = useState(() => localStorage.getItem('receiptflow_data_contribution') === 'true');

  useEffect(() => {
    localStorage.setItem(CURRENCY_KEY, currency);
  }, [currency]);

  const handleExport = () => {
    const receipts = getAllReceipts();
    const csv = [
      'Merchant,Date,Time,Total,Items,Tax,Payment',
      ...receipts.map((r) => [
        r.receipt.merchant || '',
        r.receipt.date || '',
        r.receipt.time || '',
        r.receipt.total?.toFixed(2) || '',
        r.receipt.items.length,
        r.receipt.tax?.toFixed(2) || '',
        r.receipt.paymentMethod || '',
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receiptflow-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    clearAllReceipts();
    setShowClearModal(false);
    setCleared(true);
    setTimeout(() => setCleared(false), 3000);
  };

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Customize your experience</p>
      </motion.div>

      <div className="space-y-4">
        {/* Account Section */}
        {user && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--color-brand-50)', color: 'var(--color-brand-500)' }}>
                <User size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{user.name}</h3>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <span>Account created: {new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
            <button
              onClick={() => setShowLogoutModal(true)}
              className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-colors"
              style={{ backgroundColor: 'var(--color-rose-50)', color: 'var(--color-rose-600)' }}
            >
              <LogOut size={15} />
              Log Out
            </button>
          </motion.div>
        )}

        {/* Appearance */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--color-brand-50)', color: 'var(--color-brand-500)' }}>
              <Globe size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Appearance</h3>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Choose your preferred theme</p>
            </div>
          </div>
          <ThemeToggle />
        </motion.div>

        {/* Currency */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--color-emerald-50)', color: 'var(--color-emerald-500)' }}>
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Currency</h3>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Default display currency</p>
            </div>
          </div>
          <label htmlFor="currency-select" className="sr-only">Select currency</label>
          <select
            id="currency-select"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none transition-colors appearance-none cursor-pointer"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.code} ({c.symbol}) — {c.label}</option>
            ))}
          </select>
        </motion.div>

        {/* Export */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--color-amber-50)', color: 'var(--color-amber-500)' }}>
              <Download size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Export Data</h3>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Download your receipt data as CSV</p>
            </div>
          </div>
          <button onClick={handleExport} className="w-full rounded-xl py-2.5 text-sm font-medium transition-colors" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
            Export as CSV
          </button>
        </motion.div>

        {/* Clear */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--color-rose-50)', color: 'var(--color-rose-500)' }}>
              <Trash2 size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Clear History</h3>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Remove all saved receipts</p>
            </div>
          </div>
          <button onClick={() => setShowClearModal(true)} className="w-full rounded-xl py-2.5 text-sm font-medium transition-colors" style={{ backgroundColor: 'var(--color-rose-50)', color: 'var(--color-rose-600)' }}>
            Clear All Receipts
          </button>
        </motion.div>

        {cleared && (
          <div className="rounded-xl p-3 text-center text-sm font-medium" style={{ backgroundColor: 'var(--color-emerald-50)', color: 'var(--color-emerald-700)' }} role="status">
            All receipts cleared.
          </div>
        )}

        {/* Data Contribution */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--color-brand-50)', color: 'var(--color-brand-500)' }}>
              <Shield size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Data Contribution</h3>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Help improve OCR accuracy</p>
            </div>
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-brand-50)', border: '1px solid var(--color-brand-200)' }}>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-brand-700)' }}>
              <strong>Contribute receipt images for OCR improvement</strong>
            </p>
            <p className="text-xs mb-3" style={{ color: 'var(--color-brand-700)' }}>
              When enabled, your scanned receipt images will be securely stored and used exclusively to train and improve our OCR engine. This helps us better recognize receipts from different stores, layouts, languages, and currencies.
            </p>
            <p className="text-xs mb-3" style={{ color: 'var(--color-brand-700)' }}>
              <strong>You control this:</strong> Consent is per-scan (checkbox on Scan page). You can opt out here anytime.
            </p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={dataContributionEnabled}
                onChange={(e) => {
                  setDataContributionEnabled(e.target.checked);
                  localStorage.setItem('receiptflow_data_contribution', String(e.target.checked));
                }}
                className="rounded"
                style={{ accentColor: 'var(--color-brand-500)', width: '18px', height: '18px' }}
              />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Allow my receipt images to be used for OCR improvement
              </span>
            </label>
            <p className="text-xs mt-2" style={{ color: 'var(--color-brand-700)' }}>
              Default: Off. Images are never shared with third parties. <Link to="/privacy" className="underline" style={{ color: 'var(--color-brand-500)' }}>Learn more</Link>
            </p>
          </div>
        </motion.div>

        {/* Legal Links */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--color-brand-50)', color: 'var(--color-brand-500)' }}>
              <Shield size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Legal</h3>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Policies and terms</p>
            </div>
          </div>
          <div className="space-y-2">
            <Link to="/privacy" className="block w-full rounded-xl py-2.5 text-sm font-medium text-center transition-colors" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
              Privacy Policy
            </Link>
            <Link to="/terms" className="block w-full rounded-xl py-2.5 text-sm font-medium text-center transition-colors" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
              Terms &amp; Conditions
            </Link>
            <Link to="/cookies" className="block w-full rounded-xl py-2.5 text-sm font-medium text-center transition-colors" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
              Cookie Policy
            </Link>
          </div>
        </motion.div>

        {/* About */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>About ReceiptFlow</h3>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>Version 1.0.0</p>
          <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            ReceiptFlow helps you digitize and organize your receipts. Scan, track, and analyze your spending effortlessly.
          </p>
          <p className="mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            ReceiptFlow Ltd. &mdash; 123 Innovation Drive, Suite 400, San Francisco, CA 94105
          </p>
        </motion.div>
      </div>

      {/* Clear Modal */}
      <Modal isOpen={showClearModal} onClose={() => setShowClearModal(false)} title="Clear All Receipts?">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--color-rose-100)', color: 'var(--color-rose-600)' }}>
            <AlertTriangle size={24} />
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            This will permanently delete all your scanned receipts. This action cannot be undone.
          </p>
          <div className="flex w-full gap-3">
            <button onClick={() => setShowClearModal(false)} className="flex-1 rounded-xl py-2.5 text-sm font-medium" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>Cancel</button>
            <button onClick={handleClear} className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white" style={{ backgroundColor: 'var(--color-rose-600)' }}>Clear All</button>
          </div>
        </div>
      </Modal>

      {/* Logout Modal */}
      <Modal isOpen={showLogoutModal} onClose={() => setShowLogoutModal(false)} title="Log Out?">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--color-amber-100)', color: 'var(--color-amber-600)' }}>
            <LogOut size={24} />
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            You will need to log in again to access your receipts.
          </p>
          <div className="flex w-full gap-3">
            <button onClick={() => setShowLogoutModal(false)} className="flex-1 rounded-xl py-2.5 text-sm font-medium" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>Cancel</button>
            <button onClick={() => { setShowLogoutModal(false); logout(); }} className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white" style={{ backgroundColor: 'var(--color-brand-500)' }}>Log Out</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
