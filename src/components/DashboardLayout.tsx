import { ReactNode, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  FileText,
  Home,
  Building2,
  BarChart3,
  Search,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/authStore';
import { AIChatbot } from '@/components/AIChatbot';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isAdmin = user?.role === 'admin';
  const basePath = isAdmin ? '/admin' : '/team';
  const primaryColor = '#2563eb';

  const handleLogoClick = () => {
    const targetPath = user?.role === 'admin' ? '/admin' : '/team';
    navigate(targetPath);
  };

  const handleSearch = () => {
    const query = searchQuery.trim();
    const targetPath = isAdmin ? '/admin/documents' : '/team/documents';

    if (query) {
      navigate(`${targetPath}?q=${encodeURIComponent(query)}`);
    } else {
      navigate(targetPath);
    }
  };

  const navigation = [
    { name: '홈', href: basePath, icon: Home },
    ...(isAdmin
      ? [{ name: '부서 관리', href: `${basePath}/departments`, icon: Building2 }]
      : []),
    { name: '문서 관리', href: `${basePath}/documents`, icon: FileText },
    { name: '통계', href: `${basePath}/statistics`, icon: BarChart3 },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <div className="flex items-center gap-2">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: primaryColor }}
            >
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg">문서관리</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
                style={
                  isActive
                    ? { backgroundColor: primaryColor }
                    : undefined
                }
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback>{user?.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-slate-500">
                {isAdmin ? '관리자' : '팀원'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 border-b bg-[#1e40af]">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            <div className="flex items-center gap-4 flex-1">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>

              <span
                onClick={handleLogoClick}
                className="font-bold text-xl text-white hover:opacity-80 cursor-pointer"
              >
                TrayStorage CONNECT
              </span>

              <div className="relative flex-1 max-w-md">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 cursor-pointer"
                  onClick={handleSearch}
                />
                <Input
                  type="search"
                  placeholder="문서 검색..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <Badge
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  style={{ backgroundColor: primaryColor }}
                >
                  3
                </Badge>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.avatar} />
                      <AvatarFallback>{user?.name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline">{user?.name}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>내 계정</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>프로필 설정</DropdownMenuItem>
                  <DropdownMenuItem>알림 설정</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    로그아웃
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6">{children}</main>
      </div>

      <AIChatbot primaryColor={primaryColor} />
    </div>
  );
}
