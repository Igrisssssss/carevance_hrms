import type { ReactNode } from 'react';
import PageHeader from '@/components/dashboard/PageHeader';
import SurfaceCard from '@/components/dashboard/SurfaceCard';

interface DashboardHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export default function DashboardHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
}: DashboardHeaderProps) {
  return (
    <div className="relative z-20 space-y-4">
      <SurfaceCard className="relative z-20 overflow-visible border-white/90 bg-white/96 p-5 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.24)] sm:p-6">
        <PageHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />
        {children ? <div className="mt-5 border-t border-slate-200/80 pt-5">{children}</div> : null}
      </SurfaceCard>
    </div>
  );
}
