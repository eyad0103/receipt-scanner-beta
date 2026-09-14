import { Link } from 'react-router-dom';
import { ArrowLeft, Cookie } from 'lucide-react';
import { motion } from 'framer-motion';
import { BUSINESS } from '../utils/helpers';

export function CookiePolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }} aria-label="Go back">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-2">
          <Cookie size={20} style={{ color: 'var(--color-amber-500)' }} />
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Cookie Policy</h1>
        </div>
      </motion.div>

      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Last updated: {BUSINESS.lastUpdated}</p>

      <div className="prose-sm space-y-6" style={{ color: 'var(--text-secondary)' }}>
        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>1. Overview</h2>
          <p className="text-sm leading-relaxed">
            This Cookie Policy explains how {BUSINESS.name} (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) uses cookies and similar technologies when you use the ReceiptFlow application (the &quot;Service&quot;). We believe in transparency and want you to understand exactly what technologies we use and why.
          </p>
          <div className="mt-3 rounded-xl p-4" style={{ backgroundColor: 'color-mix(in srgb, var(--color-emerald-500) 10%, transparent)', border: '1px solid var(--color-emerald-200)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-emerald-700)' }}>
              Key Fact: ReceiptFlow does NOT use traditional cookies.
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-emerald-700)' }}>
              We use browser localStorage for data persistence instead of cookies. No tracking cookies, advertising cookies, or analytics cookies are set by our application.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>2. What Are Cookies?</h2>
          <p className="text-sm leading-relaxed">
            Cookies are small text files that websites place on your device to store information. They are widely used to make websites work efficiently and to provide reporting information. While ReceiptFlow does not use cookies, this policy is provided for completeness and to explain our data storage practices.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>3. Technologies We Use Instead of Cookies</h2>

          <h3 className="text-base font-medium mt-4 mb-1" style={{ color: 'var(--text-primary)' }}>3.1 localStorage</h3>
          <p className="text-sm leading-relaxed">
            We use browser localStorage to persist your data locally. This is a built-in browser feature that stores key-value pairs on your device. Unlike cookies, localStorage is:
          </p>
          <ul className="list-disc list-inside text-sm mt-2 space-y-1">
            <li>Not sent to the server with every request.</li>
            <li>Not accessible to third-party scripts (same-origin policy).</li>
            <li>Not used for tracking or analytics.</li>
            <li>Persistent until you manually clear it.</li>
          </ul>
          <p className="text-sm leading-relaxed mt-2">We use localStorage for:</p>
          <ul className="list-disc list-inside text-sm mt-1 space-y-1">
            <li><strong>receiptflow_receipts:</strong> Stores your saved receipt data.</li>
            <li><strong>receiptflow_users:</strong> Stores your account credentials (hashed password).</li>
            <li><strong>receiptflow_session:</strong> Stores your active session.</li>
            <li><strong>receipt-app-theme:</strong> Stores your theme preference (light/dark/system).</li>
            <li><strong>receiptflow_currency:</strong> Stores your preferred display currency.</li>
            <li><strong>receiptflow_cookie_consent:</strong> Stores your cookie consent preferences.</li>
          </ul>

          <h3 className="text-base font-medium mt-4 mb-1" style={{ color: 'var(--text-primary)' }}>3.2 Session Storage</h3>
          <p className="text-sm leading-relaxed">
            We do not use sessionStorage.
          </p>

          <h3 className="text-base font-medium mt-4 mb-1" style={{ color: 'var(--text-primary)' }}>3.3 IndexedDB</h3>
          <p className="text-sm leading-relaxed">
            We do not use IndexedDB.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>4. Third-Party Technologies</h2>

          <h3 className="text-base font-medium mt-4 mb-1" style={{ color: 'var(--text-primary)' }}>4.1 Google Fonts</h3>
          <p className="text-sm leading-relaxed">
            We load the Inter typeface from Google Fonts (fonts.googleapis.com). When your browser requests this font, Google may set cookies on your device to serve the font efficiently and track usage. These cookies are set by Google, not by us. You can review Google&apos;s privacy policy at <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--color-brand-500)' }}>policies.google.com/privacy</a>.
          </p>

          <h3 className="text-base font-medium mt-4 mb-1" style={{ color: 'var(--text-primary)' }}>4.2 No Analytics or Tracking</h3>
          <p className="text-sm leading-relaxed">
            We do not integrate Google Analytics, Facebook Pixel, Hotjar, Mixpanel, or any other analytics or tracking services. We do not use any advertising networks or retargeting pixels.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>5. Managing Your Data</h2>
          <p className="text-sm leading-relaxed">
            Since we use localStorage instead of cookies, you manage your data through your browser and the app:
          </p>
          <ul className="list-disc list-inside text-sm mt-2 space-y-1">
            <li><strong>In-app:</strong> Use Settings &gt; Clear All Data to delete all stored receipts and preferences.</li>
            <li><strong>Browser:</strong> Use your browser&apos;s developer tools (Application &gt; Local Storage) to view or delete data.</li>
            <li><strong>Browser settings:</strong> Most browsers allow you to block or clear localStorage, though this will affect app functionality.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>6. Your Consent</h2>
          <p className="text-sm leading-relaxed">
            When you first visit ReceiptFlow, you will see a consent banner that explains our data practices. You can choose to:
          </p>
          <ul className="list-disc list-inside text-sm mt-2 space-y-1">
            <li><strong>Accept All:</strong> Allow necessary storage plus any future analytics or marketing features.</li>
            <li><strong>Reject Optional:</strong> Allow only necessary storage required for the app to function.</li>
            <li><strong>Manage Preferences:</strong> Customize which categories of storage you allow.</li>
          </ul>
          <p className="text-sm leading-relaxed mt-2">
            Your consent choice is stored in localStorage under the key <code>receiptflow_cookie_consent</code>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>7. Changes to This Policy</h2>
          <p className="text-sm leading-relaxed">
            We may update this Cookie Policy to reflect changes in our practices or applicable laws. Changes will be posted on this page with an updated &quot;Last updated&quot; date.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>8. Contact</h2>
          <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <p><strong>{BUSINESS.name}</strong></p>
            <p>{BUSINESS.address}</p>
            <p>Email: <a href={`mailto:${BUSINESS.email}`} className="underline" style={{ color: 'var(--color-brand-500)' }}>{BUSINESS.email}</a></p>
          </div>
        </section>
      </div>
    </div>
  );
}
