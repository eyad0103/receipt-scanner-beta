import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit3, Save, RotateCcw, Trash2, Plus, X, ImageIcon, AlertTriangle, Clock, CreditCard, Tag, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getReceipt, updateReceipt, deleteReceipt } from '../api/client';
import type { SavedReceipt, ReceiptItem } from '../types';
import { formatCurrency, formatDate, formatTime } from '../utils/helpers';
import { ConfidenceIndicator } from '../components/ConfidenceIndicator';
import { Modal } from '../components/Modal';

const CATEGORIES = [
  'Food & Drink',
  'Groceries',
  'Transport',
  'Shopping',
  'Entertainment',
  'Health & Fitness',
  'Utilities',
  'Travel',
  'Education',
  'Personal Care',
  'Other',
];

export function ReceiptResultPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [category, setCategory] = useState('');
  const [subtotal, setSubtotal] = useState(0);
  const [discounts, setDiscounts] = useState(0);
  const [tax, setTax] = useState(0);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [saved, setSaved] = useState<SavedReceipt | undefined>();

  // Load receipt from localStorage
  useEffect(() => {
    if (id) {
      const receipt = getReceipt(id);
      setSaved(receipt);
    }
  }, [id]);

  // Initialize edit state from saved receipt
  useEffect(() => {
    if (saved) {
      setMerchant(saved.receipt.merchant || '');
      setDate(saved.receipt.date || '');
      setTime(saved.receipt.time || '');
      setPaymentMethod(saved.receipt.paymentMethod || '');
      setCategory(saved.receipt.category || '');
      setSubtotal(saved.receipt.subtotal ?? 0);
      setDiscounts(saved.receipt.discounts ?? 0);
      setTax(saved.receipt.tax ?? 0);
      setItems(saved.receipt.items.map((it) => ({ ...it })));
    }
  }, [saved]);

  if (!saved) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Receipt not found</p>
        <button onClick={() => navigate('/history')} className="mt-3 text-sm font-medium" style={{ color: 'var(--color-brand-500)' }}>
          Back to history
        </button>
      </div>
    );
  }

  const r = saved.receipt;
  const calculatedSubtotal = items.reduce((s, it) => s + it.total, 0);
  const displaySubtotal = editing ? calculatedSubtotal : (r.subtotal ?? calculatedSubtotal);
  const total = displaySubtotal + (editing ? tax : (r.tax ?? 0)) - (editing ? discounts : (r.discounts ?? 0));

  const handleDelete = () => {
    deleteReceipt(saved.id);
    navigate('/history');
  };

  const handleSave = () => {
    setShowSaveConfirm(true);
  };

  const handleSaveConfirmed = async () => {
    setIsSaving(true);
    setShowSaveConfirm(false);
    
    const newSubtotal = items.reduce((s, it) => s + it.total, 0);
    updateReceipt(saved.id, {
      merchant,
      date,
      time,
      paymentMethod,
      category,
      items,
      subtotal: newSubtotal,
      discounts,
      tax,
      total: newSubtotal + tax - discounts,
    });
    
    // Satisfying save animation
    await new Promise(r => setTimeout(r, 600));
    
    setIsSaving(false);
    setEditing(false);
    navigate('/scan');
  };

  const handleCancelEdit = () => {
    // Reset form to saved values
    setMerchant(saved.receipt.merchant || '');
    setDate(saved.receipt.date || '');
    setTime(saved.receipt.time || '');
    setPaymentMethod(saved.receipt.paymentMethod || '');
    setCategory(saved.receipt.category || '');
    setSubtotal(saved.receipt.subtotal ?? 0);
    setDiscounts(saved.receipt.discounts ?? 0);
    setTax(saved.receipt.tax ?? 0);
    setItems(saved.receipt.items.map((it) => ({ ...it })));
    setEditing(false);
  };

  const handleItemChange = (idx: number, field: keyof ReceiptItem, value: string | number) => {
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        updated.total = Math.round(updated.quantity * updated.unitPrice * 100) / 100;
      }
      return updated;
    }));
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { name: 'New item', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const handleRemoveItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const inputStyle = {
    backgroundColor: 'var(--bg-input)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-focus)',
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }} aria-label="Go back">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Receipt</h1>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{formatDate(saved.createdAt.slice(0, 10))}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {saved.imageUrl && (
            <button onClick={() => setShowImage(true)} className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }} aria-label="View original image">
              <ImageIcon size={15} />
            </button>
          )}
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
            >
              <Edit3 size={14} /> Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              >
                <X size={15} /> Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.99]"
                style={{
                  background: 'linear-gradient(135deg, var(--color-emerald-500), var(--color-emerald-700))',
                  boxShadow: '0 4px 16px rgba(34, 197, 94, 0.3)',
                }}
              >
                <Save size={16} /> Save Changes
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Warnings */}
      {saved.confidence && saved.confidence.overall < 0.6 && (
        <div className="rounded-xl p-3 flex items-start gap-2" style={{ backgroundColor: 'var(--color-amber-50)', border: '1px solid var(--color-amber-200)' }}>
          <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--color-amber-600)' }} />
          <p className="text-xs" style={{ color: 'var(--color-amber-800)' }}>
            This receipt was scanned with {Math.round(saved.confidence.overall * 100)}% confidence. Please review the extracted data.
          </p>
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
        {/* Merchant Header */}
        <div className="rounded-2xl p-5 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-md)' }}>
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold" style={{ background: 'linear-gradient(135deg, var(--color-brand-400), var(--color-emerald-400))', color: 'white' }}>
            {(editing ? merchant : r.merchant || '?').charAt(0).toUpperCase()}
          </div>
          {editing ? (
            <input value={merchant} onChange={(e) => setMerchant(e.target.value)} className="w-full text-center text-xl font-bold bg-transparent outline-none rounded-lg px-2 py-1" style={inputStyle} placeholder="Merchant name" />
          ) : (
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{r.merchant || 'Unknown Merchant'}</h2>
          )}
          <div className="mt-2 flex items-center justify-center gap-3 flex-wrap text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {editing ? (
              <>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg px-2 py-1 text-xs outline-none" style={inputStyle} />
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-lg px-2 py-1 text-xs outline-none" style={inputStyle} />
              </>
            ) : (
              <>
                {r.date && <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(r.date)} {r.time && formatTime(r.time)}</span>}
                {r.paymentMethod && <span className="flex items-center gap-1"><CreditCard size={12} /> {r.paymentMethod}</span>}
              </>
            )}
            <div className="flex items-center gap-1.5">
              <Tag size={10} style={{ opacity: 0.6 }} />
              <select
                value={category || r.category || ''}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-lg px-2 py-1 text-xs outline-none"
                style={inputStyle}
              >
                <option value="">Select category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          {saved.confidence && (
            <div className="mt-3 flex justify-center">
              <ConfidenceIndicator confidence={saved.confidence.overall} />
            </div>
          )}
        </div>

        {/* Items */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Items ({items.length})
            </h3>
            {editing && (
              <button onClick={handleAddItem} className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--color-brand-500)' }}>
                <Plus size={14} /> Add
              </button>
            )}
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border-primary)' }}>
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 py-3" style={{ borderBottom: '1px dashed var(--border-primary)' }}>
                <div className="flex-1 min-w-0">
                  {editing ? (
                    <input value={item.name} onChange={(e) => handleItemChange(idx, 'name', e.target.value)} className="w-full text-sm font-medium bg-transparent outline-none rounded px-1 py-0.5" style={{ color: 'var(--text-primary)', border: '1px solid transparent' }} onFocus={(e) => e.currentTarget.style.borderColor = 'var(--border-focus)'} onBlur={(e) => e.currentTarget.style.borderColor = 'transparent'} />
                  ) : (
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    {editing ? (
                      <div className="flex items-center gap-1">
                        <input type="number" value={item.quantity} onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)} className="w-12 text-xs bg-transparent outline-none rounded px-1 text-center" style={inputStyle} min={1} />
                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>×</span>
                        <input type="number" value={item.unitPrice} onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)} className="w-20 text-xs bg-transparent outline-none rounded px-1" style={inputStyle} step="0.01" min={0} />
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{item.quantity} × {formatCurrency(item.unitPrice)}</span>
                    )}
                    {item.confidence !== undefined && item.confidence < 0.8 && !editing && (
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--color-amber-50)', color: 'var(--color-amber-700)' }}>uncertain</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {editing ? (
                    <input type="number" value={item.total} onChange={(e) => handleItemChange(idx, 'total', parseFloat(e.target.value) || 0)} className="w-20 text-sm font-semibold text-right bg-transparent outline-none rounded px-1" style={inputStyle} step="0.01" min={0} />
                  ) : (
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(item.total)}</span>
                  )}
                  {editing && (
                    <button onClick={() => handleRemoveItem(idx)} className="flex h-6 w-6 items-center justify-center rounded transition-colors" style={{ color: 'var(--color-rose-500)' }} aria-label="Remove item">
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {items.length === 0 && (
            <p className="text-xs text-center py-6" style={{ color: 'var(--text-tertiary)' }}>
              {editing ? 'No items yet. Click "Add" to add one.' : 'No items were extracted.'}
            </p>
          )}
        </div>

        {/* Totals */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
          <div className="space-y-3">
            <div className="flex justify-between text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span>Subtotal</span>
              {editing ? <input type="number" value={subtotal} onChange={(e) => setSubtotal(parseFloat(e.target.value) || 0)} className="w-24 text-sm text-right bg-transparent outline-none rounded px-1 font-medium" style={inputStyle} step="0.01" /> : <span>{formatCurrency(displaySubtotal)}</span>}
            </div>
            <div className="flex justify-between text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span>Discount</span>
              {editing ? <input type="number" value={discounts} onChange={(e) => setDiscounts(parseFloat(e.target.value) || 0)} className="w-24 text-sm text-right bg-transparent outline-none rounded px-1 font-medium" style={inputStyle} step="0.01" /> : <span className="text-emerald-600 dark:text-emerald-400">{r.discounts > 0 ? `-${formatCurrency(r.discounts)}` : '$0.00'}</span>}
            </div>
            <div className="flex justify-between text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span>Tax</span>
              {editing ? <input type="number" value={tax} onChange={(e) => setTax(parseFloat(e.target.value) || 0)} className="w-24 text-sm text-right bg-transparent outline-none rounded px-1 font-medium" style={inputStyle} step="0.01" /> : <span>{formatCurrency(r.tax ?? 0)}</span>}
            </div>
            <div className="flex justify-between pt-3 text-lg font-bold" style={{ color: 'var(--text-primary)', borderTop: '2px solid var(--border-primary)' }}>
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
          {!editing && r.paymentMethod && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px dashed var(--border-primary)' }}>
              <div className="flex justify-between text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <span>Payment</span>
                <span>{r.paymentMethod}</span>
              </div>
            </div>
          )}
          {editing && (
            <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '1px dashed var(--border-primary)' }}>
              <div className="flex justify-between text-xs items-center" style={{ color: 'var(--text-tertiary)' }}>
                <span>Payment method</span>
                <input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-36 text-xs text-right bg-transparent outline-none rounded px-1" style={inputStyle} placeholder="e.g. Visa ****4242" />
              </div>
            </div>
          )}
        </div>

        {/* Processing metadata */}
        {saved.confidence && (
          <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <span>OCR Confidence</span>
              <span className="font-medium text-right">{Math.round(saved.confidence.ocrConfidence * 100)}%</span>
              <span>Image Quality</span>
              <span className="font-medium text-right">{Math.round(saved.confidence.imageQuality * 100)}%</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={() => navigate('/scan')} className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-colors" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
            <RotateCcw size={16} /> Rescan
          </button>
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: 'var(--color-emerald-500)' }}
          >
            <Save size={16} /> Save
          </button>
          <button onClick={() => setShowDelete(true)} className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-colors" style={{ backgroundColor: 'var(--color-rose-50)', color: 'var(--color-rose-600)' }}>
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </motion.div>

      {/* Saving Animation Overlay */}
      {isSaving && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15, 17, 23, 0.9)', backdropFilter: 'blur(8px)' }}
        >
          <motion.div
            initial={{ scale: 0.8, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="flex flex-col items-center gap-4"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
              className="flex h-20 w-20 items-center justify-center rounded-2xl"
              style={{ background: 'linear-gradient(135deg, var(--color-emerald-500), var(--color-emerald-700))' }}
            >
              <CheckCircle2 size={40} className="text-white" />
            </motion.div>
            <div className="text-center">
              <p className="text-lg font-semibold text-white">Saving...</p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-emerald-300)' }}>
                Got it! Ready for the next one 🧾
              </p>
            </div>
            <motion.div
              animate={{ scaleX: [0, 1] }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="h-1 w-48 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, var(--color-emerald-500), var(--color-emerald-300))' }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}

      {/* Image Modal */}
      <Modal isOpen={showImage} onClose={() => setShowImage(false)} title="Original Receipt">
        {saved.imageUrl && <img src={saved.imageUrl} alt="Original receipt" className="w-full rounded-xl" />}
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="Delete Receipt?">
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          This will permanently remove this receipt. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setShowDelete(false)} className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
            Cancel
          </button>
          <button onClick={handleDelete} className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white transition-colors" style={{ backgroundColor: 'var(--color-rose-600)' }}>
            Delete
          </button>
        </div>
      </Modal>

      {/* Save Confirmation Modal */}
      <Modal isOpen={showSaveConfirm} onClose={() => setShowSaveConfirm(false)} title="Save Changes?">
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Please review your changes. Is everything correct?
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => { setShowSaveConfirm(false); setEditing(true); }}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
          >
            No, go back
          </button>
          <button
            onClick={handleSaveConfirmed}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: 'var(--color-emerald-500)' }}
          >
            Yes, save
          </button>
        </div>
      </Modal>
    </div>
  );
}
