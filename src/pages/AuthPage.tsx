import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, UserPlus, Eye, EyeOff, ArrowLeft, Mail, Lock, User, ReceiptText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Mode = 'login' | 'signup';

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  if (score <= 1) return { score, label: 'Weak', color: 'var(--color-rose-500)' };
  if (score <= 2) return { score, label: 'Fair', color: 'var(--color-amber-500)' };
  if (score <= 3) return { score, label: 'Good', color: 'var(--color-emerald-500)' };
  if (score <= 4) return { score, label: 'Strong', color: 'var(--color-brand-500)' };
  return { score, label: 'Very Strong', color: 'var(--color-emerald-600)' };
}

export function AuthPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login, signup } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (mode === 'signup') nameRef.current?.focus();
    else emailRef.current?.focus();
  }, [mode]);

  useEffect(() => {
    setError('');
  }, [mode]);

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'signup') {
      if (!name.trim()) { setError('Name is required.'); return; }
      if (!validateEmail(email)) { setError('Please enter a valid email address.'); return; }
      if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
      if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
      if (!acceptTerms) { setError('You must accept the Terms & Conditions and Privacy Policy.'); return; }

      setIsSubmitting(true);
      const result = await signup(name.trim(), email, password, acceptTerms);
      setIsSubmitting(false);
      if (!result.success) setError(result.error || 'Signup failed.');
    } else {
      if (!validateEmail(email)) { setError('Please enter a valid email address.'); return; }
      if (!password) { setError('Password is required.'); return; }

      setIsSubmitting(true);
      const result = await login(email, password);
      setIsSubmitting(false);
      if (!result.success) setError(result.error || 'Login failed.');
    }
  };

  const handleKeyDown = (e: KeyboardEvent, nextRef?: React.RefObject<HTMLInputElement | null>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (nextRef?.current) nextRef.current.focus();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Back to home */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <ArrowLeft size={14} />
          Back to home
        </Link>

        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex h-14 w-14 items-center justify-center rounded-2xl text-3xl text-white mb-4"
            style={{ background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-emerald-500))' }}
          >
            <ReceiptText size={28} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {mode === 'login'
              ? 'Sign in to access your receipts'
              : 'Start scanning receipts in seconds'}
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex rounded-xl p-1 mb-6" style={{ backgroundColor: 'var(--bg-tertiary)' }} role="tablist" aria-label="Authentication mode">
          <button
            role="tab"
            aria-selected={mode === 'login'}
            onClick={() => setMode('login')}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all"
            style={{
              backgroundColor: mode === 'login' ? 'var(--bg-card)' : 'transparent',
              color: mode === 'login' ? 'var(--text-primary)' : 'var(--text-tertiary)',
              boxShadow: mode === 'login' ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <LogIn size={15} />
            Log In
          </button>
          <button
            role="tab"
            aria-selected={mode === 'signup'}
            onClick={() => setMode('signup')}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all"
            style={{
              backgroundColor: mode === 'signup' ? 'var(--bg-card)' : 'transparent',
              color: mode === 'signup' ? 'var(--text-primary)' : 'var(--text-tertiary)',
              boxShadow: mode === 'signup' ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <UserPlus size={15} />
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div
            className="rounded-2xl p-6 space-y-4"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-md)' }}
          >
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl p-3 text-sm"
                  style={{ backgroundColor: 'var(--color-rose-50)', color: 'var(--color-rose-700)', border: '1px solid var(--color-rose-200)' }}
                  role="alert"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {mode === 'signup' && (
              <div>
                <label htmlFor="auth-name" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2" size={18} style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
                  <input
                    ref={nameRef}
                    id="auth-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, emailRef)}
                    className="w-full rounded-xl px-4 py-3 pl-10 text-sm outline-none transition-all"
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-secondary)',
                      color: 'var(--text-primary)',
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = 'var(--border-focus)'}
                    onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-secondary)'}
                    placeholder="John Doe"
                    autoComplete="name"
                    required
                    aria-required="true"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2" size={18} style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
                <input
                ref={emailRef}
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, mode === 'signup' ? passwordRef : undefined)}
                className="w-full rounded-xl px-4 py-3 pl-10 text-sm outline-none transition-all"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-secondary)',
                  color: 'var(--text-primary)',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--border-focus)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-secondary)'}
                placeholder="you@example.com"
                autoComplete="email"
                required
                aria-required="true"
              />
              </div>
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2" size={18} style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
                <input
                  ref={passwordRef}
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, mode === 'signup' ? undefined : undefined)}
                  className="w-full rounded-xl px-4 py-3 pl-10 pr-12 text-sm outline-none transition-all"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-secondary)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = 'var(--border-focus)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-secondary)'}
                  placeholder={mode === 'signup' ? 'At least 8 characters' : 'Enter your password'}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  required
                  aria-required="true"
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {mode === 'signup' && password && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2"
                >
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(getPasswordStrength(password).score / 5) * 100}%` }}
                      className="h-full transition-all duration-300"
                      style={{ backgroundColor: getPasswordStrength(password).color }}
                    />
                  </div>
                  <p className="text-xs mt-1 text-right" style={{ color: getPasswordStrength(password).color }}>
                    Password strength: {getPasswordStrength(password).label}
                  </p>
                </motion.div>
              )}
            </div>

            {mode === 'signup' && (
              <>
                <div>
                  <label htmlFor="auth-confirm" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2" size={18} style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
                    <input
                      id="auth-confirm"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-xl px-4 py-3 pl-10 text-sm outline-none transition-all"
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        border: '1px solid var(--border-secondary)',
                        color: 'var(--text-primary)',
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = 'var(--border-focus)'}
                      onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-secondary)'}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      required
                      aria-required="true"
                      minLength={8}
                    />
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    id="auth-terms"
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-1 rounded"
                    style={{ accentColor: 'var(--color-brand-500)' }}
                    required
                    aria-required="true"
                  />
                  <label htmlFor="auth-terms" className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                    I agree to the{' '}
                    <Link to="/terms" target="_blank" className="underline" style={{ color: 'var(--color-brand-500)' }}>Terms & Conditions</Link>
                    {' '}and{' '}
                    <Link to="/privacy" target="_blank" className="underline" style={{ color: 'var(--color-brand-500)' }}>Privacy Policy</Link>.
                    I understand that my data is stored locally in my browser.
                  </label>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))',
                boxShadow: '0 4px 16px rgba(76, 110, 245, 0.3)',
              }}
            >
              {isSubmitting ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="h-4 w-4 rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  {mode === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />}
                  {mode === 'login' ? 'Log In' : 'Create Account'}
                </>
              )}
            </button>
          </div>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-tertiary)' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="font-medium underline"
            style={{ color: 'var(--color-brand-500)' }}
          >
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}