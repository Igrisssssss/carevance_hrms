import { createElement, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { getContrastTone, type ContrastTone } from '@/utils/getContrastColor';

type ContrastPriority = 'primary' | 'secondary' | 'muted' | 'accent' | 'inverse';

const priorityClasses: Record<ContrastPriority, string> = {
  primary: 'contrast-text-primary',
  secondary: 'contrast-text-secondary',
  muted: 'contrast-text-muted',
  accent: 'contrast-text-accent',
  inverse: 'contrast-text-inverse',
};

interface AutoContrastTextProps {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  priority?: ContrastPriority;
  tone?: ContrastTone | 'auto';
  backgroundColor?: string;
  fallbackTone?: ContrastTone;
  blend?: boolean;
  [key: string]: unknown;
}

export default function AutoContrastText({
  as = 'span',
  children,
  className,
  style,
  priority = 'primary',
  tone,
  backgroundColor,
  fallbackTone = 'light',
  blend = false,
  ...props
}: AutoContrastTextProps) {
  const resolvedTone = tone === undefined || tone === 'auto' ? getContrastTone(backgroundColor, fallbackTone) : tone;

  return createElement(
    as,
    {
      ...props,
      className: cn(priorityClasses[priority], blend && 'contrast-blend', className),
      style,
      ...(resolvedTone ? { 'data-contrast-tone': resolvedTone } : {}),
    },
    children
  );
}
