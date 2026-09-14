import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, Settings } from 'lucide-react';
import { useConsent } from '../context/ConsentContext';

export function CookieConsent() {
  const { hasConsented, isLoading, setConsent, acceptAll, rejectAll } = useConsent();
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  if (isLoading || hasConsented) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6"
        role="dialog"
        aria-label="Cookie consent"
        aria-modal="false"
      >
        <div
          className="mx-auto max-w-2xl rounded-2xl p-6 shadow-2xl"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-primary)',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-amber-500) 15%, transparent)', color: 'var(--color-amber-600)' }}
            >
              <Cookie size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                We value your privacy
              </h3>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
                ReceiptFlow uses <strong>localStorage</strong> to save your preferences and receipt data directly in your browser.
                We do <strong>not</strong> use cookies for tracking, and we do <strong>not</strong> sell your data to third parties.
                Your receipt images are processed on our server for OCR only and are <strong>not stored</strong> after processing.
              </p>

              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-4"
                  >
                    <div className="space-y-3 rounded-xl p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Manage Preferences</h4>

                      <label className="flex items-start gap-3 cursor-not-allowed">
                        <input type="checkbox" checked disabled className="mt-0.5 rounded" style={{ accentColor: 'var(--color-brand-500)' }} />
                        <div>
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Necessary</span>
                          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Required for the app to function. Cannot be disabled.</p>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={analytics}
                          onChange={(e) => setAnalytics(e.target.checked)}
                          className="mt-0.5 rounded"
                          style={{ accentColor: 'var(--color-brand-500)' }}
                        />
                        <div>
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Analytics</span>
                          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Help us understand how you use the app. Currently unused — enabled for future feature.</p>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={marketing}
                          onChange={(e) => setMarketing(e.target.checked)}
                          className="mt-0.5 rounded"
                          style={{ accentColor: 'var(--color-brand-500)' }}
                        />
                        <div>
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Marketing</span>
                          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Personalized recommendations. Currently unused — enabled for future feature.</p>
                        </div>
                      </label>

                      <button
                        onClick={() => setConsent({ necessary: true, analytics, marketing })}
                        className="mt-2 w-full rounded-lg py-2 text-sm font-medium text-white transition-colors"
                        style={{ backgroundColor: 'var(--color-brand-500)' }}
                      >
                        Save Preferences
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={acceptAll}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.99]"
                  style={{ backgroundColor: 'var(--color-brand-500)' }}
                >
                  Accept All
                </button>
                <button
                  onClick={rejectAll}
                  className="rounded-xl px-4 py-2 text-sm font-medium transition-colors"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                >
                  Reject Optional
                </button>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                  style={{ color: 'var(--color-brand-500)' }}
                >
                  <Settings size={14} />
                  {showDetails ? 'Hide' : 'Manage'}
                </button>
              </div>

              <p className="mt-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                By using ReceiptFlow you agree to our{' '}
                <a href="/privacy" className="underline hover:opacity-80" style={{ color: 'var(--color-brand-500)' }}>Privacy Policy</a>,{' '}
                <a href="/terms" className="underline hover:opacity-80" style={{ color: 'var(--color-brand-500)' }}>Terms &amp; Conditions</a>, and{' '}
                <a href="/cookies" className="underline hover:opacity-80" style={{ color: 'var(--color-brand-500)' }}>Cookie Policy</a>.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
