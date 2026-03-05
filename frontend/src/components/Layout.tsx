import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDesktopTracker } from '@/hooks/useDesktopTracker';
import { chatApi } from '@/services/api';
import { 
  LayoutDashboard, 
  Clock, 
  FolderKanban, 
  CheckSquare, 
  Users, 
  Monitor,
  MessageSquare,
  BarChart3, 
  FileText, 
  Settings, 
  LogOut,
  Play,
  Menu,
  X
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export default function Layout() {
  const { user, logout } = useAuth();
  useDesktopTracker();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadSenders, setUnreadSenders] = useState(0);
  const isAdminView = user?.role === 'admin' || user?.role === 'manager';
  const navigation = useMemo(
    () => [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, adminOnly: false },
      { name: 'Projects', href: '/projects', icon: FolderKanban, adminOnly: false },
      { name: 'Tasks', href: '/tasks', icon: CheckSquare, adminOnly: false },
      { name: 'Chat', href: '/chat', icon: MessageSquare, adminOnly: false },
      { name: 'Attendance', href: '/attendance', icon: Clock, adminOnly: false },
      { name: 'Team', href: '/team', icon: Users, adminOnly: true },
      { name: 'Monitoring', href: '/monitoring', icon: Monitor, adminOnly: true },
      { name: 'Reports', href: '/reports', icon: BarChart3, adminOnly: true },
      { name: 'Invoices', href: '/invoices', icon: FileText, adminOnly: true },
      { name: 'Settings', href: '/settings', icon: Settings, adminOnly: false },
    ].filter((item) => (item.adminOnly ? isAdminView : true)),
    [isAdminView]
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
        <SidebarContent 
          navigation={navigation} 
          location={location} 
          user={user} 
          unreadSenders={unreadSenders}
          onLogout={handleLogout}
          onClose={() => setSidebarOpen(false)}
        />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-64 lg:bg-white lg:border-r lg:border-gray-200">
        <SidebarContent 
          navigation={navigation} 
          location={location} 
          user={user} 
          unreadSenders={unreadSenders}
          onLogout={handleLogout}
        />
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            
            <div className="flex-1" />
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ navigation, location, unreadSenders, onLogout, onClose }: any) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center">
            <Clock className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">TimeTrack</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navigation.map((item: any) => {
            const isActive = location.pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={onClose}
                >
                  <item.icon className={`h-5 w-5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                  <span>{item.name}</span>
                  {item.href === '/chat' && unreadSenders > 0 && (
                    <span className="ml-auto min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center">
                      {unreadSenders > 99 ? '99+' : unreadSenders}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t border-gray-200 p-4">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          <LogOut className="h-5 w-5 text-gray-400" />
          Sign out
        </button>
      </div>
    </div>
  );
}
