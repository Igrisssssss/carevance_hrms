import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  titleClassName?: string;
  description?: string;
  actions?: ReactNode;
}

export default function PageHeader({ eyebrow, title, titleClassName, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-3">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-sky-700">{eyebrow}</p>
        ) : null}
        <div className="space-y-2">
          <h1 className={cn('text-3xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-4xl', titleClassName)}>{title}</h1>
          {description ? <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-col gap-3 sm:flex-row sm:items-center">{actions}</div> : null}
    </div>
  );
}
