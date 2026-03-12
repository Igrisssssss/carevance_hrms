import type { LucideIcon } from 'lucide-react';
import SurfaceCard from '@/components/dashboard/SurfaceCard';

interface KPIItem {
  id: string;
  label: string;
  value: string | number;
  caption?: string;
  meta?: string;
  icon: LucideIcon;
  accent?: 'sky' | 'emerald' | 'violet' | 'amber' | 'rose' | 'slate';
}

interface DashboardKPIGridProps {
  items: KPIItem[];
  secondaryItems?: Array<{
    id: string;
    label: string;
    value: string | number;
  }>;
}

const accentClasses: Record<NonNullable<KPIItem['accent']>, string> = {
  sky: 'bg-sky-100 text-sky-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  violet: 'bg-violet-100 text-violet-700',
  amber: 'bg-amber-100 text-amber-700',
  rose: 'bg-rose-100 text-rose-700',
  slate: 'bg-slate-200 text-slate-700',
};

export default function DashboardKPIGrid({ items, secondaryItems = [] }: DashboardKPIGridProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <SurfaceCard key={item.id} className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">{item.value}</p>
                  {item.caption ? <p className="mt-2 text-sm text-slate-600">{item.caption}</p> : null}
                  {item.meta ? <p className="mt-1 text-xs text-slate-400">{item.meta}</p> : null}
                </div>
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${accentClasses[item.accent || 'sky']}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </SurfaceCard>
          );
        })}
      </div>

      {secondaryItems.length > 0 ? (
        <SurfaceCard className="p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {secondaryItems.map((item) => (
              <div key={item.id} className="rounded-[22px] border border-slate-200/80 bg-slate-50/75 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">{item.value}</p>
              </div>
            ))}
          </div>
        </SurfaceCard>
      ) : null}
    </div>
  );
}
