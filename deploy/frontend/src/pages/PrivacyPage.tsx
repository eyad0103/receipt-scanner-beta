import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { BUSINESS } from '../utils/helpers';

export function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }} aria-label="Go back">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-2">
          <Shield size={20} style={{ color: 'var(--color-brand-500)' }} />
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Privacy Policy</h1>
        </div>
      </motion.div>

      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Last updated: {BUSINESS.lastUpdated}</p>

      <div className="prose-sm space-y-6" style={{ color: 'var(--text-secondary)' }}>
        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>1. Introduction</h2>
          <p className="text-sm leading-relaxed">
            Welcome to ReceiptFlow ("we," "our," or "us"). This Privacy Policy explains how {BUSINESS.name} collects, uses, and protects information when you use our receipt scanning and expense tracking application (the "Service"). We are committed to protecting your privacy and complying with applicable data protection laws, including the California Consumer Privacy Act (CCPA), the General Data Protection Regulation (GDPR), and other relevant regulations.
          </p>
          <p className="text-sm leading-relaxed mt-2">
            By using the Service, you consent to the practices described in this policy. If you do not agree, please discontinue use of the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>2. Data We Collect</h2>
          
          <h3 className="text-base font-medium mt-3 mb-1" style={{ color: 'var(--text-primary)' }}>2.1 Receipt Images (User Uploads)</h3>
          <p className="text-sm leading-relaxed">
            When you scan a receipt, you upload an image file to our server for Optical Character Recognition (OCR) processing.
            <strong>By default, these images are processed in real-time and immediately deleted from our server</strong> after processing completes.
            We do not store, cache, or retain your receipt images on our servers <strong>unless you explicitly consent</strong> (see Section 2.5).
          </p>
          
          <h3 className="text-base font-medium mt-3 mb-1" style={{ color: 'var(--text-primary)' }}>2.2 Extracted Receipt Data</h3>
          <p className="text-sm leading-relaxed">
            After OCR processing, extracted data (merchant name, items, prices, date, total) is sent to your browser and stored <strong>only in your browser&apos;s localStorage</strong>. This data never leaves your device after initial processing. We have no access to your saved receipts.
          </p>
          
          <h3 className="text-base font-medium mt-3 mb-1" style={{ color: 'var(--text-primary)' }}>2.3 Account Information</h3>
          <p className="text-sm leading-relaxed">
            If you create an account, your name, email address, and hashed password are stored in your browser&apos;s localStorage. We do not transmit this data to any server. Your password is hashed using SHA-256 before storage.
          </p>
          
          <h3 className="text-base font-medium mt-3 mb-1" style={{ color: 'var(--text-primary)' }}>2.4 Usage Data</h3>
          <p className="text-sm leading-relaxed">
            We do not collect analytics, telemetry, or usage data. We do not use cookies for tracking. The only external resource loaded is the Inter font from Google Fonts (see Section 6).
          </p>

          <h3 className="text-base font-medium mt-3 mb-1" style={{ color: 'var(--text-primary)' }}>2.5 Receipt Images for OCR Improvement (Opt-In)</h3>
          <div className="mt-2 p-4 rounded-xl" style={{ backgroundColor: 'var(--color-brand-50)', border: '1px solid var(--color-brand-200)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-brand-700)' }}>
              <strong>Optional: Help us improve receipt scanning accuracy.</strong>
            </p>
            <p className="text-sm mt-2">
              If you <strong>explicitly consent</strong>, we will store your uploaded receipt images on our secure servers to train and improve our OCR (Optical Character Recognition) engine.
              This helps the system better recognize receipts from different stores, layouts, languages, currencies, and image qualities.
            </p>
            <ul className="list-disc list-inside text-sm mt-2 space-y-1" style={{ color: 'var(--color-brand-700)' }}>
              <li><strong>Purpose:</strong> Train and improve our OCR models for better accuracy across all receipt types.</li>
              <li><strong>Consent:</strong> Entirely optional. You must check a consent checkbox on the Scan page before each scan.</li>
              <li><strong>Control:</strong> You can opt out anytime in Settings &rarr; Data Contribution. Previously contributed images can be removed upon request.</li>
              <li><strong>Data minimization:</strong> Only the image file and extracted text are stored. No account information is linked.</li>
              <li><strong>Security:</strong> Images are stored encrypted at rest, accessed only by our engineering team for model training.</li>
              <li><strong>No third-party sharing:</strong> Your images are never sold, shared, or licensed to external parties.</li>
              <li><strong>Retention:</strong> Contributed images are retained for up to 24 months or until you request deletion.</li>
            </ul>
            <p className="text-sm mt-2" style={{ color: 'var(--color-brand-700)' }}>
              <strong>If you do not consent</strong> (default): Your image is processed via OCR and immediately deleted — zero storage on our servers.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>3. How We Use Your Data</h2>
          <p className="text-sm leading-relaxed">
            We use the data described above for the following purposes:
          </p>
          <ul className="list-disc list-inside text-sm mt-2 space-y-1">
            <li>Receipt images are processed via OCR to extract text. By default, immediately deleted.</li>
            <li>If you consent, receipt images are stored to train and improve our OCR engine.</li>
            <li>Extracted data is returned to your browser for display and local storage.</li>
            <li>Account data is used for local authentication only.</li>
            <li>We do not use your data for advertising, profiling, or sale to third parties.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>4. Data Storage and Security</h2>
          <p className="text-sm leading-relaxed">
            <strong>Local data (receipts, account, preferences):</strong> Stored exclusively in your browser&apos;s localStorage. This means:
          </p>
          <ul className="list-disc list-inside text-sm mt-2 space-y-1">
            <li>Data never leaves your device after the initial OCR API call.</li>
            <li>We have no server-side access to your saved receipts or account.</li>
            <li>Data persists until you manually clear it or uninstall the app.</li>
            <li>Clearing your browser data will permanently delete all stored receipts.</li>
          </ul>
          <p className="text-sm leading-relaxed mt-2">
            <strong>Receipt images (OCR processing):</strong> Transmitted over HTTPS (TLS 1.3). By default, never logged or stored on our servers.
          </p>
          <p className="text-sm leading-relaxed mt-2">
            <strong>Receipt images (OCR improvement — opt-in only):</strong> Stored on our secure, encrypted servers with restricted access. Used exclusively for model training.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>5. Your Rights</h2>
          <p className="text-sm leading-relaxed">
            Depending on your jurisdiction, you may have the following rights:
          </p>
          <ul className="list-disc list-inside text-sm mt-2 space-y-1">
            <li><strong>Right to Access:</strong> You can view all your local data at any time within the app.</li>
            <li><strong>Right to Deletion:</strong> Use "Clear All Data" in Settings to delete all local receipts and preferences. For contributed images, contact us to request deletion.</li>
            <li><strong>Right to Portability:</strong> Export your receipt data as CSV from the Settings page.</li>
            <li><strong>Right to Withdraw Consent:</strong> Opt out of image contribution anytime in Settings &rarr; Data Contribution.</li>
            <li><strong>Right to Object:</strong> Object to processing of your images for OCR training at any time.</li>
          </ul>
          <p className="text-sm leading-relaxed mt-2">
            Since local data is stored in your browser, you have full control over it within the app. For server-stored contributed images, contact us to exercise your rights.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>6. Third-Party Services</h2>
          <p className="text-sm leading-relaxed">
            The only third-party resource used by ReceiptFlow is <strong>Google Fonts</strong>, which serves the Inter typeface. Google Fonts may collect your IP address and browser information per their privacy policy. No other third-party scripts, analytics, trackers, or embeds are included in the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>7. Children&apos;s Privacy</h2>
          <p className="text-sm leading-relaxed">
            The Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children. If we become aware that a child has provided us with personal information, we will take steps to delete such information promptly.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>8. Changes to This Policy</h2>
          <p className="text-sm leading-relaxed">
            We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated "Last updated" date. Continued use of the Service after changes constitutes acceptance of the revised policy.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>9. Contact Us</h2>
          <p className="text-sm leading-relaxed">
            If you have questions about this Privacy Policy, please contact:
          </p>
          <div className="mt-2 rounded-xl p-4 text-sm" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <p><strong>{BUSINESS.name}</strong></p>
            <p>{BUSINESS.dpo}</p>
            <p>{BUSINESS.address}</p>
            <p>Email: <a href={`mailto:${BUSINESS.email}`} className="underline" style={{ color: 'var(--color-brand-500)' }}>{BUSINESS.email}</a></p>
            <p>Phone: <a href={`tel:${BUSINESS.phone}`} className="underline" style={{ color: 'var(--color-brand-500)' }}>{BUSINESS.phone}</a></p>
          </div>
        </section>
      </div>
    </div>
  );
}