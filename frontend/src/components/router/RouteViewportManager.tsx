import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function RouteViewportManager() {
  const location = useLocation();

  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });
  }, [location.pathname, location.search]);

  return null;
}
