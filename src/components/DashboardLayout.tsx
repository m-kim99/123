import { ReactNode, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  FileText,
  Home,
  Building2,
  BarChart3,
  LogOut,
  ChevronDown,
  Users,
  Menu,
  X,
  User,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import logo from '@/assets/logo1.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { NFCAutoRedirect } from '@/components/NFCAutoRedirect';
import { useNotificationStore, Notification } from '@/store/notificationStore';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  // Selector 최적화: 상태값은 개별 selector로, 함수는 한 번에
  const user = useAuthStore((state) => state.user);
  const { logout, checkSession, clearError } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<{
    recent: string[];
    popular: string[];
    related: string[];
  }>({ recent: [], popular: [], related: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profileCompanyCode, setProfileCompanyCode] = useState('');
  const [profileCompanyName, setProfileCompanyName] = useState('');
  const [companyVerified, setCompanyVerified] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [userDepartmentName, setUserDepartmentName] = useState<string | null>(null);

  // Selector 최적화: notifications만 변경 시 리렌더링
  const notifications = useNotificationStore((state) => state.notifications);
  const isLoadingNotifications = useNotificationStore((state) => state.isLoading);
  const { fetchNotifications, markAsRead, dismissNotification } = useNotificationStore();

  const isAdmin = user?.role === 'admin';
  const basePath = isAdmin ? '/admin' : '/team';
  const primaryColor = '#2563eb';

  // 사용자 부서명 가져오기
  useEffect(() => {
    const fetchUserDepartment = async () => {
      if (!user?.departmentId) {
        setUserDepartmentName(null);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('departments')
          .select('name')
          .eq('id', user.departmentId)
          .single();
        if (!error && data) {
          setUserDepartmentName(data.name);
        }
      } catch (err) {
        console.error('부서 정보 조회 실패:', err);
      }
    };
    fetchUserDepartment();
  }, [user?.departmentId]);

  // 역할 + 부서명 표시 헬퍼 (useCallback으로 최적화)
  const getRoleDisplay = useCallback(() => {
    const roleText = isAdmin ? '관리자' : '팀원';
    if (userDepartmentName) {
      return `${roleText} | ${userDepartmentName}`;
    }
    return roleText;
  }, [isAdmin, userDepartmentName]);

  // useMemo로 계산 최적화
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const debounceTimer = useRef<number | null>(null);

  // useCallback으로 최적화: user?.id가 변경될 때만 재생성
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchSuggestions({ recent: [], popular: [], related: [] });
      return;
    }

    setIsLoadingSuggestions(true);

    try {
      const trimmed = query.trim();

      // 최근 검색어 (필터링 없이 최근 5개)
      const { data: recentData } = await supabase
        .from('search_history')
        .select('query')
        .eq('user_id', user?.id)
        .order('searched_at', { ascending: false })
        .limit(5);

      // 인기 검색어 (필터링 없이 상위 5개)
      const { data: popularData } = await supabase
        .from('search_history')
        .select('query, search_count')
        .order('search_count', { ascending: false })
        .limit(5);

      // 연관 검색어 (문서 제목에서, 입력값으로 필터링)
      const { data: relatedData } = await supabase
        .from('documents')
        .select('title')
        .ilike('title', `%${trimmed}%`)
        .limit(5);

      setSearchSuggestions({
        recent: recentData?.map((r: any) => r.query) || [],
        popular: popularData?.map((p: any) => p.query) || [],
        related: relatedData?.map((d: any) => d.title) || [],
      });
    } catch (error) {
      console.error('자동완성 로드 실패:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (debounceTimer.current) {
      window.clearTimeout(debounceTimer.current);
    }

    if (!searchQuery.trim()) {
      setSearchSuggestions({ recent: [], popular: [], related: [] });
      setShowSuggestions(false);
      return;
    }

    debounceTimer.current = window.setTimeout(() => {
      if (searchQuery.trim()) {
        fetchSuggestions(searchQuery);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) {
        window.clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery, fetchSuggestions]);

  // 레이아웃 마운트 시에도 알림을 한 번 불러와서 배지 카운트가 초기 진입부터 보이도록 처리
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (isNotificationOpen) {
      fetchNotifications();
    }
  }, [isNotificationOpen, fetchNotifications]);

  // useCallback으로 최적화
  const handleNotificationClick = useCallback(async (notification: Notification) => {
    try {
      if (!notification.isRead) {
        await markAsRead(notification.id);
      }

      let targetPath = `${basePath}/documents`;

      if (notification.parentCategoryId && notification.subcategoryId) {
        targetPath = `${basePath}/parent-category/${notification.parentCategoryId}/subcategory/${notification.subcategoryId}`;
      } else if (notification.parentCategoryId) {
        targetPath = `${basePath}/parent-category/${notification.parentCategoryId}`;
      }

      navigate(targetPath);
      setIsNotificationOpen(false);
    } catch (error) {
      console.error('알림 클릭 처리 실패:', error);
    }
  }, [markAsRead, basePath, navigate]);

  // useCallback으로 최적화
  const handleSearch = useCallback(async () => {
    const query = searchQuery.trim();
    if (!query) return;

    const targetPath = isAdmin ? '/admin/documents' : '/team/documents';

    try {
      const { data: existing } = await supabase
        .from('search_history')
        .select('id, search_count')
        .eq('user_id', user?.id)
        .eq('query', query)
        .single();

      if (existing) {
        await supabase
          .from('search_history')
          .update({
            search_count: (existing as any).search_count + 1,
            searched_at: new Date().toISOString(),
          })
          .eq('id', (existing as any).id);
      } else {
        await supabase.from('search_history').insert({
          user_id: user?.id,
          query,
          searched_at: new Date().toISOString(),
          search_count: 1,
        });
      }
    } catch (error) {
      console.error('검색 기록 저장 실패:', error);
    }

    navigate(`${targetPath}?q=${encodeURIComponent(query)}`);
    setShowSuggestions(false);
  }, [searchQuery, user?.id, isAdmin, navigate]);

  const openProfileDialog = () => {
    setProfileName(user?.name || '');
    setProfileEmail(user?.email || '');
    setProfileCompanyCode(user?.companyCode || '');
    setProfileCompanyName(user?.companyName || '');
    setCompanyVerified(true);
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

    clearError();
    setIsSavingProfile(true);

    try {
      // 회사 정보 인증 확인
      if (!companyVerified) {
        setProfileError('회사 정보를 인증해주세요.');
        setIsSavingProfile(false);
        return;
      }

      const trimmedName = profileName.trim();
      if (!trimmedName) {
        setProfileError('이름을 입력하세요.');
        setIsSavingProfile(false);
        return;
      }

      // 1. 회사 정보 변경 처리
      let newCompanyId = user.companyId;

      if (
        profileCompanyCode !== user.companyCode ||
        profileCompanyName !== user.companyName
      ) {
        const { data: existingCompany, error: checkError } = await supabase
          .from('companies')
          .select('*')
          .eq('code', profileCompanyCode)
          .single();

        let company;

        if (existingCompany) {
          if (existingCompany.name !== profileCompanyName) {
            setProfileError(
              '회사 코드는 존재하지만 회사명이 일치하지 않습니다.'
            );
            setIsSavingProfile(false);
            return;
          }
          company = existingCompany;
        } else if (checkError && (checkError as any).code === 'PGRST116') {
          const { data: newCompany, error: createError } = await supabase
            .from('companies')
            .insert({
              name: profileCompanyName,
              code: profileCompanyCode,
            })
            .select()
            .single();

          if (createError) throw createError;
          company = newCompany;
        } else {
          throw checkError;
        }

        newCompanyId = company.id;
      }

      // 2. 사용자 정보 업데이트
      const { error: updateError } = await supabase
        .from('users')
        .update({
          name: trimmedName,
          company_id: newCompanyId,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // 3. 비밀번호 변경 (입력된 경우)
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          setProfileError('새 비밀번호가 일치하지 않습니다.');
          setIsSavingProfile(false);
          return;
        }

        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (passwordError) {
          setProfileError('비밀번호 변경 실패: ' + passwordError.message);
          setIsSavingProfile(false);
          return;
        }
      }

      // 4. 세션 새로고침
      await checkSession();

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
    {
      name: isAdmin ? '부서 관리' : '부서 보기',
      href: `${basePath}/departments`,
      icon: Building2,
    },
    {
      name: '대분류 관리',
      href: `${basePath}/parent-categories`,
      icon: FileText,
    },
    {
      name: '세부 카테고리 관리',
      href: `${basePath}/subcategories`,
      icon: FileText,
    },
    { name: '문서 관리', href: `${basePath}/documents`, icon: FileText },
    ...(isAdmin
      ? [{ name: '팀원 관리', href: `${basePath}/users`, icon: Users }]
      : []),
    { name: '통계', href: `${basePath}/statistics`, icon: BarChart3 },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* NFC 자동 감지 (백그라운드에서 항상 작동) */}
      <NFCAutoRedirect />
      
      <aside
        className={`fixed inset-y-0 left-0 z-40 md:z-50 w-64 bg-white border-r transform transition-transform duration-300 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isMobileMenuOpen ? 'block' : 'hidden md:block'} md:translate-x-0`}
      >
        <div className="flex items-center justify-center h-16 px-4 border-b">
          <button
            type="button"
            onClick={() => navigate(basePath)}
            className="flex items-center justify-center bg-white focus:outline-none w-full"
          >
            <img
              src={logo}
              alt="TrayStorage"
              className="h-12 w-full max-w-[200px] object-contain"
            />
          </button>
        </div>

        <div className="md:hidden px-6 pt-4 pb-2">
          <button
            type="button"
            onClick={() => navigate(basePath)}
            className="flex items-center gap-2 bg-white focus:outline-none"
          >
            <img
              src={logo}
              alt="TrayStorage"
              className="h-10 w-auto object-contain"
            />
          </button>
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

        <div className="absolute bottom-0 left-0 right-0">
          {/* 가로바 + 저작권: 프로필 아래 */}
          <div className="border-t" />

          {/* 프로필: 가로바 위 */}
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center gap-3 px-3 py-2">
              <div>
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-slate-500">{getRoleDisplay()}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64 w-full min-w-full">
        <header className="md:hidden sticky top-0 z-40 border-b bg-[#1e40af] w-full h-16 px-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="p-2 text-white shrink-0"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>

          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="search"
                placeholder="문서 검색..."
                className="w-full pl-10 bg-white text-slate-900 placeholder:text-slate-400 border-slate-200 rounded-md"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                onFocus={() => {
                  if (searchQuery.trim()) {
                    setShowSuggestions(true);
                  }
                }}
                onBlur={() => {
                  // 클릭 선택 여유를 위해 약간 지연 후 닫기
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
              />

              {showSuggestions && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-lg z-50 w-full">
                  {isLoadingSuggestions ? (
                    <div className="p-4 text-center text-slate-500">검색 중...</div>
                  ) : (
                    <div className="flex">
                      {/* 좌측: 관련 문서 (자동완성) */}
                      <div className="flex-1 border-r p-3 max-h-80 overflow-y-auto">
                        <p className="text-xs font-semibold text-slate-500 mb-2">
                          관련 문서
                        </p>
                        {searchSuggestions.related.length > 0 ? (
                          searchSuggestions.related.map((item, idx) => (
                            <div
                              key={`related-mobile-${idx}`}
                              className="px-3 py-2 hover:bg-slate-100 cursor-pointer rounded text-sm"
                              onClick={() => {
                                setSearchQuery(item);
                                handleSearch();
                              }}
                            >
                              📄 {item}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-400 px-3">
                            관련 문서가 없습니다
                          </p>
                        )}
                      </div>

                      {/* 우측: 최근/인기 검색어 */}
                      <div className="w-40 p-3 max-h-80 overflow-y-auto">
                        {/* 최근 검색어 */}
                        {searchSuggestions.recent.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-semibold text-slate-500 mb-2">
                              최근 검색어
                            </p>
                            {searchSuggestions.recent.map((item, idx) => (
                              <div
                                key={`recent-mobile-${idx}`}
                                className="px-2 py-1.5 hover:bg-slate-100 cursor-pointer rounded text-sm"
                                onClick={() => {
                                  setSearchQuery(item);
                                  handleSearch();
                                }}
                              >
                                🕐 {item}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 인기 검색어 */}
                        {searchSuggestions.popular.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 mb-2">
                              인기 검색어
                            </p>
                            {searchSuggestions.popular.map((item, idx) => (
                              <div
                                key={`popular-mobile-${idx}`}
                                className="px-2 py-1.5 hover:bg-slate-100 cursor-pointer rounded text-sm"
                                onClick={() => {
                                  setSearchQuery(item);
                                  handleSearch();
                                }}
                              >
                                🔥 {item}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 우측이 비어있을 때 */}
                        {searchSuggestions.recent.length === 0 &&
                          searchSuggestions.popular.length === 0 && (
                            <p className="text-sm text-slate-400 text-center py-4">
                              검색 기록이 없습니다
                            </p>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="bg-white hover:border-blue-500 border-slate-200 rounded-md"
              onClick={handleSearch}
            >
              🔍
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="relative bg-white hover:border-blue-500 border-slate-200 rounded-md"
              onClick={() => setIsNotificationOpen((prev) => !prev)}
            >
              🔔
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-semibold text-white flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 shrink-0">
                <User className="h-5 w-5 text-white" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="px-4 py-3 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                    <User className="h-6 w-6 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{user?.name || '사용자'}</p>
                    <p className="text-xs text-slate-500">
                      {getRoleDisplay()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 border-b bg-slate-50">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">회사 코드</span>
                    <span className="font-medium">{user?.companyCode || 'A001'}</span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-0.5">회사명</p>
                    <p className="text-sm font-medium break-words">
                      {user?.companyName || '주식회사파랑_인천지점'}
                    </p>
                  </div>
                </div>
              </div>

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
        </header>

        <header className="hidden md:flex sticky top-0 z-40 border-b bg-[#1e40af] w-full">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6 w-full">
            <div className="flex items-center gap-4 flex-1">
              <div className="flex-1 flex gap-2 max-w-2xl">
                <div className="relative flex-1">
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
                    onFocus={() => {
                      if (searchQuery.trim()) {
                        setShowSuggestions(true);
                      }
                    }}
                    onBlur={() => {
                      // 클릭 선택 여유를 위해 약간 지연 후 닫기
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                  />

                  {showSuggestions && (
                    <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-lg z-50 w-[600px]">
                      {isLoadingSuggestions ? (
                        <div className="p-4 text-center text-slate-500">검색 중...</div>
                      ) : (
                        <div className="flex">
                          {/* 좌측: 관련 문서 (자동완성) */}
                          <div className="flex-1 border-r p-3 max-h-80 overflow-y-auto">
                            <p className="text-xs font-semibold text-slate-500 mb-2">
                              관련 문서
                            </p>
                            {searchSuggestions.related.length > 0 ? (
                              searchSuggestions.related.map((item, idx) => (
                                <div
                                  key={`related-${idx}`}
                                  className="px-3 py-2 hover:bg-slate-100 cursor-pointer rounded text-sm"
                                  onClick={() => {
                                    setSearchQuery(item);
                                    handleSearch();
                                  }}
                                >
                                  📄 {item}
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-slate-400 px-3">
                                관련 문서가 없습니다
                              </p>
                            )}
                          </div>

                          {/* 우측: 최근/인기 검색어 */}
                          <div className="w-56 p-3 max-h-80 overflow-y-auto">
                            {/* 최근 검색어 */}
                            {searchSuggestions.recent.length > 0 && (
                              <div className="mb-4">
                                <p className="text-xs font-semibold text-slate-500 mb-2">
                                  최근 검색어
                                </p>
                                {searchSuggestions.recent.map((item, idx) => (
                                  <div
                                    key={`recent-${idx}`}
                                    className="px-2 py-1.5 hover:bg-slate-100 cursor-pointer rounded text-sm"
                                    onClick={() => {
                                      setSearchQuery(item);
                                      handleSearch();
                                    }}
                                  >
                                    🕐 {item}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* 인기 검색어 */}
                            {searchSuggestions.popular.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-slate-500 mb-2">
                                  인기 검색어
                                </p>
                                {searchSuggestions.popular.map((item, idx) => (
                                  <div
                                    key={`popular-${idx}`}
                                    className="px-2 py-1.5 hover:bg-slate-100 cursor-pointer rounded text-sm"
                                    onClick={() => {
                                      setSearchQuery(item);
                                      handleSearch();
                                    }}
                                  >
                                    🔥 {item}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* 우측이 비어있을 때 */}
                            {searchSuggestions.recent.length === 0 &&
                              searchSuggestions.popular.length === 0 && (
                                <p className="text-sm text-slate-400 text-center py-4">
                                  검색 기록이 없습니다
                                </p>
                              )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="bg-white hover:border-blue-500 border-slate-200 rounded-md"
                  onClick={handleSearch}
                >
                  🔍
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="relative bg-white hover:border-blue-500 border-slate-200 rounded-md"
                  onClick={() => setIsNotificationOpen((prev) => !prev)}
                >
                  🔔
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-semibold text-white flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
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
                <DropdownMenuContent align="end" className="w-64">
                  <div className="px-4 py-3 border-b">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                        <User className="h-6 w-6 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{user?.name || '사용자'}</p>
                        <p className="text-xs text-slate-500">
                          {getRoleDisplay()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-3 border-b bg-slate-50">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">회사 코드</span>
                        <span className="font-medium">{user?.companyCode || 'A001'}</span>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 mb-0.5">회사명</p>
                        <p className="text-sm font-medium break-words">
                          {user?.companyName || '주식회사파랑_인천지점'}
                        </p>
                      </div>
                    </div>
                  </div>

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

        <main className="flex-1 overflow-auto w-full">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4 lg:py-6">
            {children}
          </div>
        </main>
      </div>

      {isNotificationOpen && (
        <div className="fixed top-20 right-4 z-50 w-80 bg-white border border-slate-200 rounded-lg shadow-lg">
          <div className="flex items-center justify-between px-3 py-2 border-b bg-white">
            <span className="text-sm font-semibold text-slate-900">알림</span>
            <button
              type="button"
              className="text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded px-2 py-1"
              onClick={() => setIsNotificationOpen(false)}
            >
              닫기
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto bg-white">
            {isLoadingNotifications ? (
              <div className="p-3 text-sm text-slate-500">불러오는 중...</div>
            ) : notifications.length === 0 ? (
              <div className="p-3 text-sm text-slate-500">알림이 없습니다.</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start justify-between px-3 py-2 border-b last:border-b-0 bg-white ${
                    n.isRead ? '' : 'bg-white'
                  }`}
                >
                  <button
                    type="button"
                    className="flex-1 text-left text-xs bg-white"
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div className="flex items-center gap-2">
                      {!n.isRead && (
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                      )}
                      <span className="text-slate-900">{n.message}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </button>
                  <button
                    type="button"
                    className="ml-2 text-xs text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center"
                    onClick={() => dismissNotification(n.id)}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
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

            <div className="space-y-4 pt-4 border-t">
              <p className="text-sm font-medium text-slate-700">회사 정보 변경</p>

              <div className="space-y-2">
                <Label>회사 코드</Label>
                <Input
                  placeholder="예: COMPANY001"
                  value={profileCompanyCode}
                  onChange={(e) => {
                    setProfileCompanyCode(e.target.value);
                    setCompanyVerified(false);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>회사명</Label>
                <Input
                  placeholder="예: 삼성전자"
                  value={profileCompanyName}
                  onChange={(e) => {
                    setProfileCompanyName(e.target.value);
                    setCompanyVerified(false);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Button
                  type="button"
                  className={`w-full ${
                    companyVerified ? 'bg-green-600 hover:bg-green-600' : ''
                  }`}
                  onClick={() => {
                    if (profileCompanyCode.trim() && profileCompanyName.trim()) {
                      setCompanyVerified(true);
                      toast({
                        title: '인증 완료',
                        description: '회사 정보가 인증되었습니다.',
                      });
                    } else {
                      toast({
                        title: '회사 정보 입력',
                        description: '회사 코드와 회사명을 모두 입력해주세요.',
                        variant: 'destructive',
                      });
                    }
                  }}
                  disabled={
                    !profileCompanyCode.trim() || !profileCompanyName.trim()
                  }
                  variant={companyVerified ? 'default' : 'outline'}
                >
                  {companyVerified ? '✓ 인증됨 (다시 인증)' : '인증하기'}
                </Button>
                {!companyVerified && (
                  <p className="text-xs text-slate-400">
                    회사 코드와 회사명을 입력하고 인증해주세요
                  </p>
                )}
                {companyVerified && (
                  <p className="text-xs text-green-600">
                    다른 회사로 변경하려면 위에서 수정 후 다시 인증하세요
                  </p>
                )}
              </div>
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
                value={userDepartmentName || '부서 없음'}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label>역할</Label>
              <Input
                value={getRoleDisplay()}
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
