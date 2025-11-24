import { ReactNode, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  FileText,
  Home,
  Building2,
  BarChart3,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
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
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

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

  const openProfileDialog = () => {
    setProfileName(user?.name || '');
    setProfileEmail(user?.email || '');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setProfileError(null);
    setProfileDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!user) {
      return;
    }

    const trimmedName = profileName.trim();
    if (!trimmedName) {
      setProfileError('이름을 입력하세요.');
      return;
    }

    setIsSavingProfile(true);
    setProfileError(null);

    try {
      const updates: any = {};

      if (trimmedName !== user.name) {
        updates.name = trimmedName;
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('users')
          .update(updates)
          .eq('id', user.id);

        if (error) {
          throw error;
        }
      }

      if (currentPassword || newPassword || confirmPassword) {
        if (!currentPassword || !newPassword || !confirmPassword) {
          setProfileError('비밀번호 변경 필드를 모두 입력하세요.');
          setIsSavingProfile(false);
          return;
        }

        if (newPassword !== confirmPassword) {
          setProfileError('새 비밀번호가 일치하지 않습니다.');
          setIsSavingProfile(false);
          return;
        }

        try {
          const { error: pwError } = await supabase.auth.updateUser({
            password: newPassword,
          });

          if (pwError) {
            throw pwError;
          }
        } catch (pwError) {
          console.error('비밀번호 변경 실패:', pwError);
          setProfileError('비밀번호 변경 중 오류가 발생했습니다.');
          setIsSavingProfile(false);
          return;
        }
      }

      toast({
        title: '저장되었습니다',
        description: '프로필이 업데이트되었습니다.',
      });
      setProfileDialogOpen(false);
    } catch (error) {
      console.error('프로필 저장 실패:', error);
      setProfileError(
        error instanceof Error
          ? error.message
          : '프로필을 저장하는 중 오류가 발생했습니다.'
      );
    } finally {
      setIsSavingProfile(false);
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
            <div>
              <p className="text-sm font-medium">{user?.name}</p>
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

              <div className="flex-1 max-w-md">
                <div className="flex gap-2">
                  <Input
                    type="search"
                    placeholder="문서 검색..."
                    className="bg-white text-slate-900 placeholder:text-slate-400 border-slate-200 rounded-md"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="bg-white hover:border-blue-500 border-slate-200 rounded-md"
                    onClick={handleSearch}
                  >
                    🔍
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2 bg-white text-slate-900 border-slate-200 hover:bg-slate-50"
                  >
                    <span>{user?.name}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>내 계정</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={openProfileDialog}>
                    프로필 설정
                  </DropdownMenuItem>
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

      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>프로필 설정</DialogTitle>
            <DialogDescription>사용자 정보를 수정합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">이름</Label>
              <Input
                id="profile-name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">이메일</Label>
              <Input
                id="profile-email"
                value={profileEmail}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label>부서</Label>
              <Input
                value={user?.departmentId || ''}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label>역할</Label>
              <Input
                value={user?.role === 'admin' ? '관리자' : '팀원'}
                disabled
              />
            </div>
            <div className="space-y-3 pt-2">
              <p className="text-sm font-medium text-slate-700">비밀번호 변경</p>
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label htmlFor="current-password">현재 비밀번호</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-password">새 비밀번호</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="confirm-password">비밀번호 확인</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>
            {profileError && (
              <p className="text-xs text-red-500">{profileError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setProfileDialogOpen(false)}
              disabled={isSavingProfile}
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
            >
              {isSavingProfile ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AIChatbot primaryColor={primaryColor} />
    </div>
  );
}
