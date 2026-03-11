import { Link } from 'react-router-dom';
import { Clock, LogOut, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import AdaptiveSurface from '@/components/ui/AdaptiveSurface';
interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  external?: boolean;
  externalPath?: string;
}

interface SidebarNavigationProps {
  navigation: NavigationItem[];
  pathname: string;
  unreadSenders: number;
  onLogout: () => Promise<void> | void;
  onOpenExternal: (path: string) => void;
  onClose?: () => void;
}

export default function SidebarNavigation({
  navigation,
  pathname,
  unreadSenders,
  onLogout,
  onOpenExternal,
  onClose,
}: SidebarNavigationProps) {
  return (
    <AdaptiveSurface
      className="flex h-full flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(241,245,249,0.96))]"
      tone="light"
      backgroundColor="rgba(255,255,255,0.94)"
    >
      <div className="flex h-20 items-center justify-between border-b border-white/70 px-4">
        <Link to="/dashboard" onClick={onClose} className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#020617_0%,#0f172a_30%,#0284c7_75%,#67e8f9_100%)] text-white shadow-[0_18px_35px_-14px_rgba(14,165,233,0.75)]">
            <Clock className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-sky-700">CareVance HRMS</p>
            <p className="text-lg font-semibold tracking-[-0.04em] contrast-text-primary">TimeTrack</p>
          </div>
        </Link>
        {onClose ? (
          <button onClick={onClose} className="rounded-full p-2 contrast-text-muted lg:hidden">
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <ul className="space-y-1.5">
          {navigation.map((item) => {
            const isActive = !item.external && pathname === item.href;
            const content = (
              <>
                <item.icon className={`h-5 w-5 ${isActive ? 'text-sky-700' : 'text-slate-400'}`} />
                <span className="truncate">{item.name}</span>
                {item.href === '/chat' && unreadSenders > 0 ? (
                  <span className="ml-auto min-w-5 rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {unreadSenders > 99 ? '99+' : unreadSenders}
                  </span>
                ) : null}
              </>
            );

            const className = `flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition duration-300 ${
              isActive
                ? 'bg-white text-slate-950 shadow-[0_18px_35px_-26px_rgba(15,23,42,0.45)]'
                : 'text-slate-600 hover:bg-white/75 hover:text-slate-950'
            }`;

            return (
              <li key={item.name}>
                {item.external ? (
              <button type="button" onClick={() => onOpenExternal(item.externalPath || item.href)} className={className}>
                    {content}
                  </button>
                ) : (
                  <Link to={item.href} onClick={onClose} className={className}>
                    {content}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/70 p-4">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium contrast-text-secondary transition hover:bg-white/75 hover:text-slate-950"
        >
          <LogOut className="h-5 w-5 text-slate-400" />
          Sign out
        </button>
      </div>
    </AdaptiveSurface>
  );
}
