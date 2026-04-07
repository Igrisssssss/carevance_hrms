import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useConsent } from '@/contexts/ConsentContext';
import { analytics } from '@/lib/analytics';

export default function AnalyticsRouteTracker() {
  const location = useLocation();
  const { canTrackAnalytics } = useConsent();
  const lastTrackedPathRef = useRef('');

  useEffect(() => {
    if (!canTrackAnalytics) {
      return;
    }

    const path = `${location.pathname}${location.search}`;

    if (lastTrackedPathRef.current === path) {
      return;
    }

    lastTrackedPathRef.current = path;

    analytics.trackPageView({
      path,
      title: document.title,
      url: window.location.href,
    });
  }, [canTrackAnalytics, location.pathname, location.search]);

  return null;
}
