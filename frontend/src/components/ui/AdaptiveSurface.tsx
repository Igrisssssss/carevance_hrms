import { createElement, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { getContrastTone, type ContrastTone } from '@/utils/getContrastColor';

interface AdaptiveSurfaceProps {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  tone?: ContrastTone | 'auto';
  backgroundColor?: string;
  fallbackTone?: ContrastTone;
  [key: string]: unknown;
}

export default function AdaptiveSurface({
  as = 'div',
  children,
  className,
  style,
  tone = 'auto',
  backgroundColor,
  fallbackTone = 'light',
  ...props
}: AdaptiveSurfaceProps) {
  const resolvedTone = tone === 'auto' ? getContrastTone(backgroundColor, fallbackTone) : tone;

  return createElement(
    as,
    {
      ...props,
      className: cn('contrast-surface', className),
      'data-contrast-tone': resolvedTone,
      style,
    },
    children
  );
}
