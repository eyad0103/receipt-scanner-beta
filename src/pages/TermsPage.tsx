import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { BUSINESS } from '../utils/helpers';

export function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }} aria-label="Go back">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-2">
          <FileText size={20} style={{ color: 'var(--color-brand-500)' }} />
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Terms &amp; Conditions</h1>
        </div>
      </motion.div>

      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Last updated: {BUSINESS.lastUpdated}</p>

      <div className="prose-sm space-y-6" style={{ color: 'var(--text-secondary)' }}>
        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>1. Acceptance of Terms</h2>
          <p className="text-sm leading-relaxed">
            By accessing or using ReceiptFlow (the &quot;Service&quot;), you agree to be bound by these Terms &amp; Conditions (&quot;Terms&quot;). If you do not agree to these Terms, do not use the Service. These Terms constitute a legally binding agreement between you and {BUSINESS.name} (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>2. Description of Service</h2>
          <p className="text-sm leading-relaxed">
            ReceiptFlow is a receipt scanning and expense tracking application that uses Optical Character Recognition (OCR) to extract data from receipt images. The Service allows you to:
          </p>
          <ul className="list-disc list-inside text-sm mt-2 space-y-1">
            <li>Upload receipt images for OCR processing.</li>
            <li>View, edit, and correct extracted receipt data.</li>
            <li>Save receipts locally in your browser.</li>
            <li>View spending statistics and export data.</li>
            <li><strong>Optionally contribute receipt images to improve OCR accuracy</strong> (opt-in, see Section 4.5).</li>
          </ul>
          <p className="text-sm leading-relaxed mt-2">
            The Service is provided for personal, non-commercial use unless otherwise agreed in writing.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>3. User Accounts</h2>
          <p className="text-sm leading-relaxed">
            If you create an account, you are responsible for:
          </p>
          <ul className="list-disc list-inside text-sm mt-2 space-y-1">
            <li>Maintaining the confidentiality of your password.</li>
            <li>All activities that occur under your account.</li>
            <li>Notifying us immediately of any unauthorized use.</li>
          </ul>
          <p className="text-sm leading-relaxed mt-2">
            You must be at least 13 years old to create an account. Account data is stored locally in your browser and is not transmitted to our servers.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>4. User Content and Uploads</h2>
          <p className="text-sm leading-relaxed">
            <strong>4.1 Ownership.</strong> You retain all rights to receipt images you upload. We claim no ownership over your content.
          </p>
          <p className="text-sm leading-relaxed mt-2">
            <strong>4.2 Standard Processing (Default).</strong> When you upload a receipt image without consenting to OCR improvement, it is sent to our server solely for OCR processing. The image is immediately deleted after processing. We do not store, retain, or share your uploaded images.
          </p>
          <p className="text-sm leading-relaxed mt-2">
            <strong>4.3 Your Responsibility.</strong> You are solely responsible for the content of images you upload. Do not upload images containing sensitive personal information beyond what is necessary for receipt processing (e.g., full credit card numbers, Social Security numbers).
          </p>
          <p className="text-sm leading-relaxed mt-2">
            <strong>4.4 No Guaranteed Accuracy.</strong> OCR is an imperfect technology. Extracted data may contain errors. You are responsible for reviewing and correcting extracted data before relying on it for any purpose.
          </p>
          <p className="text-sm leading-relaxed mt-2">
            <strong>4.5 Optional: OCR Improvement Contribution.</strong> You may choose to contribute your receipt images to help us train and improve our OCR engine. If you consent:
          </p>
          <ul className="list-disc list-inside text-sm mt-2 space-y-1">
            <li>Your receipt images will be stored on our secure servers for up to 24 months.</li>
            <li>Images are used exclusively to improve receipt recognition accuracy across stores, layouts, languages, and currencies.</li>
            <li>No account information is linked to contributed images.</li>
            <li>Images are never sold, shared, or licensed to third parties.</li>
            <li>You can withdraw consent anytime in Settings &rarr; Data Contribution. We will delete your contributed images upon request.</li>
            <li>Consent is per-scan: you must check the consent box each time you scan.</li>
          </ul>
          <div className="mt-2 p-3 rounded-xl" style={{ backgroundColor: 'var(--color-brand-50)', border: '1px solid var(--color-brand-200)' }}>
            <p className="text-sm" style={{ color: 'var(--color-brand-700)' }}>
              <strong>Default behavior:</strong> If you do not check the consent box, your image is processed and immediately deleted — zero server storage. You are not contributing to OCR improvement.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>5. Acceptable Use</h2>
          <p className="text-sm leading-relaxed">You agree not to:</p>
          <ul className="list-disc list-inside text-sm mt-2 space-y-1">
            <li>Use the Service for any unlawful purpose.</li>
            <li>Attempt to gain unauthorized access to any part of the Service.</li>
            <li>Interfere with or disrupt the Service or its infrastructure.</li>
            <li>Use automated tools (bots, scrapers) to access the Service.</li>
            <li>Upload malware, viruses, or harmful content.</li>
            <li>Reverse engineer, decompile, or disassemble any part of the Service.</li>
            <li>Resell or commercially redistribute the Service without written consent.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>6. Intellectual Property</h2>
          <p className="text-sm leading-relaxed">
            The Service, including its design, code, and branding, is owned by {BUSINESS.name} and protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or reverse-engineer any part of the Service without our prior written consent.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>7. Limitation of Liability</h2>
          <p className="text-sm leading-relaxed">
            To the maximum extent permitted by applicable law:
          </p>
          <ul className="list-disc list-inside text-sm mt-2 space-y-1">
            <li>The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind.</li>
            <li>We do not warrant that the Service will be uninterrupted, error-free, or secure.</li>
            <li>We are not liable for any indirect, incidental, special, consequential, or punitive damages.</li>
            <li>Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim (which is $0 for free users).</li>
            <li>We are not responsible for data loss due to browser storage limitations or user actions.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>8. Disclaimer of Warranties</h2>
          <p className="text-sm leading-relaxed">
            We expressly disclaim all warranties, whether express or implied, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not guarantee the accuracy of OCR extraction and recommend verifying all extracted data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>9. Indemnification</h2>
          <p className="text-sm leading-relaxed">
            You agree to indemnify and hold harmless {BUSINESS.name}, its officers, directors, employees, and agents from any claims, damages, losses, or expenses (including reasonable attorney&apos;s fees) arising from your use of the Service or violation of these Terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>10. Modifications</h2>
          <p className="text-sm leading-relaxed">
            We reserve the right to modify these Terms at any time. Changes will be effective upon posting. Continued use of the Service after changes constitutes acceptance. We will notify users of material changes via the Service or email.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>11. Termination</h2>
          <p className="text-sm leading-relaxed">
            We may suspend or terminate your access to the Service at any time, with or without cause, with or without notice. Upon termination, your right to use the Service ceases. You may delete your account and data at any time via the Settings page.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>12. Governing Law</h2>
          <p className="text-sm leading-relaxed">
            These Terms are governed by the laws of the {BUSINESS.jurisdiction}, without regard to conflict of law principles. Any disputes shall be resolved in the state or federal courts located in San Francisco County, California.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>13. Severability</h2>
          <p className="text-sm leading-relaxed">
            If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full force and effect.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>14. Entire Agreement</h2>
          <p className="text-sm leading-relaxed">
            These Terms, together with our Privacy Policy and Cookie Policy, constitute the entire agreement between you and {BUSINESS.name} regarding the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>15. Contact</h2>
          <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <p><strong>{BUSINESS.name}</strong></p>
            <p>{BUSINESS.address}</p>
            <p>Email: <a href={`mailto:${BUSINESS.legalEmail}`} className="underline" style={{ color: 'var(--color-brand-500)' }}>{BUSINESS.legalEmail}</a></p>
            <p>Phone: <a href={`tel:${BUSINESS.phone}`} className="underline" style={{ color: 'var(--color-brand-500)' }}>{BUSINESS.phone}</a></p>
          </div>
        </section>
      </div>
    </div>
  );
}
