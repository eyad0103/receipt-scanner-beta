import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanLine, CheckCircle2, ArrowLeft, AlertCircle, Camera, Upload, X, ChevronDown, ChevronUp } from 'lucide-react';
import { scanReceipt, saveReceipt } from '../api/client';
import type { ScanResult } from '../types';

type Stage = 'select' | 'preview' | 'processing' | 'complete' | 'error';

export function ScanPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('select');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [processingTime, setProcessingTime] = useState(0);
  const [scanConsent, setScanConsent] = useState(() => localStorage.getItem('receiptflow_data_contribution') === 'true');

  // Listen for settings changes to update consent default
  useEffect(() => {
    const handleStorageChange = () => {
      setScanConsent(localStorage.getItem('receiptflow_data_contribution') === 'true');
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, etc.)');
      setStage('error');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('Image is too large. Maximum size is 20MB.');
      setStage('error');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setStage('preview');
    setError(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleRemove = useCallback(() => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setStage('select');
    setError(null);
    setScanResult(null);
    setProcessingTime(0);
    setScanConsent(false);
  }, [imagePreview]);

  const handleScan = useCallback(async () => {
    if (!imageFile) return;
    setStage('processing');
    setProcessingTime(0);

    // Start a real timer to show elapsed time
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setProcessingTime(Math.floor((Date.now() - startTime) / 1000));
    }, 100);

    try {
      const result = await scanReceipt(imageFile, scanConsent);

      if (timerRef.current) clearInterval(timerRef.current);
      setProcessingTime(Math.floor((Date.now() - startTime) / 1000));

      if (result.status === 'failed') {
        setStage('error');
        setError(result.errors[0] || 'Could not read this receipt. Try a clearer photo.');
        return;
      }

      setScanResult(result);
      setStage('complete');

      // Save the receipt
      const saved = saveReceipt(result, imagePreview || undefined);

      setTimeout(() => {
        navigate(`/receipt/${saved.id}`);
      }, 1200);
    } catch (err) {
      if (timerRef.current) clearInterval(timerRef.current);
      setStage('error');
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  }, [imageFile, imagePreview, navigate]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <button
          onClick={() => stage === 'select' ? navigate('/') : handleRemove()}
          className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Scan Receipt</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {stage === 'select' && 'Upload or photograph a receipt'}
            {stage === 'preview' && 'Review your image, then scan'}
            {stage === 'processing' && 'AI is reading your receipt...'}
            {stage === 'complete' && 'Scan complete!'}
            {stage === 'error' && 'Something went wrong'}
          </p>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {/* SELECT STAGE */}
        {stage === 'select' && (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
          >
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 cursor-pointer transition-all duration-200 hover:border-[var(--border-focus)]"
              style={{
                borderColor: 'var(--border-secondary)',
                backgroundColor: 'var(--bg-input)',
              }}
              role="button"
              tabIndex={0}
              aria-label="Upload receipt image"
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click(); } }}
            >
              <div
                className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-brand-500) 12%, transparent)', color: 'var(--color-brand-500)' }}
              >
                <Upload size={28} />
              </div>
              <p className="mb-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                Drop your receipt here
              </p>
              <p className="mb-5 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                or click to browse
              </p>
              <div className="flex gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
                  style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)' }}
                >
                  <Upload size={15} />
                  Browse
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); cameraRef.current?.click(); }}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
                  style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)' }}
                >
                  <Camera size={15} />
                  Camera
                </button>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} className="hidden" />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} className="hidden" />
          </motion.div>
        )}

        {/* PREVIEW STAGE */}
        {stage === 'preview' && imagePreview && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="space-y-4"
          >
            <div className="relative rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-primary)' }}>
              <img src={imagePreview} alt="Receipt preview" className="w-full max-h-[420px] object-contain" />
              <button
                onClick={handleRemove}
                className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg backdrop-blur-sm transition-colors"
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
                aria-label="Remove image"
              >
                <X size={14} />
              </button>
            </div>
            <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--color-amber-50)', border: '1px solid var(--color-amber-200)' }}>
              <div className="flex items-start gap-3 mb-2">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--color-amber-500)', color: 'white' }}>
                  <span className="text-[10px] font-bold">!</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold" style={{ color: 'var(--color-amber-800)' }}>
                    <strong>Image Storage for OCR Improvement:</strong> We store your receipt images to train and improve our OCR engine.
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-amber-700)' }}>
                    Your uploaded receipt images <strong>will be saved on our servers</strong> and used exclusively to improve receipt recognition accuracy.
                    This helps us better recognize receipts from different stores, layouts, languages, and currencies.
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-amber-700)' }}>
                    <strong>You control this:</strong> Check the box below to consent. You can opt out anytime in Settings &rarr; Data Contribution.
                    If you don't consent, your image is processed and immediately deleted — no storage.
                  </p>
                </div>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scanConsent}
                  onChange={(e) => setScanConsent(e.target.checked)}
                  className="mt-0.5 rounded"
                  style={{ accentColor: 'var(--color-brand-500)' }}
                  aria-describedby="scan-consent-desc"
                />
                <div>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    I consent to storing my receipt images for OCR improvement.
                  </span>
                  <p id="scan-consent-desc" className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    Images are stored securely, never shared with third parties, and used only to improve receipt scanning accuracy.
                    <a href="/privacy" target="_blank" className="underline" style={{ color: 'var(--color-brand-500)' }}>Learn more</a>
                  </p>
                </div>
              </label>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleRemove}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-colors"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              >
                <X size={16} />
                Cancel
              </button>
              <button
                onClick={handleScan}
                disabled={!scanConsent}
                className="flex-[2] flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  background: scanConsent ? 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))' : 'var(--bg-tertiary)',
                  boxShadow: scanConsent ? '0 4px 16px rgba(76, 110, 245, 0.3)' : 'none',
                  color: scanConsent ? 'white' : 'var(--text-tertiary)',
                }}
                aria-disabled={!scanConsent}
              >
                <ScanLine size={18} />
                Scan Receipt
              </button>
            </div>
          </motion.div>
        )}

        {/* PROCESSING STAGE */}
        {stage === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6 py-12"
          >
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="h-20 w-20 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, var(--color-brand-400), var(--color-emerald-400))',
                }}
              >
                <ScanLine size={32} className="text-white" />
              </motion.div>
            </div>
            <div className="text-center">
              <p className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                Reading your receipt with AI...
              </p>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                AI model analyzing your image, typically 15-30 seconds
              </p>
              {processingTime > 0 && (
                <p className="text-xs mt-2 tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                  {processingTime}s elapsed
                </p>
              )}
            </div>
            <div className="w-full max-w-xs">
              <div className="overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '90%' }}
                  transition={{ duration: 30, ease: 'easeInOut' }}
                  className="h-2 rounded-full"
                  style={{ background: 'linear-gradient(90deg, var(--color-brand-500), var(--color-emerald-500))' }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* COMPLETE STAGE */}
        {stage === 'complete' && scanResult && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 py-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ backgroundColor: 'var(--color-emerald-100)', color: 'var(--color-emerald-600)' }}
              >
                <CheckCircle2 size={32} />
              </div>
            </motion.div>
            <div className="text-center">
              <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Receipt scanned!</p>
              {scanResult.receipt?.merchant && (
                <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  {scanResult.receipt.merchant}
                  {scanResult.receipt.total != null && ` — $${scanResult.receipt.total.toFixed(2)}`}
                </p>
              )}
            </div>

            {/* Debug toggle */}
            {scanResult.debug && (
              <div className="w-full max-w-md mt-4">
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  className="flex items-center gap-2 text-xs w-full justify-center py-2 rounded-lg transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {showDebug ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {showDebug ? 'Hide' : 'Show'} Debug Info
                </button>

                {showDebug && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 rounded-xl p-4 text-left space-y-3"
                    style={{ backgroundColor: 'var(--bg-tertiary)' }}
                  >
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Image:</span>{' '}
                        <span style={{ color: 'var(--text-primary)' }}>{scanResult.debug.imageWidth}×{scanResult.debug.imageHeight}px</span>
                      </div>
                      <div>
                        <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Language:</span>{' '}
                        <span style={{ color: 'var(--text-primary)' }}>{scanResult.debug.language}</span>
                      </div>
                      <div>
                        <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>OCR Confidence:</span>{' '}
                        <span style={{ color: 'var(--text-primary)' }}>{scanResult.metadata.ocrConfidence.toFixed(0)}%</span>
                      </div>
                      <div>
                        <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Overall:</span>{' '}
                        <span style={{ color: 'var(--text-primary)' }}>{((scanResult.confidence?.overall || 0) * 100).toFixed(0)}%</span>
                      </div>
                    </div>

                    {scanResult.debug.variantResults.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Variant Results:</p>
                        <div className="space-y-1">
                          {scanResult.debug.variantResults.map((v, i) => (
                            <div key={i} className="text-xs rounded-lg p-2" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                              <div className="flex justify-between">
                                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{v.variant}</span>
                                <span style={{ color: 'var(--text-tertiary)' }}>Score: {v.receiptScore.toFixed(1)}</span>
                              </div>
                              <div className="flex justify-between mt-0.5">
                                <span style={{ color: 'var(--text-tertiary)' }}>Conf: {v.confidence.toFixed(0)}%</span>
                                <span style={{ color: 'var(--text-tertiary)' }}>{v.textLength} chars</span>
                              </div>
                              <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-tertiary)' }}>{v.textPreview}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {scanResult.debug.ocrText && (
                      <div>
                        <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Raw OCR Text:</p>
                        <pre className="text-xs p-2 rounded-lg overflow-x-auto whitespace-pre-wrap" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                          {scanResult.debug.ocrText}
                        </pre>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ERROR STAGE */}
        {stage === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-5 py-8"
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: 'var(--color-rose-100)', color: 'var(--color-rose-600)' }}
            >
              <AlertCircle size={28} />
            </div>
            <div className="text-center max-w-sm">
              <p className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                Couldn't read this receipt
              </p>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {error || 'Try uploading a clearer photo with the entire receipt visible.'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleRemove}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => { setStage('select'); setError(null); setProcessingTime(0); }}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: 'var(--color-brand-500)' }}
              >
                <ScanLine size={16} />
                Try Again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {stage === 'select' && (
        <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <p className="text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
            For best results: lay the receipt flat, ensure good lighting, and capture the entire receipt.
            Supported: JPG, PNG, HEIC, WebP.
          </p>
        </div>
      )}
    </div>
  );
}
