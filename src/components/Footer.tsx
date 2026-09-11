import { Link } from 'react-router-dom';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="mt-16 border-t"
      style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}
      role="contentinfo"
    >
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-emerald-500))' }}
              >
                R
              </div>
              <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>ReceiptFlow</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              Smart receipt scanning and expense tracking. Your data stays in your browser.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>Product</h4>
            <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li><Link to="/scan" className="hover:underline">Scan Receipt</Link></li>
              <li><Link to="/history" className="hover:underline">History</Link></li>
              <li><Link to="/stats" className="hover:underline">Statistics</Link></li>
              <li><Link to="/settings" className="hover:underline">Settings</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>Legal</h4>
            <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li><Link to="/privacy" className="hover:underline">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:underline">Terms &amp; Conditions</Link></li>
              <li><Link to="/cookies" className="hover:underline">Cookie Policy</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>Contact</h4>
            <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li>ReceiptFlow Ltd.</li>
              <li>123 Innovation Drive, Suite 400</li>
              <li>San Francisco, CA 94105</li>
              <li className="pt-1">
                <a href="mailto:support@receiptflow.app" className="hover:underline" style={{ color: 'var(--color-brand-500)' }}>
                  support@receiptflow.app
                </a>
              </li>
              <li>
                <a href="tel:+14155550123" className="hover:underline" style={{ color: 'var(--color-brand-500)' }}>
                  +1 (415) 555-0123
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t text-xs"
          style={{ borderColor: 'var(--border-primary)', color: 'var(--text-tertiary)' }}
        >
          <p>&copy; {year} ReceiptFlow Ltd. All rights reserved.</p>
          <p>Made with care in San Francisco, CA</p>
        </div>
      </div>
    </footer>
  );
}
