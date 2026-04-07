import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import {
  buildAcceptedCookieConsentState,
  buildRejectedCookieConsentState,
  hasAnalyticsConsent,
  loadCookieConsentState,
  persistCookieConsentState,
  type CookieConsentState,
} from '@/lib/cookieConsent';

interface ConsentContextValue {
  consent: CookieConsentState;
  canTrackAnalytics: boolean;
  preferencesOpen: boolean;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  openPreferences: () => void;
  closePreferences: () => void;
}

const ConsentContext = createContext<ConsentContextValue | undefined>(undefined);

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<CookieConsentState>(() => loadCookieConsentState());
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    persistCookieConsentState(consent);
  }, [consent]);

  const acceptAll = () => {
    setConsent(buildAcceptedCookieConsentState());
    setPreferencesOpen(false);
  };

  const rejectNonEssential = () => {
    setConsent(buildRejectedCookieConsentState());
    setPreferencesOpen(false);
  };

  return (
    <ConsentContext.Provider
      value={{
        consent,
        canTrackAnalytics: hasAnalyticsConsent(consent),
        preferencesOpen,
        acceptAll,
        rejectNonEssential,
        openPreferences: () => setPreferencesOpen(true),
        closePreferences: () => setPreferencesOpen(false),
      }}
    >
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  const context = useContext(ConsentContext);

  if (!context) {
    throw new Error('useConsent must be used within a ConsentProvider.');
  }

  return context;
}
