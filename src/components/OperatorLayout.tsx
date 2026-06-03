import { ReactNode, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  Flag,
  Megaphone,
  MessageSquare,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronDown,
  Settings,
  Activity,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useOperatorStore } from '@/store/operatorStore';
import { cn } from '@/lib/utils';

interface OperatorLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/operator', icon: Home, label: '대시보드', end: true },
  { path: '/operator/members', icon: Users, label: '회원 관리' },
  { path: '/operator/reports', icon: Flag, label: '신고 관리' },
  { path: '/operator/notices', icon: Megaphone, label: '시스템 공지' },
  { path: '/operator/inquiries', icon: MessageSquare, label: '문의 관리' },
  { path: '/operator/companies', icon: Building2, label: '회사 관리' },
  { path: '/operator/logs', icon: Activity, label: '활동 로그' },
];

export function OperatorLayout({ children }: OperatorLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const operator = useOperatorStore((s) => s.operator);
  const operatorLogout = useOperatorStore((s) => s.operatorLogout);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await operatorLogout();
    navigate('/operator/login');
  };

  const isActive = (path: string, end?: boolean) => {
    if (end) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900 text-white shadow-lg">
        <div className="flex items-center justify-between h-14 px-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-slate-800 rounded-lg"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link to="/operator" className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-amber-400" />
              <span className="font-bold text-lg">운영자 관리</span>
            </Link>
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="text-white hover:bg-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-sm font-bold">
                    {operator?.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:inline">{operator?.name}</span>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{operator?.name}</p>
                <p className="text-xs text-muted-foreground">{operator?.email}</p>
                {operator?.isSuper && (
                  <span className="inline-flex items-center mt-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                    슈퍼 운영자
                  </span>
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/operator/settings')}>
                <Settings className="w-4 h-4 mr-2" />
                설정
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex fixed left-0 top-14 bottom-0 w-60 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex-col z-40">
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.end);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-slate-900 text-white dark:bg-amber-600'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            <p>TrayStorage 운영자 시스템</p>
            <p className="mt-1">v1.0.0</p>
          </div>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          'lg:hidden fixed left-0 top-14 bottom-0 w-64 bg-white dark:bg-slate-800 z-50 transform transition-transform duration-200 ease-in-out',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.end);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-slate-900 text-white dark:bg-amber-600'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-60 pt-14 min-h-screen">
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
