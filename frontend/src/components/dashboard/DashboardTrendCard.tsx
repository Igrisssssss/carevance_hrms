import SurfaceCard from '@/components/dashboard/SurfaceCard';
import { PageEmptyState } from '@/components/ui/PageState';

interface TrendPoint {
  id: string;
  label: string;
  value: number;
  formattedValue: string;
  hint?: string;
}

interface DashboardTrendCardProps {
  title: string;
  description: string;
  points: TrendPoint[];
  colorClassName?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  footer?: string;
}

export default function DashboardTrendCard({
  title,
  description,
  points,
  colorClassName = 'bg-sky-500',
  emptyTitle = 'No trend data',
  emptyDescription = 'No data is available for this selection yet.',
  footer,
}: DashboardTrendCardProps) {
  const maxValue = Math.max(...points.map((point) => point.value), 1);

  return (
    <SurfaceCard className="p-5">
      <h2 className="text-lg font-semibold tracking-[-0.04em] text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>

      {points.length === 0 ? (
        <div className="mt-5">
          <PageEmptyState title={emptyTitle} description={emptyDescription} />
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {points.map((point) => {
            const width = Math.max(10, Math.round((point.value / maxValue) * 100));

            return (
              <div key={point.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{point.label}</p>
                    {point.hint ? <p className="truncate text-xs text-slate-500">{point.hint}</p> : null}
                  </div>
                  <span className="shrink-0 font-medium text-slate-900">{point.formattedValue}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${colorClassName}`} style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {footer ? <p className="mt-4 text-xs leading-5 text-slate-500">{footer}</p> : null}
    </SurfaceCard>
  );
}
