import { ReactNode, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import {
  FileText,
  Home,
  Building2,
  BarChart3,
  MessageSquare,
  LogOut,
  ChevronDown,
  Users,
  Menu,
  X,
  User,
  Search,
  Share2,
  FolderOpen,
  Archive,
  Megaphone,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import logo from '@/assets/logo1.png';
import searchIcon from '@/assets/search.svg';
import bellIcon from '@/assets/bell.svg';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import { trackEvent } from '@/lib/analytics';
import { NFCAutoRedirect } from '@/components/NFCAutoRedirect';
import { NotificationSettingsDialog } from '@/components/NotificationSettingsDialog';
import { useNotificationStore, Notification } from '@/store/notificationStore';
import { validatePasswordClient, PasswordValidation } from '@/lib/password-validator';

interface DashboardLayoutProps {
  children: ReactNode;
}

declare global {
  interface Window {
    openProfileDialog?: () => void;
  }
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('app-language', lng);
  };

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
  const [showDeletionView, setShowDeletionView] = useState(false);
  const [deletionPassword, setDeletionPassword] = useState('');
  const [deletionConfirmText, setDeletionConfirmText] = useState('');
  const [isRequestingDeletion, setIsRequestingDeletion] = useState(false);
  const [isOAuthUser, setIsOAuthUser] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);
  const [userDepartmentName, setUserDepartmentName] = useState<string | null>(null);
  const [newPasswordValidation, setNewPasswordValidation] = useState<PasswordValidation | null>(null);

  const FAQIcon = ({ className }: { className?: string }) => (
    <MessageSquare className={className} />
  );


  // 새 비밀번호 실시간 검증
  useEffect(() => {
    if (newPassword) {
      const validation = validatePasswordClient(newPassword);
      setNewPasswordValidation(validation);
    } else {
      setNewPasswordValidation(null);
    }
  }, [newPassword]);

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
    const roleText = isAdmin ? t('common.admin') : t('common.team');
    if (userDepartmentName) {
      return `${roleText} | ${userDepartmentName}`;
    }
    return roleText;
  }, [isAdmin, userDepartmentName, t]);

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

      // 연관 검색어 (문서 제목 + OCR 텍스트에서 검색)
      const { data: relatedData } = await supabase
        .from('documents')
        .select('title, ocr_text')
        .or(`title.ilike.%${trimmed}%,ocr_text.ilike.%${trimmed}%`)
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

      // 공유 알림인 경우 공유받은 문서함으로 이동
      if (notification.type === 'document_shared') {
        targetPath = `${basePath}/shared`;
      } else if (notification.parentCategoryId && notification.subcategoryId) {
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

  // 알림 메시지를 파싱하여 액션 부분과 나머지를 분리
  const parseNotificationMessage = useCallback((message: string) => {
    const actionPatterns = [
      '📤 문서 공유',
      '문서 등록',
      '문서 삭제',
      '세부 스토리지 생성',
      '세부 스토리지 삭제',
      '대분류 카테고리 생성',
      '대분류 카테고리 삭제',
      '⚠️ 문서 만료 임박 (7일 이내)',
      '⏰ 문서 만료 임박 (30일 이내)',
    ];

    for (const pattern of actionPatterns) {
      if (message.startsWith(pattern)) {
        const rest = message.substring(pattern.length).trim();
        return { action: pattern, rest };
      }
    }

    return { action: '', rest: message };
  }, []);

  // useCallback으로 최적화
  const handleSearch = useCallback(async () => {
    const query = searchQuery.trim();
    if (!query) return;

    const targetPath = isAdmin ? '/admin/documents' : '/team/documents';

    trackEvent('search', {
      search_query_length: query.length,
      search_target_path: targetPath,
      search_source: 'header',
    });

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

  const openProfileDialog = useCallback(() => {
    setProfileName(user?.name || '');
    setProfileEmail(user?.email || '');
    setProfileCompanyCode(user?.companyCode || '');
    setProfileCompanyName(user?.companyName || '');
    setCompanyVerified(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setProfileError(null);
    setShowDeletionView(false);
    setDeletionPassword('');
    setDeletionConfirmText('');
    setProfileDialogOpen(true);

    // OAuth 사용자 여부 확인 (비밀번호 없는 소셜 로그인 계정)
    const checkOAuthUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const identities = session.user.identities || [];
        const hasEmailIdentity = identities.some(
          (identity: { provider: string }) => identity.provider === 'email'
        );
        setIsOAuthUser(!hasEmailIdentity && identities.length > 0);
      }
    };
    checkOAuthUser();
  }, [user]);

  const openProfileDialogRef = useRef(openProfileDialog);
  useEffect(() => {
    openProfileDialogRef.current = openProfileDialog;
  }, [openProfileDialog]);

  useEffect(() => {
    window.openProfileDialog = () => openProfileDialogRef.current();
    return () => {
      delete window.openProfileDialog;
    };
  }, []);

  const handleRequestDeletion = async () => {
    if (!user) return;

    // OAuth 사용자: "탈퇴" 텍스트 확인
    if (isOAuthUser) {
      if (deletionConfirmText !== t('profile.deleteKeyword')) {
        setProfileError(t('profile.deleteConfirmExact'));
        return;
      }
    } else {
      // 일반 사용자: 비밀번호 확인
      if (!deletionPassword.trim()) {
        setProfileError(t('profile.enterPasswordPlease'));
        return;
      }
    }

    setIsRequestingDeletion(true);
    setProfileError(null);

    try {
      // 일반 사용자만 비밀번호 확인
      if (!isOAuthUser) {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: deletionPassword,
        });

        if (authError) {
          setProfileError(t('profile.passwordMismatch'));
          setIsRequestingDeletion(false);
          return;
        }
      }

      // 기존 pending 요청이 있는지 확인
      const { data: existingRequest } = await supabase
        .from('account_deletion_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .single();

      if (existingRequest) {
        setProfileError(t('profile.alreadyRequested'));
        setIsRequestingDeletion(false);
        return;
      }

      // 탈퇴 요청 생성
      const { error: insertError } = await supabase
        .from('account_deletion_requests')
        .insert({
          user_id: user.id,
        });

      if (insertError) {
        throw insertError;
      }

      toast({
        title: t('profile.deleteRequestComplete'),
        description: t('profile.deleteRequestDesc'),
      });

      setProfileDialogOpen(false);
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('탈퇴 신청 실패:', error);
      setProfileError(
        error instanceof Error ? error.message : t('profile.deleteRequestError')
      );
    } finally {
      setIsRequestingDeletion(false);
    }
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
        setProfileError(t('profile.verifyCompanyFirst'));
        setIsSavingProfile(false);
        return;
      }

      const trimmedName = profileName.trim();
      if (!trimmedName) {
        setProfileError(t('profile.enterName'));
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
              t('profile.companyCodeMismatch')
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
          setProfileError(t('profile.newPasswordMismatch'));
          setIsSavingProfile(false);
          return;
        }

        // Edge Function으로 비밀번호 검증
        const { data: validation, error: validationError } = await supabase.functions.invoke('validate-password', {
          body: { password: newPassword },
        });

        if (validationError) {
          console.error('비밀번호 검증 오류:', validationError);
        } else if (validation && !validation.valid) {
          setProfileError(t('profile.passwordSecurityReq') + validation.errors.join(', '));
          setIsSavingProfile(false);
          return;
        }

        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (passwordError) {
          setProfileError(t('profile.passwordChangeFail') + passwordError.message);
          setIsSavingProfile(false);
          return;
        }
      }

      // 4. 세션 새로고침
      await checkSession();

      toast({
        title: t('profile.saved'),
        description: t('profile.profileUpdated'),
      });
      setProfileDialogOpen(false);
    } catch (error) {
      console.error('프로필 저장 실패:', error);
      setProfileError(
        error instanceof Error
          ? error.message
          : t('profile.profileSaveError')
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const navigation = [
    { name: t('nav.home'), href: basePath, icon: Home },
    { name: t('nav.documentManagement'), href: `${basePath}/documents`, icon: FileText },
    {
      name: isAdmin ? t('nav.departmentManagement') : t('nav.departmentView'),
      href: `${basePath}/departments`,
      icon: Building2,
    },
    {
      name: t('nav.parentCategoryManagement'),
      href: `${basePath}/parent-categories`,
      icon: FolderOpen,
    },
    {
      name: t('nav.subcategoryManagement'),
      href: `${basePath}/subcategories`,
      icon: Archive,
    },
    ...(isAdmin
      ? [{ name: t('nav.teamManagement'), href: `${basePath}/users`, icon: Users }]
      : []),
    ...(!isAdmin
      ? [{ name: t('nav.sharedDocuments'), href: `${basePath}/shared`, icon: Share2 }]
      : []),
    { name: t('nav.statistics'), href: `${basePath}/statistics`, icon: BarChart3 },
    { name: t('nav.announcements'), href: `${basePath}/announcements`, icon: Megaphone },
    ...(isAdmin
      ? [
          {
            name: t('nav.customerService'),
            href: 'https://traystorage.net/contact/',
            icon: FAQIcon,
            external: true,
          },
        ]
      : []),
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
        <div className="flex items-center justify-center h-16 px-4 border-b overflow-hidden">
          <button
            type="button"
            onClick={() => navigate(basePath)}
            className="flex items-center justify-center bg-white focus:outline-none w-full"
          >
            <img
              src={logo}
              alt="TrayStorage"
              className="h-12 w-auto max-w-[200px] object-contain"
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
            const isActive = !item.external && location.pathname === item.href;
            return (
              item.external ? (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
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
                </a>
              ) : (
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
              )
            );
          })}
        </nav>

        <div className={`absolute left-0 right-0 ${Capacitor.isNativePlatform() ? 'bottom-14' : 'bottom-0'}`}>
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
                placeholder={t('header.searchPlaceholder')}
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
                    <div className="p-4 text-center text-slate-500">{t('common.searching')}</div>
                  ) : (
                    <div className="flex">
                      {/* 좌측: 관련 문서 (자동완성) */}
                      <div className="flex-1 border-r p-3 max-h-80 overflow-y-auto">
                        <p className="text-xs font-semibold text-slate-500 mb-2">
                          {t('header.relatedDocuments')}
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
                            {t('header.noRelatedDocuments')}
                          </p>
                        )}
                      </div>

                      {/* 우측: 최근/인기 검색어 */}
                      <div className="w-40 p-3 max-h-80 overflow-y-auto">
                        {/* 최근 검색어 */}
                        {searchSuggestions.recent.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-semibold text-slate-500 mb-2">
                              {t('header.recentSearches')}
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
                              {t('header.popularSearches')}
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
                              {t('header.noSearchHistory')}
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
              <img src={searchIcon} alt={t('common.search')} className="h-7 w-7 block object-contain" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="relative bg-white hover:border-blue-500 border-slate-200 rounded-md"
              onClick={() => setIsNotificationOpen((prev) => !prev)}
            >
              <img src={bellIcon} alt={t('header.notifications')} className="h-7 w-7 block object-contain" />
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
                    <p className="font-semibold text-sm">{user?.name || t('common.user')}</p>
                    <p className="text-xs text-slate-500">
                      {getRoleDisplay()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 border-b bg-slate-50">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">{t('header.companyCode')}</span>
                    <span className="font-medium">{user?.companyCode || 'A001'}</span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-0.5">{t('header.companyName')}</p>
                    <p className="text-sm font-medium break-words">
                      {user?.companyName || '주식회사파랑_인천지점'}
                    </p>
                  </div>
                </div>
              </div>

              <DropdownMenuItem onClick={openProfileDialog}>
                {t('header.profileSettings')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsNotificationSettingsOpen(true)}>{t('header.notificationSettings')}</DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Globe className="h-4 w-4 mr-2" />
                  <span>{t('language.settings')}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup value={i18n.language} onValueChange={changeLanguage}>
                    <DropdownMenuRadioItem value="ko">{t('language.korean')}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="en">{t('language.english')}</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                {t('common.logout')}
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
                    placeholder={t('header.searchPlaceholder')}
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
                        <div className="p-4 text-center text-slate-500">{t('common.searching')}</div>
                      ) : (
                        <div className="flex">
                          {/* 좌측: 관련 문서 (자동완성) */}
                          <div className="flex-1 border-r p-3 max-h-80 overflow-y-auto">
                            <p className="text-xs font-semibold text-slate-500 mb-2">
                              {t('header.relatedDocuments')}
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
                                {t('header.noRelatedDocuments')}
                              </p>
                            )}
                          </div>

                          {/* 우측: 최근/인기 검색어 */}
                          <div className="w-56 p-3 max-h-80 overflow-y-auto">
                            {/* 최근 검색어 */}
                            {searchSuggestions.recent.length > 0 && (
                              <div className="mb-4">
                                <p className="text-xs font-semibold text-slate-500 mb-2">
                                  {t('header.recentSearches')}
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
                                  {t('header.popularSearches')}
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
                                  {t('header.noSearchHistory')}
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
                  <img src={searchIcon} alt={t('common.search')} className="h-7 w-7 block object-contain" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="relative bg-white hover:border-blue-500 border-slate-200 rounded-md"
                  onClick={() => setIsNotificationOpen((prev) => !prev)}
                >
                  <img src={bellIcon} alt={t('header.notifications')} className="h-7 w-7 block object-contain" />
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
                        <p className="font-semibold text-sm">{user?.name || t('common.user')}</p>
                        <p className="text-xs text-slate-500">
                          {getRoleDisplay()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-3 border-b bg-slate-50">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">{t('header.companyCode')}</span>
                        <span className="font-medium">{user?.companyCode || 'A001'}</span>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 mb-0.5">{t('header.companyName')}</p>
                        <p className="text-sm font-medium break-words">
                          {user?.companyName || '주식회사파랑_인천지점'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <DropdownMenuItem onClick={openProfileDialog}>
                    {t('header.profileSettings')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsNotificationSettingsOpen(true)}>{t('header.notificationSettings')}</DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Globe className="h-4 w-4 mr-2" />
                      <span>{t('language.settings')}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuRadioGroup value={i18n.language} onValueChange={changeLanguage}>
                        <DropdownMenuRadioItem value="ko">{t('language.korean')}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="en">{t('language.english')}</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    {t('common.logout')}
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
            <span className="text-sm font-semibold text-slate-900">{t('header.notifications')}</span>
            <button
              type="button"
              className="text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded px-2 py-1"
              onClick={() => setIsNotificationOpen(false)}
            >
              {t('common.close')}
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto bg-white">
            {isLoadingNotifications ? (
              <div className="p-3 text-sm text-slate-500">{t('common.loading')}</div>
            ) : notifications.length === 0 ? (
              <div className="p-3 text-sm text-slate-500">{t('header.noNotifications')}</div>
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
                        <span className="inline-block w-2 h-2 shrink-0 rounded-full bg-blue-500" />
                      )}
                      <span className="text-slate-900">
                        {(() => {
                          const { action, rest } = parseNotificationMessage(n.message);
                          return (
                            <>
                              {action && <strong>{action}</strong>}
                              {rest && <> {rest}</>}
                            </>
                          );
                        })()}
                      </span>
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
          {showDeletionView ? (
            <>
              <DialogHeader>
                <DialogTitle>{t('profile.deleteAccountTitle')}</DialogTitle>
                <DialogDescription>
                  {t('profile.deleteAccountDesc')}
                  <br />
                  {t('profile.deleteAccountDesc2')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 font-medium mb-2">{t('profile.deleteWarning')}</p>
                  <ul className="text-xs text-red-600 space-y-1 list-disc list-inside">
                    <li>{t('profile.deleteWarning1')}</li>
                    <li>{t('profile.deleteWarning2')}</li>
                    <li>{t('profile.deleteWarning3')}</li>
                  </ul>
                </div>
                {isOAuthUser ? (
                  <div className="space-y-2">
                    <Label htmlFor="deletion-confirm">{t('profile.deleteConfirmLabel')}</Label>
                    <Input
                      id="deletion-confirm"
                      type="text"
                      placeholder={t('profile.deleteKeyword')}
                      value={deletionConfirmText}
                      onChange={(e) => setDeletionConfirmText(e.target.value)}
                      disabled={isRequestingDeletion}
                    />
                    <p className="text-xs text-slate-500">
                      {t('profile.deleteOAuthNote')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="deletion-password">{t('profile.deletePasswordLabel')}</Label>
                    <Input
                      id="deletion-password"
                      type="password"
                      placeholder={t('profile.deletePasswordPlaceholder')}
                      value={deletionPassword}
                      onChange={(e) => setDeletionPassword(e.target.value)}
                      disabled={isRequestingDeletion}
                    />
                  </div>
                )}
                {profileError && (
                  <p className="text-xs text-red-500">{profileError}</p>
                )}
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDeletionView(false);
                    setDeletionPassword('');
                    setDeletionConfirmText('');
                    setProfileError(null);
                  }}
                  disabled={isRequestingDeletion}
                  className="w-full sm:w-auto"
                >
                  {t('common.back')}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleRequestDeletion}
                  disabled={isRequestingDeletion || (isOAuthUser ? deletionConfirmText !== t('profile.deleteKeyword') : !deletionPassword.trim())}
                  className="w-full sm:w-auto"
                >
                  {isRequestingDeletion ? t('common.processing') : t('profile.requestDeletion')}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{t('profile.title')}</DialogTitle>
                <DialogDescription>{t('profile.description')}</DialogDescription>
              </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">{t('profile.name')}</Label>
              <Input
                id="profile-name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
            </div>

            <div className="space-y-4 pt-4 border-t">
              <p className="text-sm font-medium text-slate-700">{t('profile.companyInfoChange')}</p>

              <div className="space-y-2">
                <Label>{t('profile.companyCode')}</Label>
                <Input
                  placeholder={t('profile.companyCodePlaceholder')}
                  value={profileCompanyCode}
                  onChange={(e) => {
                    setProfileCompanyCode(e.target.value);
                    setCompanyVerified(false);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('profile.companyName')}</Label>
                <Input
                  placeholder={t('profile.companyNamePlaceholder')}
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
                        title: t('profile.verifyComplete'),
                        description: t('profile.companyInfoVerified'),
                      });
                    } else {
                      toast({
                        title: t('profile.companyInfoChange'),
                        description: t('profile.enterCompanyInfo'),
                        variant: 'destructive',
                      });
                    }
                  }}
                  disabled={
                    !profileCompanyCode.trim() || !profileCompanyName.trim()
                  }
                  variant={companyVerified ? 'default' : 'outline'}
                >
                  {companyVerified ? t('profile.verifiedReVerify') : t('profile.verifyButton')}
                </Button>
                {!companyVerified && (
                  <p className="text-xs text-slate-400">
                    {t('profile.enterCompanyCodeAndName')}
                  </p>
                )}
                {companyVerified && (
                  <p className="text-xs text-green-600">
                    {t('profile.changeCompanyInfo')}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-email">{t('profile.email')}</Label>
              <Input
                id="profile-email"
                value={profileEmail}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label>{t('profile.department')}</Label>
              <Input
                value={userDepartmentName || t('common.noDepartment')}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label>{t('profile.role')}</Label>
              <Input
                value={getRoleDisplay()}
                disabled
              />
            </div>
            <div className="space-y-3 pt-2">
              <p className="text-sm font-medium text-slate-700">{t('profile.passwordChange')}</p>
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label htmlFor="current-password">{t('profile.currentPassword')}</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-password">{t('profile.newPassword')}</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder={t('profile.newPasswordPlaceholder')}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  {newPasswordValidation && !newPasswordValidation.isValid && newPassword && (
                    <p className="text-[11px] text-red-500 mt-1">
                      ⚠️ {newPasswordValidation.errors.join(' / ')}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="confirm-password">{t('profile.confirmPassword')}</Label>
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
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
            >
              {isSavingProfile ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
          <div className="pt-4 border-t mt-4">
            <button
              type="button"
              onClick={() => {
                setProfileError(null);
                setShowDeletionView(true);
              }}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              {t('profile.deleteAccount')}
            </button>
          </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AIChatbot primaryColor={primaryColor} />

      <NotificationSettingsDialog
        open={isNotificationSettingsOpen}
        onOpenChange={setIsNotificationSettingsOpen}
      />
    </div>
  );
}
