import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { applyRouteMetadata } from '@/lib/seo';

export default function AppMetadataManager() {
  const location = useLocation();

  useLayoutEffect(() => {
    applyRouteMetadata(location.pathname);
  }, [location.pathname]);

  return null;
}
