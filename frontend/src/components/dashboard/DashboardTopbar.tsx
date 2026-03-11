import type { ReactNode } from 'react';
import { Bell, Menu } from 'lucide-react';
import type { User } from '@/types';
import AdaptiveSurface from '@/components/ui/AdaptiveSurface';

interface DashboardTopbarProps {
  user?: User | null;
  unreadNotifications: number;
  notificationsOpen: boolean;
  onOpenSidebar: () => void;
  onToggleNotifications: () => void;
  notificationPanel?: ReactNode;
}

export default function DashboardTopbar({
  user,
  unreadNotifications,
  notificationsOpen,
  onOpenSidebar,
  onToggleNotifications,
  notificationPanel,
}: DashboardTopbarProps) {
  return (
    <AdaptiveSurface
      className="sticky top-0 z-30 border-b border-white/70 bg-white/88 px-4 py-3 backdrop-blur-2xl sm:px-6 lg:px-8"
      tone="light"
      backgroundColor="rgba(255,255,255,0.88)"
    >
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          className="rounded-full border border-slate-200/90 bg-white/95 p-2 contrast-text-secondary shadow-sm lg:hidden"
          onClick={onOpenSidebar}
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden min-h-[1px] flex-1 lg:block" />

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative">
            <button
              onClick={onToggleNotifications}
              className={`relative rounded-2xl border px-3 py-2 shadow-sm transition ${
                notificationsOpen
                  ? 'border-sky-200 bg-sky-50 text-sky-700'
                  : 'border-slate-200/90 bg-white/95 contrast-text-secondary hover:bg-white'
              }`}
            >
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 ? (
                <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              ) : null}
            </button>
            {notificationPanel}
          </div>

          <div className="flex items-center gap-3 rounded-full border border-white/80 bg-white/85 px-2.5 py-1.5 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f172a,#0284c7)] text-sm font-semibold text-white">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold contrast-text-primary">{user?.name}</p>
              <p className="text-xs capitalize contrast-text-muted">{user?.role}</p>
            </div>
          </div>
        </div>
      </div>
    </AdaptiveSurface>
  );
}
