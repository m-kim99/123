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

interface NavItem {
  path: string;
  icon: typeof Home;
  label: string;
  end?: boolean;
  countKey?: 'pendingReports' | 'openInquiries';
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: 'OVERVIEW',
    items: [
      { path: '/operator', icon: Home, label: '대시보드', end: true },
    ],
  },
  {
    label: 'MANAGE',
    items: [
      { path: '/operator/members', icon: Users, label: '회원 관리' },
      { path: '/operator/companies', icon: Building2, label: '회사 관리' },
    ],
  },
  {
    label: 'QUEUE',
    items: [
      { path: '/operator/reports', icon: Flag, label: '신고 관리', countKey: 'pendingReports' },
      { path: '/operator/inquiries', icon: MessageSquare, label: '문의 관리', countKey: 'openInquiries' },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { path: '/operator/notices', icon: Megaphone, label: '시스템 공지' },
      { path: '/operator/logs', icon: Activity, label: '활동 로그' },
    ],
  },
];

export function OperatorLayout({ children }: OperatorLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const operator = useOperatorStore((s) => s.operator);
  const operatorLogout = useOperatorStore((s) => s.operatorLogout);
  const stats = useOperatorStore((s) => s.stats);
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

  const getCount = (key?: 'pendingReports' | 'openInquiries') => {
    if (!key || !stats) return 0;
    return stats[key] || 0;
  };

  const renderNavItem = (item: typeof navSections[0]['items'][0], mobile?: boolean) => {
    const Icon = item.icon;
    const active = isActive(item.path, item.end);
    const count = getCount(item.countKey);

    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={mobile ? () => setIsMobileMenuOpen(false) : undefined}
        className={cn(
          'flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors',
          active
            ? 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
        )}
      >
        <div className="flex items-center gap-2.5">
          <Icon className="w-[18px] h-[18px]" />
          {item.label}
        </div>
        {count > 0 && (
          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-red-50 text-red-700 dark:bg-red-900/50 dark:text-red-300">
            {count}
          </span>
        )}
      </Link>
    );
  };

  const renderNavSections = (mobile?: boolean) => (
    <div className="space-y-5">
      {navSections.map((section) => (
        <div key={section.label}>
          <div className="px-3 mb-2 text-[9.5px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {section.label}
          </div>
          <div className="space-y-0.5">
            {section.items.map((item) => renderNavItem(item, mobile))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between h-14 px-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link to="/operator" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-white flex items-center justify-center">
                <span className="text-white dark:text-slate-900 font-bold text-sm">T</span>
              </div>
              <span className="font-bold text-base text-slate-900 dark:text-white hidden sm:inline">TrayStorage</span>
            </Link>
          </div>

          {/* Amber Badge + User Menu */}
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300">
              <Shield className="w-3 h-3" />
              <span className="hidden sm:inline">내부 운영자 권한 활성</span>
              <span className="sm:hidden">운영자</span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="hover:bg-slate-100 dark:hover:bg-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold text-white">
                      {operator?.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:inline text-slate-700 dark:text-slate-300">{operator?.name}</span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{operator?.name}</p>
                  <p className="text-xs text-muted-foreground">{operator?.email}</p>
                  {operator?.isSuper && (
                    <span className="inline-flex items-center mt-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded-full dark:bg-amber-900/50 dark:text-amber-300">
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
        </div>
      </header>

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex fixed left-0 top-14 bottom-0 w-[232px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col z-40">
        {/* Operator Console Pin */}
        <div className="px-4 pt-4 pb-3">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-semibold dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            운영자 콘솔
          </div>
        </div>

        <nav className="flex-1 px-3 pb-4 overflow-y-auto">
          {renderNavSections()}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold text-white">
              {operator?.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                  {operator?.name}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-500 truncate">
                {operator?.email}
              </p>
            </div>
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
          'lg:hidden fixed left-0 top-14 bottom-0 w-64 bg-white dark:bg-slate-900 z-50 transform transition-transform duration-200 ease-in-out border-r border-slate-200 dark:border-slate-800',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Operator Console Pin */}
        <div className="px-4 pt-4 pb-3">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-semibold dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            운영자 콘솔
          </div>
        </div>

        <nav className="px-3 pb-4">
          {renderNavSections(true)}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-[232px] pt-14 min-h-screen">
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
