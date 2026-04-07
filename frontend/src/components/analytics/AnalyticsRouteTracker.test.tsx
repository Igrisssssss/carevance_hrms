import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AnalyticsRouteTracker from '@/components/analytics/AnalyticsRouteTracker';
import { ConsentProvider } from '@/contexts/ConsentContext';
import {
  COOKIE_CONSENT_STORAGE_KEY,
  buildAcceptedCookieConsentState,
  buildRejectedCookieConsentState,
} from '@/lib/cookieConsent';
import { analytics } from '@/lib/analytics';
import { renderWithProviders } from '@/test/renderWithProviders';

describe('AnalyticsRouteTracker', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('dispatches one page analytics event when consent is granted', async () => {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(buildAcceptedCookieConsentState()));
    document.title = 'Pricing | CareVance HRMS';

    const events: Array<Record<string, any>> = [];
    const handler = (event: Event) => {
      events.push((event as CustomEvent).detail);
    };

    window.addEventListener('carevance:analytics-dispatch', handler as EventListener);

    const { rerender } = renderWithProviders(<AnalyticsRouteTracker />, {
      route: '/pricing?plan=growth',
      wrapper: ({ children }) => <ConsentProvider>{children}</ConsentProvider>,
    });

    await waitFor(() => expect(events).toHaveLength(1));

    rerender(<AnalyticsRouteTracker />);

    await waitFor(() => expect(events).toHaveLength(1));
    expect(events[0]).toMatchObject({
      type: 'page',
      payload: {
        path: '/pricing?plan=growth',
        title: 'Pricing | CareVance HRMS',
      },
    });

    window.removeEventListener('carevance:analytics-dispatch', handler as EventListener);
  });

  it('does not dispatch page analytics when consent is rejected', async () => {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(buildRejectedCookieConsentState()));

    const handler = vi.fn();
    window.addEventListener('carevance:analytics-dispatch', handler as EventListener);

    renderWithProviders(<AnalyticsRouteTracker />, {
      route: '/pricing',
      wrapper: ({ children }) => <ConsentProvider>{children}</ConsentProvider>,
    });

    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(handler).not.toHaveBeenCalled();

    window.removeEventListener('carevance:analytics-dispatch', handler as EventListener);
  });

  it('dispatches key user events through the analytics abstraction', () => {
    const handler = vi.fn();
    window.addEventListener('carevance:analytics-dispatch', handler as EventListener);

    analytics.trackEvent('landing_cta_clicked', {
      location: 'hero',
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toEqual({
      type: 'event',
      payload: {
        eventName: 'landing_cta_clicked',
        payload: {
          location: 'hero',
        },
      },
    });

    window.removeEventListener('carevance:analytics-dispatch', handler as EventListener);
  });
});
