import { ReactNode, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { requestLocalNotificationPermission } from '@/lib/pushNotification';
import { initFCMPush } from '@/lib/fcmPush';
import {
  FileText,
  Home,
  Building2,
  BarChart3,
  MessageSquare,
  LogOut,
  ChevronDown,
  ChevronUp,
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
  Shield,
  Trash2,
  Crown,
  Sun,
  Moon,
  AlertTriangle,
  AlertCircle,
  Clock,
  TrendingUp,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import logo from '@/assets/logos/logo-header.png';
import logoDark from '@/assets/logos/logo-header-dark.png';
import searchIcon from '@/assets/icons/search.svg';
import bellIcon from '@/assets/icons/bell.svg';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { savePreference } from '@/lib/preferences';
import { requestInnopayPayment, cancelInnopaySubscription, PLAN_PRICING, type PaidPlanName } from '@/lib/payments';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { AIChatbot } from '@/components/AIChatbot';
import { trackEvent } from '@/lib/analytics';
import { NFCAutoRedirect } from '@/components/NFCAutoRedirect';
import { NotificationSettingsDialog } from '@/components/NotificationSettingsDialog';
import { useNotificationStore, Notification } from '@/store/notificationStore';
import { validatePasswordClient, PasswordValidation } from '@/lib/password-validator';
import { type Role, ROLE_LABELS } from '@/lib/permissions';
import { V1ModalHeader, V1ModalBody, V1ModalFooter, V1Chip } from '@/components/ui/v1-components';
import { SiteFooter } from '@/components/SiteFooter';

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
    // Save to DB (fire-and-forget)
    const uid = useAuthStore.getState().user?.id;
    if (uid) {
      savePreference(uid, 'language', lng as 'ko' | 'en' | 'ja');
    }
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
  const [myPermissions, setMyPermissions] = useState<{ departmentId: string; departmentName: string; role: Role }[]>([]);
  const [newPasswordValidation, setNewPasswordValidation] = useState<PasswordValidation | null>(null);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    planName: string;
    displayName: string;
    maxMembers: number | null;
    maxDocuments: number | null;
    maxDepartments: number | null;
    maxStorageMb: number | null;
    maxAiQueries: number | null;
    currentMembers: number;
    currentDocuments: number;
    currentDepartments: number;
    status: string;
    billingCycle: string;
    subscriptionId: string | null;
    paymentProvider: string | null;
    currentPeriodEnd: string | null;
    canceledAt: string | null;
    cardCompany: string | null;
    cardNumber: string | null;
    monthlyAmount: number | null;
  } | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  // 유료 플랜 결제 (이노페이) — 베이직: 인당 6,600원·최대 3인, 프로: 인당 15,000원·인원수 지정
  const BASIC_PRICE_PER_MEMBER = PLAN_PRICING.basic.pricePerMember;
  const PRO_PRICE_PER_MEMBER = PLAN_PRICING.pro.pricePerMember;
  const BASIC_MAX_MEMBERS = PLAN_PRICING.basic.maxMembers ?? 3;
  const [basicMembers, setBasicMembers] = useState('3');
  const [proMembers, setProMembers] = useState('5');
  const [basicAgreed, setBasicAgreed] = useState(false);
  const [isRequestingPayment, setIsRequestingPayment] = useState(false);
  const parsedBasicMembers = Math.max(0, parseInt(basicMembers, 10) || 0);
  const parsedProMembers = Math.max(0, parseInt(proMembers, 10) || 0);
  const [customerPhone, setCustomerPhone] = useState('');

  const handlePlanSubscribe = async (plan: PaidPlanName) => {
    const memberCount = plan === 'basic' ? parsedBasicMembers : parsedProMembers;
    const pricePerMember = plan === 'basic' ? BASIC_PRICE_PER_MEMBER : PRO_PRICE_PER_MEMBER;
    if (!user || !basicAgreed || memberCount < 1) return;
    if (plan === 'basic' && memberCount > BASIC_MAX_MEMBERS) return;
    if (!customerPhone) {
      toast({ title: t('subscription.phoneRequired'), variant: 'destructive' });
      return;
    }
    setIsRequestingPayment(true);
    try {
      await requestInnopayPayment({
        plan,
        customerKey: user.id,
        customerEmail: user.email,
        customerName: user.name,
        customerPhone,
        memberCount,
        amount: memberCount * pricePerMember,
        goodsName: plan === 'basic' ? t('subscription.productNameBasic') : t('subscription.productNamePro'),
      });
    } catch (error) {
      console.error('결제 요청 실패:', error);
      toast({
        title: t('subscription.paymentRequestFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsRequestingPayment(false);
    }
  };

  // 정기결제(자동갱신) 해지 — 현재 기간까지 이용 후 종료
  const handleCancelSubscription = async () => {
    if (!subscriptionInfo?.subscriptionId) return;
    setIsCanceling(true);
    try {
      const res = await cancelInnopaySubscription(subscriptionInfo.subscriptionId);
      if (res.success) {
        toast({ title: t('billing.cancelSuccess') });
        setCancelDialogOpen(false);
        setSubscriptionInfo((prev) =>
          prev ? { ...prev, canceledAt: res.canceledAt ?? new Date().toISOString() } : prev,
        );
      } else {
        toast({ title: res.message || t('billing.cancelFailed'), variant: 'destructive' });
      }
    } catch (error) {
      console.error('구독 해지 실패:', error);
      toast({ title: t('billing.cancelFailed'), variant: 'destructive' });
    } finally {
      setIsCanceling(false);
    }
  };

  const [mobilePermExpanded, setMobilePermExpanded] = useState(false);
  const [mobileLangExpanded, setMobileLangExpanded] = useState(false);
  const [mobileThemeExpanded, setMobileThemeExpanded] = useState(false);
  const { mode: themeMode, setMode: setThemeMode } = useThemeStore();

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
  const { fetchNotifications, markAsRead, dismissNotification, fetchPreferences, startRealtimeSubscription, stopRealtimeSubscription } = useNotificationStore();

  const isAdmin = user?.role === 'admin';
  const basePath = isAdmin ? '/admin' : '/team';
  const primaryColor = '#2563eb';

  // Realtime 구독 시작 + FCM 푸시 초기화
  useEffect(() => {
    if (!user?.id) return;
    fetchPreferences();
    startRealtimeSubscription();
    // FCM 푸시 알림 초기화 (네이티브 앱에서 백그라운드 푸시 수신용)
    initFCMPush();
    return () => { stopRealtimeSubscription(); };
  }, [user?.id]);

  // Load user preferences (theme, language) from DB on login
  useEffect(() => {
    if (!user?.id) return;
    import('@/lib/preferences').then(({ fetchPreferences: fetchUserPrefs }) => {
      fetchUserPrefs(user.id).then((prefs) => {
        if (prefs.theme && prefs.theme !== themeMode) {
          setThemeMode(prefs.theme);
        }
        if (prefs.language && prefs.language !== i18n.language) {
          i18n.changeLanguage(prefs.language);
          localStorage.setItem('app-language', prefs.language);
        }
      });
    });
  }, [user?.id]);

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

  // 알림 패널 열릴 때 배경 스크롤 잠금
  useEffect(() => {
    if (isNotificationOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) window.scrollTo(0, -parseInt(scrollY, 10));
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [isNotificationOpen]);

  // 역할 + 부서명 표시 헬퍼 (useCallback으로 최적화)
  const getRoleDisplay = useCallback(() => {
    const roleText = isAdmin ? t('common.admin') : t('common.team');
    if (userDepartmentName) {
      return `${roleText} | ${userDepartmentName}`;
    }
    return roleText;
  }, [isAdmin, userDepartmentName, t]);

  const openSubscriptionDialog = useCallback(async () => {
    if (!user?.companyId) return;
    setSubscriptionDialogOpen(true);
    setIsLoadingSubscription(true);
    try {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('*, plans(*)')
        .eq('company_id', user.companyId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let plan: any = null;
      if (sub && (sub as any).plans) {
        plan = (sub as any).plans;
      } else {
        const { data: freePlan } = await supabase
          .from('plans')
          .select('*')
          .eq('name', 'free')
          .single();
        plan = freePlan;
      }

      const { count: memberCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', user.companyId);

      const { count: docCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', user.companyId)
        .is('deleted_at', null);

      const { count: deptCount } = await supabase
        .from('departments')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', user.companyId);

      const subRow = sub as unknown as {
        id?: string;
        status?: string;
        billing_cycle?: string;
        payment_provider?: string | null;
        current_period_end?: string | null;
        canceled_at?: string | null;
        card_company?: string | null;
        card_number?: string | null;
        monthly_amount?: number | null;
      } | null;

      setSubscriptionInfo({
        planName: plan?.name || 'free',
        displayName: plan?.display_name || t('subscription.free'),
        maxMembers: plan?.max_members ?? null,
        maxDocuments: plan?.max_documents ?? null,
        maxDepartments: plan?.max_departments ?? null,
        maxStorageMb: plan?.max_storage_mb ?? null,
        maxAiQueries: plan?.max_ai_queries_monthly ?? null,
        currentMembers: memberCount ?? 0,
        currentDocuments: docCount ?? 0,
        currentDepartments: deptCount ?? 0,
        status: subRow?.status || 'free',
        billingCycle: subRow?.billing_cycle || 'monthly',
        subscriptionId: subRow?.id ?? null,
        paymentProvider: subRow?.payment_provider ?? null,
        currentPeriodEnd: subRow?.current_period_end ?? null,
        canceledAt: subRow?.canceled_at ?? null,
        cardCompany: subRow?.card_company ?? null,
        cardNumber: subRow?.card_number ?? null,
        monthlyAmount: subRow?.monthly_amount ?? null,
      });
    } catch (err) {
      console.error('구독 정보 조회 실패:', err);
      setSubscriptionInfo(null);
    } finally {
      setIsLoadingSubscription(false);
    }
  }, [user?.companyId, t]);

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
        .is('deleted_at', null)
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
        .maybeSingle();

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
      const trimmedName = profileName.trim();
      if (!trimmedName) {
        setProfileError(t('profile.enterName'));
        setIsSavingProfile(false);
        return;
      }

      // 사용자 정보 업데이트 (회사 변경 불가 — 기존 company_id 유지)
      const { error: updateError } = await supabase
        .from('users')
        .update({
          name: trimmedName,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // 3. 비밀번호 변경 (입력된 경우, 소셜 사용자는 제외)
      if (newPassword && !isOAuthUser) {
        // 현재 비밀번호 입력 확인
        if (!currentPassword.trim()) {
          setProfileError(t('profile.currentPasswordRequired'));
          setIsSavingProfile(false);
          return;
        }

        // 현재 비밀번호 검증
        const { error: currentPasswordError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });

        if (currentPasswordError) {
          setProfileError(t('profile.currentPasswordWrong'));
          setIsSavingProfile(false);
          return;
        }

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
    { name: t('nav.trash'), href: `${basePath}/trash`, icon: Trash2 },
    { name: t('nav.qna'), href: `${basePath}/qna`, icon: HelpCircle },
    ...(isAdmin
      ? [
          {
            name: t('nav.customerService'),
            href: 'https://pf.kakao.com/_hFiPG',
            icon: FAQIcon,
            external: true,
          },
        ]
      : []),
  ];

  // 팀원: 나의 권한 데이터 미리 로드
  useEffect(() => {
    const fetchMyPermissions = async () => {
      if (!user?.id || user.role === 'admin') return;

      const perms: { departmentId: string; departmentName: string; role: Role }[] = [];

      // 1. 소속 부서 = manager
      if (user.departmentId) {
        const { data: ownDept } = await supabase
          .from('departments')
          .select('name')
          .eq('id', user.departmentId)
          .single();
        if (ownDept) {
          perms.push({ departmentId: user.departmentId, departmentName: ownDept.name, role: 'manager' });
        }
      }

      // 2. 추가 권한 부여된 부서
      const { data: permData } = await supabase
        .from('user_permissions')
        .select('department_id, role')
        .eq('user_id', user.id)
        .neq('role', 'none');

      if (permData) {
        const deptIds = permData
          .filter((p) => p.department_id !== user.departmentId)
          .map((p) => p.department_id);

        if (deptIds.length > 0) {
          const { data: depts } = await supabase
            .from('departments')
            .select('id, name')
            .in('id', deptIds);

          const deptMap = new Map(depts?.map((d) => [d.id, d.name]) || []);
          permData
            .filter((p) => p.department_id !== user.departmentId)
            .forEach((p) => {
              const name = deptMap.get(p.department_id);
              if (name) {
                perms.push({ departmentId: p.department_id, departmentName: name, role: p.role as Role });
              }
            });
        }
      }

      setMyPermissions(perms);
    };

    fetchMyPermissions();
  }, [user?.id, user?.departmentId, user?.role]);

  const getRoleBadgeClass = (role: Role) => {
    switch (role) {
      case 'manager': return 'bg-blue-100 text-blue-700';
      case 'editor': return 'bg-green-100 text-green-700';
      case 'viewer': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#0b1220]">
      {/* NFC 자동 감지 (백그라운드에서 항상 작동) */}
      <NFCAutoRedirect />
      
      <aside
        className={`fixed inset-y-0 left-0 z-40 md:z-50 w-64 bg-white dark:bg-[#0f172a] border-r dark:border-white/[0.08] transform transition-transform duration-300 flex flex-col ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isMobileMenuOpen ? 'block' : 'hidden md:block'} md:translate-x-0 ${Capacitor.isNativePlatform() ? 'sidebar-safe-area' : ''}`}
      >
        <div className="flex items-center justify-center h-16 px-4 border-b overflow-hidden">
          <button
            type="button"
            onClick={() => navigate(basePath)}
            className="flex items-center justify-center bg-white dark:bg-transparent focus:outline-none w-full"
          >
            <img
              src={logo}
              alt="TrayStorage"
              className="h-12 w-auto max-w-[200px] object-contain mx-auto dark:hidden"
            />
            <img
              src={logoDark}
              alt="TrayStorage"
              className="h-12 w-auto max-w-[200px] object-contain mx-auto hidden dark:block"
            />
          </button>
        </div>

        <div className="md:hidden px-6 pt-4 pb-2">
          <button
            type="button"
            onClick={() => navigate(basePath)}
            className="flex items-center justify-center w-full bg-white dark:bg-transparent focus:outline-none"
          >
            <img
              src={logo}
              alt="TrayStorage"
              className="h-[46px] w-auto object-contain mx-auto dark:hidden"
            />
            <img
              src={logoDark}
              alt="TrayStorage"
              className="h-[46px] w-auto object-contain mx-auto hidden dark:block"
            />
          </button>
        </div>

        <nav className="p-4 space-y-1 flex-1 min-h-0 overflow-y-auto">
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
                      ? 'text-[#1d4ed8] bg-[#eff6ff] dark:text-[#93c5fd] dark:bg-[rgba(59,130,246,0.16)]'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-[#cbd5e1] dark:hover:bg-[#1e293b]'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-[#2563eb] dark:text-[#3b82f6]' : 'text-slate-500 dark:text-[#94a3b8]'}`} />
                  {item.name}
                </a>
              ) : (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-[#1d4ed8] bg-[#eff6ff] dark:text-[#93c5fd] dark:bg-[rgba(59,130,246,0.16)]'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-[#cbd5e1] dark:hover:bg-[#1e293b]'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-[#2563eb] dark:text-[#3b82f6]' : 'text-slate-500 dark:text-[#94a3b8]'}`} />
                  {item.name}
                </Link>
              )
            );
          })}
        </nav>

        <div className={`shrink-0 ${Capacitor.isNativePlatform() ? 'sidebar-footer-safe-area' : ''}`}>
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
        <header className="md:hidden sticky top-0 z-40 border-b border-slate-200 bg-white dark:bg-[#0f172a] dark:border-white/[0.08] w-full h-[calc(4rem_+_env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] px-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="p-2 text-slate-600 shrink-0"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>

          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 relative">
              <button
                type="button"
                onClick={handleSearch}
                aria-label={t('common.search')}
                className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-[#2563eb] dark:hover:text-[#3b82f6]"
              >
                <Search className="h-4 w-4" />
              </button>
              <Input
                type="search"
                placeholder={t('header.searchPlaceholder')}
                className="w-full pl-10 bg-white dark:bg-[#0a101b] text-slate-900 dark:text-[#f1f5f9] placeholder:text-slate-400 dark:placeholder:text-[#64748b] border-slate-200 dark:border-white/[0.08] rounded-lg"
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
                <div className="fixed left-4 right-4 top-[calc(4rem+env(safe-area-inset-top)+0.25rem)] z-50 max-h-[60vh] overflow-y-auto bg-white dark:bg-[#111827] border border-[#e5e7eb] dark:border-white/[0.08] rounded-xl shadow-lg">
                  {isLoadingSuggestions ? (
                    <div className="p-4 text-center text-slate-500">{t('common.searching')}</div>
                  ) : (
                    <div className="flex flex-col">
                      {/* 관련 문서 */}
                      <div className="p-2">
                        <p className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          <FileText className="h-3 w-3" />
                          {t('header.relatedDocuments')}
                        </p>
                        {searchSuggestions.related.length > 0 ? (
                          searchSuggestions.related.map((item, idx) => (
                            <div
                              key={`related-mobile-${idx}`}
                              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-900 dark:text-slate-100 cursor-pointer hover:bg-slate-100 dark:hover:bg-[#1e293b]"
                              onClick={() => {
                                setSearchQuery(item);
                                handleSearch();
                              }}
                            >
                              <div className="w-6 h-6 rounded-md bg-[#eff6ff] dark:bg-[rgba(59,130,246,0.16)] flex items-center justify-center shrink-0">
                                <FileText className="h-3 w-3 text-[#2563eb] dark:text-[#93c5fd]" />
                              </div>
                              {item}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-400 px-2.5 py-2">
                            {t('header.noRelatedDocuments')}
                          </p>
                        )}
                      </div>

                      {/* 최근/인기 검색어 */}
                      <div className="p-2 border-t border-slate-100 dark:border-white/[0.06]">
                        {/* 최근 검색어 */}
                        {searchSuggestions.recent.length > 0 && (
                          <div className="mb-2">
                            <p className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                              <Clock className="h-3 w-3" />
                              {t('header.recentSearches')}
                            </p>
                            {searchSuggestions.recent.map((item, idx) => (
                              <div
                                key={`recent-mobile-${idx}`}
                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-900 dark:text-slate-100 cursor-pointer hover:bg-slate-100 dark:hover:bg-[#1e293b]"
                                onClick={() => {
                                  setSearchQuery(item);
                                  handleSearch();
                                }}
                              >
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                {item}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 인기 검색어 */}
                        {searchSuggestions.popular.length > 0 && (
                          <div>
                            <p className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                              <TrendingUp className="h-3 w-3" />
                              {t('header.popularSearches')}
                            </p>
                            {searchSuggestions.popular.map((item, idx) => (
                              <div
                                key={`popular-mobile-${idx}`}
                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-900 dark:text-slate-100 cursor-pointer hover:bg-slate-100 dark:hover:bg-[#1e293b]"
                                onClick={() => {
                                  setSearchQuery(item);
                                  handleSearch();
                                }}
                              >
                                <span className="w-5 h-5 rounded-md bg-[#eff6ff] dark:bg-[rgba(59,130,246,0.16)] text-[#2563eb] dark:text-[#93c5fd] flex items-center justify-center text-[10px] font-bold font-mono shrink-0">{idx + 1}</span>
                                {item}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 비어있을 때 */}
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
              className="relative bg-white hover:border-[#2563eb] border-slate-200 rounded-lg shrink-0"
              onClick={async () => {
                if (!isNotificationOpen) {
                  await requestLocalNotificationPermission();
                }
                setIsNotificationOpen((prev) => !prev);
              }}
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
              <button className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 select-none outline-none" style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
                {user?.name?.[0] || 'U'}
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
              {user?.role === 'team' && myPermissions.length > 0 && (
                <>
                  <DropdownMenuItem
                    onClick={(e) => { e.preventDefault(); setMobilePermExpanded(!mobilePermExpanded); }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <Shield className="h-4 w-4 mr-2" />
                      <span>{t('header.myPermissions')}</span>
                    </div>
                    {mobilePermExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </DropdownMenuItem>
                  {mobilePermExpanded && (
                    <div className="bg-slate-50 border-y">
                      {myPermissions.map((perm) => (
                        <DropdownMenuItem
                          key={perm.departmentId}
                          onClick={() => navigate(`${basePath}/department/${perm.departmentId}`)}
                          className="flex items-center justify-between gap-3 pl-8"
                        >
                          <span className="truncate">{perm.departmentName}</span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${getRoleBadgeClass(perm.role)}`}>
                            {ROLE_LABELS[perm.role]}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  )}
                </>
              )}
              <DropdownMenuItem
                onClick={(e) => { e.preventDefault(); setMobileLangExpanded(!mobileLangExpanded); }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center">
                  <Globe className="h-4 w-4 mr-2" />
                  <span>{t('language.settings')}</span>
                </div>
                {mobileLangExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </DropdownMenuItem>
              {mobileLangExpanded && (
                <div className="bg-slate-50 border-y">
                  <DropdownMenuItem onClick={() => changeLanguage('ko')} className="pl-8">
                    <span className={i18n.language === 'ko' ? 'font-semibold text-[#2563eb]' : ''}>
                      {t('language.korean')}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => changeLanguage('en')} className="pl-8">
                    <span className={i18n.language === 'en' ? 'font-semibold text-[#2563eb]' : ''}>
                      {t('language.english')}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => changeLanguage('ja')} className="pl-8">
                    <span className={i18n.language === 'ja' ? 'font-semibold text-[#2563eb]' : ''}>
                      {t('language.japanese')}
                    </span>
                  </DropdownMenuItem>
                </div>
              )}
              <DropdownMenuItem
                onClick={(e) => { e.preventDefault(); setMobileThemeExpanded(!mobileThemeExpanded); }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center">
                  {themeMode === 'dark' ? <Moon className="h-4 w-4 mr-2" /> : <Sun className="h-4 w-4 mr-2" />}
                  <span>{t('theme.settings')}</span>
                </div>
                {mobileThemeExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </DropdownMenuItem>
              {mobileThemeExpanded && (
                <div className="bg-slate-50 border-y">
                  <DropdownMenuItem onClick={() => setThemeMode('light')} className="pl-8">
                    <span className={themeMode === 'light' ? 'font-semibold text-[#2563eb]' : ''}>
                      {t('theme.light')}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setThemeMode('dark')} className="pl-8">
                    <span className={themeMode === 'dark' ? 'font-semibold text-[#2563eb]' : ''}>
                      {t('theme.dark')}
                    </span>
                  </DropdownMenuItem>
                </div>
              )}
              <DropdownMenuItem onClick={openSubscriptionDialog}>
                <Crown className="h-4 w-4 mr-2" />
                {t('subscription.title')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                {t('common.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <header className="hidden md:flex sticky top-0 z-40 border-b border-slate-200 bg-white dark:bg-[#0f172a] dark:border-white/[0.08] w-full pt-[env(safe-area-inset-top)]">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6 w-full">
            <div className="flex items-center gap-4 flex-1">
              <div className="flex-1 flex gap-2 max-w-2xl">
                <div className="relative flex-1">
                  <Input
                    type="search"
                    placeholder={t('header.searchPlaceholder')}
                    className="bg-white dark:bg-[#0a101b] text-slate-900 dark:text-[#f1f5f9] placeholder:text-slate-400 dark:placeholder:text-[#64748b] border-slate-200 dark:border-white/[0.08] rounded-lg"
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
                    <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-[#111827] border border-[#e5e7eb] dark:border-white/[0.08] rounded-xl shadow-lg overflow-hidden w-[600px]">
                      {isLoadingSuggestions ? (
                        <div className="p-4 text-center text-slate-500">{t('common.searching')}</div>
                      ) : (
                        <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-white/[0.06]">
                          {/* 좌측: 관련 문서 */}
                          <div className="p-2 max-h-80 overflow-y-auto">
                            <p className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                              <FileText className="h-3 w-3" />
                              {t('header.relatedDocuments')}
                            </p>
                            {searchSuggestions.related.length > 0 ? (
                              searchSuggestions.related.map((item, idx) => (
                                <div
                                  key={`related-${idx}`}
                                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-900 dark:text-slate-100 cursor-pointer hover:bg-slate-100 dark:hover:bg-[#1e293b]"
                                  onClick={() => {
                                    setSearchQuery(item);
                                    handleSearch();
                                  }}
                                >
                                  <div className="w-6 h-6 rounded-md bg-[#eff6ff] dark:bg-[rgba(59,130,246,0.16)] flex items-center justify-center shrink-0">
                                    <FileText className="h-3 w-3 text-[#2563eb] dark:text-[#93c5fd]" />
                                  </div>
                                  {item}
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-slate-400 px-2.5 py-2">
                                {t('header.noRelatedDocuments')}
                              </p>
                            )}
                          </div>

                          {/* 우측: 최근/인기 검색어 */}
                          <div className="p-2 max-h-80 overflow-y-auto">
                            {/* 최근 검색어 */}
                            {searchSuggestions.recent.length > 0 && (
                              <div className="mb-2">
                                <p className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                  <Clock className="h-3 w-3" />
                                  {t('header.recentSearches')}
                                </p>
                                {searchSuggestions.recent.map((item, idx) => (
                                  <div
                                    key={`recent-${idx}`}
                                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-900 dark:text-slate-100 cursor-pointer hover:bg-slate-100 dark:hover:bg-[#1e293b]"
                                    onClick={() => {
                                      setSearchQuery(item);
                                      handleSearch();
                                    }}
                                  >
                                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                                    {item}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* 인기 검색어 */}
                            {searchSuggestions.popular.length > 0 && (
                              <div>
                                <p className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                  <TrendingUp className="h-3 w-3" />
                                  {t('header.popularSearches')}
                                </p>
                                {searchSuggestions.popular.map((item, idx) => (
                                  <div
                                    key={`popular-${idx}`}
                                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-900 dark:text-slate-100 cursor-pointer hover:bg-slate-100 dark:hover:bg-[#1e293b]"
                                    onClick={() => {
                                      setSearchQuery(item);
                                      handleSearch();
                                    }}
                                  >
                                    <span className="w-5 h-5 rounded-md bg-[#eff6ff] dark:bg-[rgba(59,130,246,0.16)] text-[#2563eb] dark:text-[#93c5fd] flex items-center justify-center text-[10px] font-bold font-mono shrink-0">{idx + 1}</span>
                                    {item}
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
                  className="bg-white hover:border-[#2563eb] border-slate-200 rounded-lg"
                  onClick={handleSearch}
                >
                  <img src={searchIcon} alt={t('common.search')} className="h-7 w-7 block object-contain" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="relative bg-white hover:border-[#2563eb] border-slate-200 rounded-lg"
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
                  <button className="flex items-center gap-2.5 hover:bg-slate-50 rounded-xl px-2 py-1.5 transition-colors outline-none">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 select-none" style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
                      {user?.name?.[0] || 'U'}
                    </div>
                    <div className="text-left leading-tight">
                      <div className="text-sm font-semibold text-slate-900">{user?.name}</div>
                      <div className="text-[11px] text-slate-500">{isAdmin ? t('common.admin') : t('common.team')}</div>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
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
                  {user?.role === 'team' && myPermissions.length > 0 && (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Shield className="h-4 w-4 mr-2" />
                        <span>{t('header.myPermissions')}</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="min-w-[200px]">
                        {myPermissions.map((perm) => (
                          <DropdownMenuItem
                            key={perm.departmentId}
                            onClick={() => navigate(`${basePath}/department/${perm.departmentId}`)}
                            className="flex items-center justify-between gap-3"
                          >
                            <span className="truncate">{perm.departmentName}</span>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${getRoleBadgeClass(perm.role)}`}>
                              {ROLE_LABELS[perm.role]}
                            </span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  )}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Globe className="h-4 w-4 mr-2" />
                      <span>{t('language.settings')}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuRadioGroup value={i18n.language} onValueChange={changeLanguage}>
                        <DropdownMenuRadioItem value="ko">{t('language.korean')}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="en">{t('language.english')}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="ja">{t('language.japanese')}</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      {themeMode === 'dark' ? <Moon className="h-4 w-4 mr-2" /> : <Sun className="h-4 w-4 mr-2" />}
                      <span>{t('theme.settings')}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuRadioGroup value={themeMode} onValueChange={(v) => setThemeMode(v as 'light' | 'dark')}>
                        <DropdownMenuRadioItem value="light">{t('theme.light')}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="dark">{t('theme.dark')}</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuItem onClick={openSubscriptionDialog}>
                    <Crown className="h-4 w-4 mr-2" />
                    {t('subscription.title')}
                  </DropdownMenuItem>
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

        <main className="flex-1 overflow-auto w-full flex flex-col">
          <div className={`flex-1 max-w-7xl w-full mx-auto px-4 lg:px-6 py-4 lg:py-6 ${Capacitor.isNativePlatform() ? 'main-content-safe-area' : ''}`}>
            {children}
          </div>
          <SiteFooter />
        </main>
      </div>

      {isNotificationOpen && (
        <div className="fixed top-20 right-4 z-50 w-80 bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] rounded-[10px] shadow-lg">
          <div className="flex items-center justify-between px-3 py-2 border-b bg-white dark:bg-[#111827] rounded-t-[10px]">
            <span className="text-sm font-semibold text-slate-900">{t('header.notifications')}</span>
            <button
              type="button"
              className="text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded px-2 py-1"
              onClick={() => setIsNotificationOpen(false)}
            >
              {t('common.close')}
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto overscroll-contain bg-white rounded-b-[10px]">
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
        <DialogContent variant="v1" className="max-w-[560px] flex flex-col max-h-[85vh]" hideClose>
          {showDeletionView ? (
            <>
              {/* V1 Header */}
              <div className="flex items-start gap-3 px-6 pt-5 pb-4 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-red-50">
                  <Trash2 className="h-[18px] w-[18px] text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-base font-semibold tracking-tight">
                    {t('profile.deleteAccountTitle')}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-1">
                    {t('profile.deleteAccountDesc')}
                  </DialogDescription>
                </div>
              </div>

              {/* V1 Body */}
              <div className="px-6 py-4 flex flex-col gap-3.5">
                {/* 노란 경고 박스 */}
                <div className="p-2.5 px-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed flex gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <strong className="block mb-0.5">{t('profile.deleteDataWarning', { defaultValue: '탈퇴 후 모든 데이터가 삭제됩니다.' })}</strong>
                    {t('profile.deleteDataWarningDesc', { defaultValue: '예정일에 다음 항목들이 영구 삭제되며, 복구할 수 없습니다.' })}
                  </div>
                </div>

                {/* 빨간 주의사항 박스 with list */}
                <div className="p-2.5 px-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 leading-relaxed flex gap-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-600" />
                  <div>
                    <strong className="block mb-0.5">{t('profile.deleteWarning')}</strong>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5">
                      <li>{t('profile.deleteWarning1')}</li>
                      <li>{t('profile.deleteWarning2')}</li>
                      <li>{t('profile.deleteWarning3')}</li>
                    </ul>
                  </div>
                </div>

                {/* 확인 절차 section */}
                <div className="border-t border-slate-100 pt-3.5">
                  <p className="text-xs font-semibold text-slate-500 mb-2">
                    {t('profile.confirmProcedure', { defaultValue: '확인 절차' })}
                  </p>
                  {isOAuthUser ? (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">
                        {t('profile.deleteConfirmLabel', { defaultValue: '확인을 위해 "탈퇴"를 입력하세요' })}
                      </Label>
                      <Input
                        id="deletion-confirm"
                        type="text"
                        className="h-9 rounded-md border-[#e5e7eb] text-sm"
                        placeholder={t('profile.deleteKeyword')}
                        value={deletionConfirmText}
                        onChange={(e) => setDeletionConfirmText(e.target.value)}
                        disabled={isRequestingDeletion}
                      />
                      <p className="text-xs text-slate-500">{t('profile.deleteOAuthNote')}</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">{t('profile.deletePasswordLabel')}</Label>
                      <Input
                        id="deletion-password"
                        type="password"
                        className="h-9 rounded-md border-[#e5e7eb] text-sm"
                        placeholder={t('profile.deletePasswordPlaceholder')}
                        value={deletionPassword}
                        onChange={(e) => setDeletionPassword(e.target.value)}
                        disabled={isRequestingDeletion}
                      />
                    </div>
                  )}
                </div>

                {/* 예정일 + 유예기간 박스 */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 flex flex-col gap-1.5">
                  <div className="flex justify-between">
                    <span>{t('profile.scheduledDeleteDate', { defaultValue: '예정 삭제일' })}</span>
                    <strong className="text-slate-900 font-mono">
                      {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('ko-KR')}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('profile.gracePeriod', { defaultValue: '유예 기간' })}</span>
                    <strong className="text-slate-900">14{t('common.days', { defaultValue: '일' })}</strong>
                  </div>
                </div>

                {profileError && (
                  <p className="text-xs text-red-500">{profileError}</p>
                )}
              </div>

              {/* V1 Footer */}
              <div className="flex gap-2 justify-end px-6 py-3 border-t border-slate-100 bg-[#fafbfc] rounded-b-xl">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9"
                  onClick={() => {
                    setShowDeletionView(false);
                    setDeletionPassword('');
                    setDeletionConfirmText('');
                    setProfileError(null);
                  }}
                  disabled={isRequestingDeletion}
                >
                  {t('common.back')}
                </Button>
                <Button
                  type="button"
                  variant="destructive-soft"
                  className="h-9"
                  onClick={handleRequestDeletion}
                  disabled={isRequestingDeletion || (isOAuthUser ? deletionConfirmText !== t('profile.deleteKeyword') : !deletionPassword.trim())}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  {isRequestingDeletion ? t('common.processing') : t('profile.requestDeletion')}
                </Button>
              </div>
            </>
          ) : (
            <>
              <V1ModalHeader icon={User} title={t('profile.title')} sub={t('profile.description')} />
              <V1ModalBody className="flex-1 overflow-y-auto">
                {/* 기본 정보 */}
                <div className="pt-0 mt-0 border-t-0">
                  <p className="text-xs font-semibold text-slate-500 mb-2">
                    {t('profile.basicInfo', { defaultValue: '기본 정보' })}
                  </p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">{t('profile.name')}</Label>
                        <Input
                          id="profile-name"
                          className="h-9 rounded-md border-[#e5e7eb] text-sm"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">{t('profile.email')}</Label>
                        <Input
                          id="profile-email"
                          className="h-9 rounded-md border-[#e5e7eb] text-sm bg-slate-50"
                          value={profileEmail}
                          disabled
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">{t('profile.role')}</Label>
                        <div className="h-9 flex items-center">
                          {user?.role === 'admin' ? (
                            <V1Chip variant="amber"><Shield className="h-3 w-3" />{t('role.admin')}</V1Chip>
                          ) : (
                            <V1Chip variant="blue">{t('role.team')}</V1Chip>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">{t('profile.department')}</Label>
                        <Input
                          className="h-9 rounded-md border-[#e5e7eb] text-sm bg-slate-50"
                          value={userDepartmentName || t('common.noDepartment')}
                          disabled
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 회사 정보 (읽기 전용) */}
                <div className="pt-3.5 mt-3.5 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 mb-2">
                    {t('profile.companyInfo')}
                  </p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">{t('profile.companyCode')}</Label>
                        <Input
                          className="h-9 rounded-md border-[#e5e7eb] text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
                          value={profileCompanyCode}
                          disabled
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">{t('profile.companyName')}</Label>
                        <Input
                          className="h-9 rounded-md border-[#e5e7eb] text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
                          value={profileCompanyName}
                          disabled
                        />
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">{t('profile.companyChangeContact')}</p>
                  </div>
                </div>

                {/* 비밀번호 변경 (OAuth 사용자 제외) */}
                {!isOAuthUser && (
                  <div className="pt-3.5 mt-3.5 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 mb-2">
                      {t('profile.passwordChange')}
                    </p>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">{t('profile.currentPassword')}</Label>
                        <Input
                          id="current-password"
                          type="password"
                          className="h-9 rounded-md border-[#e5e7eb] text-sm"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-sm font-medium">{t('profile.newPassword')}</Label>
                          <Input
                            id="new-password"
                            type="password"
                            className="h-9 rounded-md border-[#e5e7eb] text-sm"
                            placeholder={t('profile.newPasswordPlaceholder')}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm font-medium">{t('profile.confirmPassword')}</Label>
                          <Input
                            id="confirm-password"
                            type="password"
                            className="h-9 rounded-md border-[#e5e7eb] text-sm"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                          />
                        </div>
                      </div>
                      {newPasswordValidation && !newPasswordValidation.isValid && newPassword && (
                        <p className="text-xs text-red-500">⚠️ {newPasswordValidation.errors.join(' / ')}</p>
                      )}
                      <p className="text-xs text-slate-500">{t('profile.passwordHint', { defaultValue: '영문, 숫자, 특수문자 포함 8자 이상' })}</p>
                    </div>
                  </div>
                )}

                {/* 계정 삭제 */}
                <div className="pt-3.5 mt-3.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileError(null);
                      setShowDeletionView(true);
                    }}
                    className="text-red-500 hover:text-red-600 text-xs font-medium flex items-center gap-1.5"
                  >
                    <Trash2 className="h-3 w-3" />{t('profile.deleteAccount')}
                  </button>
                </div>

                {profileError && (
                  <p className="text-xs text-red-500 mt-2">{profileError}</p>
                )}
              </V1ModalBody>
              <V1ModalFooter>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9"
                  onClick={() => setProfileDialogOpen(false)}
                  disabled={isSavingProfile}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="button"
                  className="h-9"
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                >
                  {isSavingProfile ? t('common.saving') : t('common.save')}
                </Button>
              </V1ModalFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={subscriptionDialogOpen} onOpenChange={(open) => { setSubscriptionDialogOpen(open); if (!open) { setSelectedPlan(null); setBasicAgreed(false); setBasicMembers('3'); setProMembers('5'); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedPlan ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  {selectedPlan === 'basic' && t('subscription.basic')}
                  {selectedPlan === 'pro' && t('subscription.pro')}
                  {selectedPlan === 'enterprise' && t('subscription.enterprise')}
                  {' '}{t('subscription.planDetail')}
                </DialogTitle>
                <DialogDescription>{t('subscription.planDetailDesc')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {selectedPlan === 'basic' && (
                  <div className="space-y-3">
                    <div className="p-4 bg-slate-50 rounded-lg border">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-lg font-bold">{t('subscription.basic')}</span>
                        <span className="text-2xl font-bold text-[#2563eb]">₩6,600<span className="text-sm font-normal text-slate-500">{t('subscription.perPersonMonth')}</span></span>
                      </div>
                      <ul className="space-y-2 text-sm text-slate-700">
                        <li className="flex items-center gap-2">✓ {t('subscription.basicMemberLimit')}</li>
                        <li className="flex items-center gap-2">✓ {t('subscription.documents')} 200</li>
                        <li className="flex items-center gap-2">✓ {t('subscription.departments')} 2</li>
                        <li className="flex items-center gap-2">✓ {t('subscription.storage')} 2GB</li>
                        <li className="flex items-center gap-2 text-slate-400">✗ AI {t('chatbot.title')}</li>
                        <li className="flex items-center gap-2 text-slate-400">✗ NFC</li>
                      </ul>
                    </div>
                    {/* 주문 정보 — 인원수 입력 + 결제수단 + 월 합계 */}
                    <div className="space-y-2">
                      <Label htmlFor="basic-members">{t('subscription.memberCountLabel')}</Label>
                      <Input
                        id="basic-members"
                        type="number"
                        min={1}
                        max={BASIC_MAX_MEMBERS}
                        value={basicMembers}
                        onChange={(e) => setBasicMembers(e.target.value)}
                      />
                      {parsedBasicMembers > BASIC_MAX_MEMBERS && (
                        <p className="text-xs text-red-500">{t('subscription.basicMemberLimit')}</p>
                      )}
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg border space-y-2">
                      <div className="space-y-2">
                        <Label htmlFor="basic-customer-phone" className="text-sm text-slate-600">
                          {t('subscription.phoneLabel')}
                        </Label>
                        <Input
                          id="basic-customer-phone"
                          type="tel"
                          placeholder="010-1234-5678"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-sm font-medium text-slate-700">{t('subscription.monthlyTotal')}</span>
                        <span className="text-xl font-bold text-[#2563eb]">
                          ₩{(parsedBasicMembers * BASIC_PRICE_PER_MEMBER).toLocaleString()}
                          <span className="text-sm font-normal text-slate-500">{t('subscription.perMonth')}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="basic-agree-terms"
                        checked={basicAgreed}
                        onCheckedChange={(checked) => setBasicAgreed(checked === true)}
                        className="mt-0.5"
                      />
                      <Label htmlFor="basic-agree-terms" className="text-sm text-slate-700 leading-snug cursor-pointer">
                        {t('subscription.agreeTerms')}
                      </Label>
                    </div>
                  </div>
                )}
                {selectedPlan === 'pro' && (
                  <div className="space-y-3">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-lg font-bold">{t('subscription.pro')}</span>
                        <span className="text-2xl font-bold text-[#2563eb]">₩15,000<span className="text-sm font-normal text-slate-500">{t('subscription.perPersonMonth')}</span></span>
                      </div>
                      <ul className="space-y-2 text-sm text-slate-700">
                        <li className="flex items-center gap-2">✓ {t('subscription.customMemberCount')}</li>
                        <li className="flex items-center gap-2">✓ {t('subscription.documents')} 1,000</li>
                        <li className="flex items-center gap-2">✓ {t('subscription.departments')} 10</li>
                        <li className="flex items-center gap-2">✓ {t('subscription.storage')} 10GB</li>
                        <li className="flex items-center gap-2">✓ AI {t('chatbot.title')}</li>
                        <li className="flex items-center gap-2">✓ NFC</li>
                        <li className="flex items-center gap-2">✓ {t('subscription.vectorSearch')}</li>
                        <li className="flex items-center gap-2">✓ {t('subscription.advancedStats')}</li>
                      </ul>
                    </div>
                    {/* 주문 정보 — 인원수 입력 + 결제수단 + 월 합계 */}
                    <div className="space-y-2">
                      <Label htmlFor="pro-members">{t('subscription.memberCountLabel')}</Label>
                      <Input
                        id="pro-members"
                        type="number"
                        min={1}
                        value={proMembers}
                        onChange={(e) => setProMembers(e.target.value)}
                      />
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg border space-y-2">
                      <div className="space-y-2">
                        <Label htmlFor="pro-customer-phone" className="text-sm text-slate-600">
                          {t('subscription.phoneLabel')}
                        </Label>
                        <Input
                          id="pro-customer-phone"
                          type="tel"
                          placeholder="010-1234-5678"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-sm font-medium text-slate-700">{t('subscription.monthlyTotal')}</span>
                        <span className="text-xl font-bold text-[#2563eb]">
                          ₩{(parsedProMembers * PRO_PRICE_PER_MEMBER).toLocaleString()}
                          <span className="text-sm font-normal text-slate-500">{t('subscription.perMonth')}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="pro-agree-terms"
                        checked={basicAgreed}
                        onCheckedChange={(checked) => setBasicAgreed(checked === true)}
                        className="mt-0.5"
                      />
                      <Label htmlFor="pro-agree-terms" className="text-sm text-slate-700 leading-snug cursor-pointer">
                        {t('subscription.agreeTerms')}
                      </Label>
                    </div>
                  </div>
                )}
                {selectedPlan === 'enterprise' && (
                  <div className="space-y-3">
                    <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-lg font-bold">{t('subscription.enterprise')}</span>
                        <span className="text-xl font-bold text-indigo-600">{t('subscription.contact')}</span>
                      </div>
                      <ul className="space-y-2 text-sm text-slate-700">
                        <li className="flex items-center gap-2">✓ {t('subscription.members')} {t('subscription.unlimited')}</li>
                        <li className="flex items-center gap-2">✓ {t('subscription.documents')} {t('subscription.unlimited')}</li>
                        <li className="flex items-center gap-2">✓ {t('subscription.departments')} {t('subscription.unlimited')}</li>
                        <li className="flex items-center gap-2">✓ {t('subscription.storage')} {t('subscription.unlimited')}</li>
                        <li className="flex items-center gap-2">✓ AI {t('chatbot.title')}</li>
                        <li className="flex items-center gap-2">✓ NFC</li>
                        <li className="flex items-center gap-2">✓ API {t('subscription.access')}</li>
                        <li className="flex items-center gap-2">✓ {t('subscription.auditLog')}</li>
                        <li className="flex items-center gap-2">✓ {t('subscription.customBranding')}</li>
                      </ul>
                    </div>
                  </div>
                )}
                {selectedPlan === 'enterprise' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 text-center">
                    🚧 {t('subscription.paymentNotReady')}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setSelectedPlan(null)}>
                    {t('common.back')}
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                    disabled={
                      (selectedPlan !== 'basic' && selectedPlan !== 'pro') ||
                      (selectedPlan === 'basic' &&
                        (parsedBasicMembers < 1 || parsedBasicMembers > BASIC_MAX_MEMBERS)) ||
                      (selectedPlan === 'pro' && parsedProMembers < 1) ||
                      !basicAgreed ||
                      isRequestingPayment
                    }
                    onClick={() => handlePlanSubscribe(selectedPlan === 'pro' ? 'pro' : 'basic')}
                  >
                    {isRequestingPayment ? t('common.loading') : t('subscription.pay')}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  {t('subscription.title')}
                </DialogTitle>
                <DialogDescription>{t('subscription.description')}</DialogDescription>
              </DialogHeader>
              {isLoadingSubscription ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563eb]" />
                </div>
              ) : subscriptionInfo ? (
                <div className="space-y-5">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600">{t('subscription.currentPlan')}</span>
                      <span className="px-3 py-1 bg-[#2563eb] text-white text-sm font-semibold rounded-full">
                        {subscriptionInfo.displayName}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-3 text-center text-xs">
                      <div>
                        <p className="text-slate-500">{t('subscription.members')}</p>
                        <p className="font-semibold text-sm">{subscriptionInfo.currentMembers}/{subscriptionInfo.maxMembers ?? '∞'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">{t('subscription.documents')}</p>
                        <p className="font-semibold text-sm">{subscriptionInfo.currentDocuments}/{subscriptionInfo.maxDocuments ?? '∞'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">{t('subscription.departments')}</p>
                        <p className="font-semibold text-sm">{subscriptionInfo.currentDepartments}/{subscriptionInfo.maxDepartments ?? '∞'}</p>
                      </div>
                    </div>
                  </div>

                  {isAdmin && subscriptionInfo.status === 'active' && subscriptionInfo.planName !== 'free' && (
                    <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-slate-800">{t('billing.billingManagement')}</h4>
                        <span
                          className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                            subscriptionInfo.canceledAt
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {subscriptionInfo.canceledAt
                            ? t('billing.autoRenewCanceled')
                            : t('billing.autoRenewActive')}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        {subscriptionInfo.monthlyAmount != null && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">{t('billing.monthlyAmountLabel')}</span>
                            <span className="font-medium">
                              ₩{subscriptionInfo.monthlyAmount.toLocaleString()}
                              {t('subscription.perMonth')}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-500">{t('billing.cardLabel')}</span>
                          <span className="font-medium">
                            {subscriptionInfo.cardCompany
                              ? `${subscriptionInfo.cardCompany}${subscriptionInfo.cardNumber ? ' ' + subscriptionInfo.cardNumber : ''}`
                              : t('billing.noCard')}
                          </span>
                        </div>
                        {subscriptionInfo.currentPeriodEnd && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">{t('billing.nextBillingDate')}</span>
                            <span className="font-medium">
                              {new Date(subscriptionInfo.currentPeriodEnd).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                      {subscriptionInfo.canceledAt ? (
                        <p className="text-xs text-amber-600 text-center pt-1">
                          {t('billing.autoRenewCanceled')}
                        </p>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setCancelDialogOpen(true)}
                        >
                          {t('billing.cancelAutoRenew')}
                        </Button>
                      )}
                    </div>
                  )}

                  {isAdmin && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-slate-700">{t('subscription.planComparison')}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { name: 'free', display: t('subscription.free'), price: '0', members: '10', highlight: subscriptionInfo.planName === 'free', comingSoon: false },
                          { name: 'basic', display: t('subscription.basic'), price: '6,600', members: '3', highlight: subscriptionInfo.planName === 'basic', comingSoon: false },
                          { name: 'pro', display: t('subscription.pro'), price: '15,000', members: '10', highlight: subscriptionInfo.planName === 'pro', comingSoon: false },
                          { name: 'enterprise', display: t('subscription.enterprise'), price: '', members: '∞', highlight: subscriptionInfo.planName === 'enterprise', comingSoon: true },
                        ].map((plan) => (
                          <div
                            key={plan.name}
                            className={`relative p-3 rounded-lg border-2 text-center transition-all ${
                              plan.highlight
                                ? 'border-blue-500 bg-blue-50 shadow-sm'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            {plan.highlight && (
                              <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-[#2563eb] text-white text-[10px] font-semibold rounded-full">
                                {t('subscription.current')}
                              </span>
                            )}
                            <p className="font-semibold text-sm mt-1">{plan.display}</p>
                            <p className="text-lg font-bold text-slate-900 mt-1">
                              {plan.comingSoon ? t('subscription.comingSoon') : `₩${plan.price}`}
                            </p>
                            {!plan.comingSoon && (
                              <p className="text-[11px] text-slate-500">
                                {plan.name === 'free' ? t('subscription.perMonth') : t('subscription.perPersonMonth')}
                              </p>
                            )}
                            <div className="mt-2 pt-2 border-t text-xs text-slate-600">
                              <p>
                                {plan.name === 'basic'
                                  ? t('subscription.basicMemberLimit')
                                  : plan.name === 'pro'
                                    ? t('subscription.customMemberCount')
                                    : `${t('subscription.members')} ${plan.members}${t('subscription.personUnit')}`}
                              </p>
                            </div>
                            {!plan.highlight && plan.name !== 'free' && (
                              <Button
                                size="sm"
                                variant={plan.comingSoon ? 'outline' : 'default'}
                                className="w-full mt-2 text-xs h-7"
                                disabled={plan.comingSoon}
                                onClick={() => setSelectedPlan(plan.name)}
                              >
                                {plan.comingSoon ? t('subscription.comingSoon') : t('subscription.selectPlan')}
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-4 text-center text-sm text-slate-500">
                  {t('subscription.loadError')}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('billing.cancelConfirmTitle')}</DialogTitle>
            <DialogDescription>{t('billing.cancelConfirmDesc')}</DialogDescription>
          </DialogHeader>
          {subscriptionInfo?.currentPeriodEnd && (
            <div className="p-3 bg-slate-50 rounded-lg border text-sm flex justify-between">
              <span className="text-slate-500">{t('billing.nextBillingDate')}</span>
              <span className="font-medium">
                {new Date(subscriptionInfo.currentPeriodEnd).toLocaleDateString()}
              </span>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={isCanceling}
              onClick={() => setCancelDialogOpen(false)}
            >
              {t('billing.cancelKeep')}
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={isCanceling}
              onClick={handleCancelSubscription}
            >
              {isCanceling ? t('common.loading') : t('billing.cancelConfirmBtn')}
            </Button>
          </div>
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
