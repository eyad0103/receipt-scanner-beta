import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar, BottomNav } from './components/Navigation';
import { Footer } from './components/Footer';
import { CookieConsent } from './components/CookieConsent';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardPage } from './pages/DashboardPage';
import { ScanPage } from './pages/ScanPage';
import { ReceiptResultPage } from './pages/ReceiptResultPage';
import { HistoryPage } from './pages/HistoryPage';
import { StatsPage } from './pages/StatsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuthPage } from './pages/AuthPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { CookiePolicyPage } from './pages/CookiePolicyPage';
import { EmptyState } from './components/EmptyState';
import { ScanLine } from 'lucide-react';

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <BottomNav />
        <main id="main-content" className="lg:ml-64 pb-28 lg:pb-8 min-h-screen">
        <div className="mx-auto max-w-3xl px-5 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <Routes>
          {/* Auth page — no sidebar/footer */}
          <Route path="/auth" element={<AuthPage />} />

          {/* Legal pages — with footer but no sidebar */}
          <Route path="/privacy" element={
            <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
              <main><PrivacyPage /></main>
              <Footer />
            </div>
          } />
          <Route path="/terms" element={
            <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
              <main><TermsPage /></main>
              <Footer />
            </div>
          } />
          <Route path="/cookies" element={
            <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
              <main><CookiePolicyPage /></main>
              <Footer />
            </div>
          } />

          {/* Protected app routes */}
          <Route path="/" element={<PublicLayout><DashboardPage /></PublicLayout>} />
          <Route path="/scan" element={
            <PublicLayout>
              <ProtectedRoute><ScanPage /></ProtectedRoute>
            </PublicLayout>
          } />
          <Route path="/receipt/:id" element={
            <PublicLayout>
              <ProtectedRoute><ReceiptResultPage /></ProtectedRoute>
            </PublicLayout>
          } />
          <Route path="/history" element={
            <PublicLayout>
              <ProtectedRoute><HistoryPage /></ProtectedRoute>
            </PublicLayout>
          } />
          <Route path="/stats" element={
            <PublicLayout>
              <ProtectedRoute><StatsPage /></ProtectedRoute>
            </PublicLayout>
          } />
          <Route path="/settings" element={
            <PublicLayout>
              <ProtectedRoute><SettingsPage /></ProtectedRoute>
            </PublicLayout>
          } />

          {/* 404 */}
          <Route path="*" element={
            <PublicLayout>
              <EmptyState
                icon={<ScanLine size={28} />}
                title="Page not found"
                description="The page you're looking for doesn't exist."
                action={
                  <button onClick={() => window.location.href = '/'} className="rounded-xl px-5 py-2.5 text-sm font-medium text-white" style={{ backgroundColor: 'var(--color-brand-500)' }}>
                    Go Home
                  </button>
                }
              />
            </PublicLayout>
          } />
        </Routes>
        <CookieConsent />
      </div>
    </BrowserRouter>
  );
}
