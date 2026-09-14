import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, ScanLine, ReceiptText, BarChart3, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/scan', icon: ScanLine, label: 'Scan' },
  { to: '/history', icon: ReceiptText, label: 'History' },
  { to: '/stats', icon: BarChart3, label: 'Stats' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <aside
        className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col z-40"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRight: '1px solid var(--border-primary)',
        }}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex items-center gap-3 px-6 py-6">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{
              background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-emerald-500))',
            }}
            aria-hidden="true"
          >
            <ReceiptText size={18} className="text-white" />
          </div>
          <span className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            ReceiptFlow
          </span>
        </div>

        <nav className="flex-1 px-4 py-3" aria-label="Sidebar navigation">
          {navItems.map(({ to, icon: Icon, label }) => {
            const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                className="relative mb-1.5 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-150"
                style={{
                  color: isActive ? 'var(--color-brand-600)' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'var(--color-brand-50)' : 'transparent',
                }}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl"
                    style={{ backgroundColor: 'var(--color-brand-50)' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <Icon size={18} className="relative z-10" aria-hidden="true" />
                <span className="relative z-10">{label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="px-3 pb-4">
          <div
            className="rounded-xl p-3"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
              ReceiptFlow v1.0
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

export function BottomNav() {
  const location = useLocation();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      style={{
        backgroundColor: 'var(--nav-bg)',
        borderTop: '1px solid var(--nav-border)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      role="navigation"
      aria-label="Bottom navigation"
    >
      {navItems.map(({ to, icon: Icon, label }) => {
        const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
        return (
          <NavLink
            key={to}
            to={to}
            className="relative flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[10px] font-medium transition-colors"
            style={{
              color: isActive ? 'var(--color-brand-600)' : 'var(--text-tertiary)',
            }}
            aria-current={isActive ? 'page' : undefined}
          >
            {isActive && (
              <motion.div
                layoutId="bottomnav-active"
                className="absolute -top-1 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full"
                style={{ backgroundColor: 'var(--color-brand-500)' }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <Icon size={20} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
