import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import CookieConsentBanner from '@/components/public/CookieConsentBanner';
import { ConsentProvider } from '@/contexts/ConsentContext';
import { COOKIE_CONSENT_STORAGE_KEY } from '@/lib/cookieConsent';
import { renderWithProviders } from '@/test/renderWithProviders';

describe('CookieConsentBanner', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('persists accepted analytics consent for public routes', async () => {
    const user = userEvent.setup();

    renderWithProviders(<CookieConsentBanner />, {
      route: '/pricing',
      wrapper: ({ children }) => <ConsentProvider>{children}</ConsentProvider>,
    });

    expect(screen.getByRole('dialog', { name: /cookie preferences/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /accept analytics/i }));

    expect(screen.queryByRole('dialog', { name: /cookie preferences/i })).not.toBeInTheDocument();

    expect(JSON.parse(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY) || '{}')).toMatchObject({
      status: 'accepted',
      preferences: {
        analytics: true,
      },
    });
  });

  it('does not render on authenticated app routes', () => {
    renderWithProviders(<CookieConsentBanner />, {
      route: '/dashboard',
      wrapper: ({ children }) => <ConsentProvider>{children}</ConsentProvider>,
    });

    expect(screen.queryByRole('dialog', { name: /cookie preferences/i })).not.toBeInTheDocument();
  });
});
