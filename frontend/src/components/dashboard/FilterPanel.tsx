import type { ReactNode } from 'react';
import SurfaceCard from './SurfaceCard';

interface FilterPanelProps {
  children: ReactNode;
  className?: string;
}

export default function FilterPanel({ children, className = '' }: FilterPanelProps) {
  return <SurfaceCard className={`relative z-20 overflow-visible p-4 sm:p-5 ${className}`.trim()}>{children}</SurfaceCard>;
}
