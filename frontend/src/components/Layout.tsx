import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDesktopTracker } from '@/hooks/useDesktopTracker';
import { chatApi, notificationApi } from '@/services/api';
import SidebarNavigation from '@/components/dashboard/SidebarNavigation';
import DashboardTopbar from '@/components/dashboard/DashboardTopbar';
import AdaptiveSurface from '@/components/ui/AdaptiveSurface';
import { 
  LayoutDashboard, 
  Clock, 
  FolderKanban, 
  CheckSquare, 
  Users, 
  Monitor,
  MessageSquare,
  FileText, 
  Wallet,
  Settings, 
  Calendar,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  adminOnly: boolean;
  external: boolean;
  externalPath?: string;
}

export default function Layout() {
  const { user, logout, token } = useAuth();
  useDesktopTracker();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadSenders, setUnreadSenders] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const isAdminView = user?.role === 'admin' || user?.role === 'manager';
  const isDesktopShell = Boolean(window.desktopTracker);
  const webAppBaseUrl = (import.meta.env.VITE_WEB_APP_URL || window.location.origin).replace(/\/+$/, '');

  const openWebDashboard = (path: string) => {
    const target = path.startsWith('/') ? path : `/${path}`;
    const nextUrl = new URL(`${webAppBaseUrl}${target}`);
    if (token) {
      nextUrl.searchParams.set('desktop_token', token);
    }
    window.open(nextUrl.toString(), '_blank', 'noopener,noreferrer');
    if (sidebarOpen) setSidebarOpen(false);
  };

  const navigation = useMemo(
    () =>
      (isDesktopShell
        ? [
            { name: 'Timer', href: '/dashboard', icon: Clock, adminOnly: false, external: false },
            { name: 'Dashboard', href: '/desktop-web-dashboard', externalPath: '/dashboard', icon: LayoutDashboard, adminOnly: false, external: true },
            { name: 'Edit Time', href: '/edit-time', icon: Calendar, adminOnly: false, external: false },
            { name: 'Screenshot', href: '/desktop-web-screenshot', externalPath: '/monitoring', icon: Monitor, adminOnly: true, external: true },
            { name: 'Settings', href: '/settings', icon: Settings, adminOnly: false, external: false },
          ]
        : [
            { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, adminOnly: false, external: false },
            { name: 'Projects', href: '/projects', icon: FolderKanban, adminOnly: false, external: false },
            { name: 'Tasks', href: '/tasks', icon: CheckSquare, adminOnly: false, external: false },
            { name: 'Chat', href: '/chat', icon: MessageSquare, adminOnly: false, external: false },
            { name: 'Attendance', href: '/attendance', icon: Clock, adminOnly: false, external: false },
            { name: 'Monitoring', href: '/monitoring', icon: Monitor, adminOnly: true, external: false },
            { name: 'User Management', href: '/user-management', icon: Users, adminOnly: true, external: false },
            { name: 'Invoices', href: '/invoices', icon: FileText, adminOnly: true, external: false },
            { name: 'Payroll', href: '/payroll', icon: Wallet, adminOnly: true, external: false },
            { name: 'Settings', href: '/settings', icon: Settings, adminOnly: false, external: false },
          ] satisfies NavigationItem[]
      ).filter((item) => (item.adminOnly ? isAdminView : true)),
    [isAdminView, isDesktopShell]
  );

  const handleLogout = async () => {
    await logout();
  };

  useEffect(() => {
    let active = true;

    const loadUnread = async () => {
      try {
        const response = await chatApi.getUnreadSummary();
        if (!active) {
          return;
        }
        setUnreadSenders(Number(response.data?.unread_senders || 0));
      } catch {
        if (active) {
          setUnreadSenders(0);
        }
      }
    };

    loadUnread();
    const interval = setInterval(loadUnread, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleOutside = (event: MouseEvent | TouchEvent) => {
      if (!notificationsOpen) return;
      const target = event.target as Node | null;
      if (!target) return;
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);

    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [notificationsOpen]);

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      try {
        const response = await notificationApi.list({ limit: 20 });
        if (!active) return;
        setNotifications(response.data?.data || []);
        setUnreadNotifications(Number(response.data?.unread_count || 0));
      } catch {
        if (active) {
          setNotifications([]);
          setUnreadNotifications(0);
        }
      }
    };

    loadNotifications();
    const interval = setInterval(loadNotifications, 8000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_45%,#f8fafc_100%)]">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[320px] bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.2),transparent_60%)]" />
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-72 border-r border-white/60 bg-white/90 shadow-[0_28px_70px_-40px_rgba(15,23,42,0.7)] backdrop-blur-2xl">
        <SidebarNavigation 
          navigation={navigation} 
          pathname={location.pathname}
          unreadSenders={unreadSenders}
          onLogout={handleLogout}
          onOpenExternal={openWebDashboard}
          onClose={() => setSidebarOpen(false)}
        />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-72 lg:border-r lg:border-white/70 lg:bg-white/75 lg:backdrop-blur-2xl lg:shadow-[0_28px_70px_-40px_rgba(15,23,42,0.42)]">
        <SidebarNavigation 
          navigation={navigation} 
          pathname={location.pathname}
          unreadSenders={unreadSenders}
          onLogout={handleLogout}
          onOpenExternal={openWebDashboard}
        />
      </div>

      {/* Main content */}
      <div className="relative lg:pl-72">
        {/* Top header */}
        <DashboardTopbar
          user={user}
          unreadNotifications={unreadNotifications}
          notificationsOpen={notificationsOpen}
          onOpenSidebar={() => setSidebarOpen(true)}
          onToggleNotifications={() => setNotificationsOpen((prev) => !prev)}
          notificationPanel={
            <div ref={notificationsRef}>
            {notificationsOpen && (
              <AdaptiveSurface
                className="absolute right-0 top-full z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[24px] border border-white/80 bg-white/95 shadow-[0_32px_90px_-48px_rgba(15,23,42,0.55)] backdrop-blur-2xl"
                tone="light"
                backgroundColor="rgba(255,255,255,0.95)"
              >
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-semibold contrast-text-primary">Notifications</p>
                  <button
                    className="text-xs font-semibold text-sky-700 hover:underline"
                    onClick={async () => {
                      await notificationApi.markAllRead();
                      setUnreadNotifications(0);
                      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
                    }}
                  >
                    Mark all read
                  </button>
                </div>
                <div className="max-h-80 overflow-auto">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-sm contrast-text-muted">No notifications</p>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={async () => {
                          if (!n.is_read) {
                            await notificationApi.markRead(n.id);
                            setNotifications((prev) => prev.map((item) => item.id === n.id ? { ...item, is_read: true } : item));
                            setUnreadNotifications((prev) => Math.max(0, prev - 1));
                          }
                        }}
                        className={`w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50/80 ${n.is_read ? '' : 'bg-sky-50/70'}`}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] contrast-text-muted">{n.type?.replace('_', ' ')}</p>
                        <p className="mt-1 text-sm font-semibold contrast-text-primary">{n.title}</p>
                        <p className="mt-1 text-xs leading-6 contrast-text-secondary">{n.message}</p>
                      </button>
                    ))
                  )}
                </div>
              </AdaptiveSurface>
            )}
            </div>
          }
        />

        {/* Page content */}
        <main className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
