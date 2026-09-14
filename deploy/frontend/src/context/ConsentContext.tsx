import { useState, useEffect, useCallback, createContext, useContext } from 'react';

interface ConsentState {
  hasConsented: boolean;
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  isLoading: boolean;
}

interface ConsentContextType extends ConsentState {
  setConsent: (consent: Omit<ConsentState, 'isLoading' | 'hasConsented'>) => void;
  acceptAll: () => void;
  rejectAll: () => void;
}

const ConsentContext = createContext<ConsentContextType | null>(null);
const CONSENT_KEY = 'receiptflow_cookie_consent';

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConsentState>({
    hasConsented: false,
    necessary: true,
    analytics: false,
    marketing: false,
    isLoading: true,
  });

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setState({ ...parsed, isLoading: false });
      } catch {
        setState(s => ({ ...s, isLoading: false }));
      }
    } else {
      setState(s => ({ ...s, isLoading: false }));
    }
  }, []);

  const setConsent = useCallback((consent: Omit<ConsentState, 'isLoading' | 'hasConsented'>) => {
    const newState = { ...consent, hasConsented: true, isLoading: false };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(newState));
    setState(newState);
  }, []);

  const acceptAll = useCallback(() => {
    setConsent({ necessary: true, analytics: true, marketing: true });
  }, [setConsent]);

  const rejectAll = useCallback(() => {
    setConsent({ necessary: true, analytics: false, marketing: false });
  }, [setConsent]);

  return (
    <ConsentContext.Provider value={{ ...state, setConsent, acceptAll, rejectAll }}>
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent(): ConsentContextType {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error('useConsent must be used within ConsentProvider');
  return ctx;
}
