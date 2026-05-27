import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// Card components removed – signup uses V1-styled plain div
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import logo from '@/assets/logo.png';
import rootLogo from '../../assets/logo.png';
import googleLogo from '@/assets/google.png';
import appleLogo from '@/assets/apple.png';
import kakaoLogo from '@/assets/kakao.png';
import naverLogo from '@/assets/naver.png';
import { validatePasswordClient, PasswordValidation } from '@/lib/password-validator';
import { TermsOfServiceContent } from '@/components/terms/TermsOfService';
import { PrivacyPolicyContent } from '@/components/terms/PrivacyPolicy';

export function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState(() => {
    const saved = localStorage.getItem('saved_login_email');
    return saved || '';
  });
  const [password, setPassword] = useState('');
  const [rememberEmail, setRememberEmail] = useState(() => {
    return localStorage.getItem('remember_email') === 'true';
  });
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupRole, setSignupRole] = useState<'admin' | 'team'>('team');
  const socialLogoBaseClass = 'h-5 w-5 object-contain';
  const socialLogoClassByProvider: Record<'google' | 'apple' | 'kakao' | 'naver', string> = {
    google: `${socialLogoBaseClass} scale-[1.08]`,
    apple: `${socialLogoBaseClass} scale-[1.18]`,
    kakao: `${socialLogoBaseClass} scale-[1]`,
    naver: `${socialLogoBaseClass} scale-[1]`,
  };
  const [signupForm, setSignupForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    departmentId: '',
    companyCode: '',
    companyName: '',
  });
  const navigate = useNavigate();
  const [termsPopupType, setTermsPopupType] = useState<'tos' | 'privacy' | null>(null);
  const [agreeAll, setAgreeAll] = useState(false);
  const [agreeAge, setAgreeAge] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation | null>(null);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // 탈퇴 신청 경고 관련 상태
  const [deletionWarningOpen, setDeletionWarningOpen] = useState(false);
  const [deletionInfo, setDeletionInfo] = useState<{
    userId: string;
    scheduledDate: string;
    remainingDays: number;
  } | null>(null);
  const [pendingLoginRole, setPendingLoginRole] = useState<'admin' | 'team' | null>(null);
  const [isCancellingDeletion, setIsCancellingDeletion] = useState(false);

  const [adminPhone, setAdminPhone] = useState('');
  const [adminOtp, setAdminOtp] = useState('');
  const [adminOtpSent, setAdminOtpSent] = useState(false);
  const [adminOtpVerified, setAdminOtpVerified] = useState(false);
  const [isSendingAdminOtp, setIsSendingAdminOtp] = useState(false);
  const [isVerifyingAdminOtp, setIsVerifyingAdminOtp] = useState(false);

  // 회원가입 팝업 열릴 때 배경 스크롤 잠금
  useEffect(() => {
    if (signupOpen) {
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
  }, [signupOpen]);

  // 비밀번호 실시간 검증
  useEffect(() => {
    if (signupForm.password) {
      const validation = validatePasswordClient(signupForm.password);
      setPasswordValidation(validation);
    } else {
      setPasswordValidation(null);
    }
  }, [signupForm.password]);

  const allAgreed = agreeAge && agreeTerms && agreePrivacy;

  const handleAgreeAll = (checked: boolean) => {
    setAgreeAll(checked);
    setAgreeAge(checked);
    setAgreeTerms(checked);
    setAgreePrivacy(checked);
  };

  useEffect(() => {
    setAgreeAll(agreeAge && agreeTerms && agreePrivacy);
  }, [agreeAge, agreeTerms, agreePrivacy]);

  const { login, signup, isLoading, error, clearError, redirectAfterLogin, setRedirectAfterLogin } =
    useAuthStore();

  const handleGoogleLogin = async () => {
    console.log('🔵 Google 로그인 시작');
    try {
      const redirectTo = Capacitor.isNativePlatform()
        ? 'com.infocreative.traystorageconnect://login-callback'
        : `${window.location.origin}`;

      console.log('🔵 signInWithOAuth 호출 전');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });

      console.log('🔵 signInWithOAuth 응답:', { data, error });

      if (error) {
        console.error('❌ Google 로그인 실패:', error);
        toast({
          title: t('login.googleLoginFailed'),
          description: error.message || t('login.tryAgain'),
          variant: 'destructive',
        });
      } else {
        console.log('✅ Google 로그인 성공, 리디렉션 시작');
      }
    } catch (error: any) {
      console.error('❌ Google 로그인 예외:', error);
      toast({
        title: t('login.googleLoginError'),
        description: error?.message || t('login.googleLoginErrorDesc'),
        variant: 'destructive',
      });
    }
  };

  const handleKakaoLogin = async () => {
    console.log('🟡 Kakao 로그인 시작');
    console.log('🟡 Supabase 객체:', supabase);
    console.log('🟡 window.location.origin:', window.location.origin);

    try {
      const redirectTo = Capacitor.isNativePlatform()
        ? 'com.infocreative.traystorageconnect://login-callback'
        : `${window.location.origin}`;

      console.log('🟡 signInWithOAuth 호출 전');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo,
        },
      });

      console.log('🟡 signInWithOAuth 응답:', { data, error });

      if (error) {
        console.error('❌ Kakao 로그인 실패:', error);
        toast({
          title: t('login.kakaoLoginFailed'),
          description: error.message || t('login.tryAgain'),
          variant: 'destructive',
        });
      } else {
        console.log('✅ Kakao 로그인 성공, 리디렉션 시작');
      }
    } catch (error: any) {
      console.error('❌ Kakao 로그인 예외:', error);
      toast({
        title: t('login.kakaoLoginError'),
        description: error?.message || t('login.kakaoLoginErrorDesc'),
        variant: 'destructive',
      });
    }
  };

  const handleNaverLogin = async () => {
    console.log('🟢 Naver 커스텀 로그인 시작');

    try {
      const clientId = import.meta.env.VITE_NAVER_CLIENT_ID;
      const callbackUrl = import.meta.env.VITE_NAVER_CALLBACK_URL || `${window.location.origin}/auth/naver/callback`;

      if (!clientId) {
        throw new Error('Naver OAuth 설정이 없습니다');
      }

      // State 생성 (CSRF 방지)
      const state = crypto.randomUUID();
      sessionStorage.setItem('naver_oauth_state', state);

      // 네이버 OAuth 인증 URL 생성
      const naverAuthUrl = 'https://nid.naver.com/oauth2.0/authorize?' +
        new URLSearchParams({
          response_type: 'code',
          client_id: clientId,
          redirect_uri: callbackUrl,
          state: state,
        }).toString();

      console.log('🟢 네이버 로그인 페이지로 리다이렉트');

      // 네이버 로그인 페이지로 이동
      window.location.href = naverAuthUrl;
    } catch (error: any) {
      console.error('❌ Naver 로그인 오류:', error);
      toast({
        title: t('login.naverLoginError'),
        description: error?.message || t('login.naverLoginErrorDesc'),
        variant: 'destructive',
      });
    }
  };

  const handleAppleLogin = async () => {
    console.log('🍎 Apple 로그인 시작');
    console.log('🍎 Supabase 객체:', supabase);
    console.log('🍎 window.location.origin:', window.location.origin);

    try {
      const redirectTo = Capacitor.isNativePlatform()
        ? 'com.infocreative.traystorageconnect://login-callback'
        : `${window.location.origin}`;

      console.log('🍎 signInWithOAuth 호출 전');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo,
        },
      });

      console.log('🍎 signInWithOAuth 응답:', { data, error });

      if (error) {
        console.error('❌ Apple 로그인 실패:', error);
        toast({
          title: t('login.appleLoginFailed'),
          description: error.message || t('login.tryAgain'),
          variant: 'destructive',
        });
      } else {
        console.log('✅ Apple 로그인 성공, 리디렉션 시작');
      }
    } catch (error: any) {
      console.error('❌ Apple 로그인 예외:', error);
      toast({
        title: t('login.appleLoginError'),
        description: error?.message || t('login.appleLoginErrorDesc'),
        variant: 'destructive',
      });
    }
  };

  const resetSignupForm = () => {
    setSignupForm({
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      departmentId: '',
      companyCode: '',
      companyName: '',
    });

    setAdminPhone('');
    setAdminOtp('');
    setAdminOtpSent(false);
    setAdminOtpVerified(false);
    setIsSendingAdminOtp(false);
    setIsVerifyingAdminOtp(false);
  };

  const normalizePhone = (raw: string) => (raw || '').replace(/\D/g, '');

  const handleSendAdminOtp = async () => {
    const phone = normalizePhone(adminPhone);

    if (!phone || phone.length < 10 || phone.length > 11) {
      toast({
        title: t('signup.phoneInput'),
        description: t('signup.phoneInputDesc'),
        variant: 'destructive',
      });
      return;
    }

    setIsSendingAdminOtp(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('send-phone-otp', {
        body: { phone, purpose: 'admin_signup' },
      });

      console.log('send-phone-otp response:', { data, fnError });

      if (fnError) {
        let errMsg = fnError.message || t('signup.smsSendFailed');
        try {
          const errBody = await fnError.context?.json();
          if (errBody?.error) errMsg = errBody.error;
        } catch {}
        throw new Error(errMsg);
      }

      if (!data?.success) {
        throw new Error(data?.error || data?.message || t('signup.smsSendFailed'));
      }

      setAdminOtpSent(true);
      setAdminOtpVerified(false);
      setAdminOtp('');

      toast({
        title: t('signup.otpSent'),
        description: t('signup.otpSentDesc'),
      });
    } catch (err: any) {
      toast({
        title: t('signup.otpSendFailed'),
        description: err?.message || t('signup.otpSendFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsSendingAdminOtp(false);
    }
  };

  const handleVerifyAdminOtp = async () => {
    const phone = normalizePhone(adminPhone);
    const code = (adminOtp || '').trim();

    if (!phone || phone.length < 10 || phone.length > 11) {
      toast({
        title: t('signup.phoneInput'),
        description: t('signup.phoneCheckDesc'),
        variant: 'destructive',
      });
      return;
    }

    if (!adminOtpSent) {
      toast({
        title: t('signup.sendOtpFirst'),
        description: t('signup.sendOtpFirstDesc'),
        variant: 'destructive',
      });
      return;
    }

    if (!code) {
      toast({
        title: t('signup.enterOtp'),
        description: t('signup.enterOtpDesc'),
        variant: 'destructive',
      });
      return;
    }

    setIsVerifyingAdminOtp(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('verify-phone-otp', {
        body: { phone, code, purpose: 'admin_signup' },
      });

      if (fnError) {
        throw new Error(fnError.message || t('signup.verifyFailed'));
      }

      if (!data?.success) {
        throw new Error(data?.error || t('signup.verifyFailed'));
      }

      setAdminOtpVerified(true);

      toast({
        title: t('signup.phoneVerifyComplete'),
        description: t('signup.phoneVerifyCompleteDesc'),
      });
    } catch (err: any) {
      toast({
        title: t('signup.verifyFailed'),
        description: err?.message || t('signup.verifyFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsVerifyingAdminOtp(false);
    }
  };

  const handleLogin = async (role: 'admin' | 'team') => {
    clearError();

    // 이메일 저장 처리
    if (rememberEmail) {
      localStorage.setItem('saved_login_email', email);
      localStorage.setItem('remember_email', 'true');
    } else {
      localStorage.removeItem('saved_login_email');
      localStorage.removeItem('remember_email');
    }

    // 먼저 로그인 시도
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      toast({
        title: t('login.loginFailed'),
        description: authError.message || t('login.tryAgain'),
        variant: 'destructive',
      });
      return;
    }

    if (!authData.user) {
      toast({
        title: t('login.loginFailed'),
        description: t('login.userNotFound'),
        variant: 'destructive',
      });
      return;
    }

    // 탈퇴 신청 여부 확인
    const { data: deletionRequest } = await supabase
      .from('account_deletion_requests')
      .select('id, scheduled_deletion_at')
      .eq('user_id', authData.user.id)
      .eq('status', 'pending')
      .single();

    if (deletionRequest) {
      // 탈퇴 신청이 있으면 경고 다이얼로그 표시
      const scheduledDate = new Date(deletionRequest.scheduled_deletion_at);
      const now = new Date();
      const remainingDays = Math.ceil((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      setDeletionInfo({
        userId: authData.user.id,
        scheduledDate: scheduledDate.toLocaleDateString('ko-KR'),
        remainingDays: Math.max(0, remainingDays),
      });
      setPendingLoginRole(role);
      setDeletionWarningOpen(true);
      return;
    }

    // 탈퇴 신청이 없으면 정상 로그인 진행
    await proceedWithLogin(role);
  };

  const proceedWithLogin = async (role: 'admin' | 'team') => {
    const result = await login(email, password, role);

    if (result.success) {
      toast({
        title: t('login.loginSuccess'),
        description: t('login.welcome'),
      });

      const basePath = role === 'admin' ? '/admin' : '/team';

      if (redirectAfterLogin) {
        navigate(redirectAfterLogin, { replace: true });
        setRedirectAfterLogin(null);
      } else {
        navigate(basePath);
      }
    } else {
      toast({
        title: t('login.loginFailed'),
        description: result.error || t('login.tryAgain'),
        variant: 'destructive',
      });
    }
  };

  const handleCancelDeletion = async () => {
    if (!deletionInfo) return;

    setIsCancellingDeletion(true);

    try {
      const { error } = await supabase
        .from('account_deletion_requests')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('user_id', deletionInfo.userId)
        .eq('status', 'pending');

      if (error) throw error;

      toast({
        title: t('deletion.cancelComplete'),
        description: t('deletion.cancelCompleteDesc'),
      });

      setDeletionWarningOpen(false);
      setDeletionInfo(null);

      // 탈퇴 취소 후 로그인 진행
      if (pendingLoginRole) {
        await proceedWithLogin(pendingLoginRole);
      }
    } catch (error) {
      console.error('탈퇴 취소 실패:', error);
      toast({
        title: t('deletion.cancelFailed'),
        description: t('common.tryAgain'),
        variant: 'destructive',
      });
    } finally {
      setIsCancellingDeletion(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail.trim()) {
      toast({
        title: t('resetPassword.emailInput'),
        description: t('resetPassword.enterEmail'),
        variant: 'destructive',
      });
      return;
    }

    setIsResetting(true);

    try {
      // Edge Function 호출
      const { data, error: fnError } = await supabase.functions.invoke('check-reset-password', {
        body: { email: resetEmail },
      });

      if (fnError) {
        throw new Error(fnError.message || t('resetPassword.requestFailed'));
      }

      if (!data.success) {
        // OAuth 사용자인 경우
        if (data.isOAuth) {
          toast({
            title: t('resetPassword.oauthAccount'),
            description: data.message,
            variant: 'destructive',
          });
        } else {
          toast({
            title: t('resetPassword.error'),
            description: data.error || t('common.tryAgain'),
            variant: 'destructive',
          });
        }
        return;
      }

      // 성공
      toast({
        title: t('resetPassword.emailSent'),
        description: data.message,
      });

      setResetPasswordOpen(false);
      setResetEmail('');
    } catch (error: any) {
      console.error('비밀번호 재설정 오류:', error);
      toast({
        title: t('resetPassword.error'),
        description: error?.message || t('common.tryAgain'),
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleSignup = async () => {
    clearError();

    if (!signupForm.name || !signupForm.email || !signupForm.password) {
      toast({
        title: t('signup.inputError'),
        description: t('signup.fillAllFields'),
        variant: 'destructive',
      });
      return;
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      toast({
        title: t('signup.passwordMismatch'),
        description: t('signup.passwordMismatchDesc'),
        variant: 'destructive',
      });
      return;
    }

    if (signupForm.password.length < 6) {
      toast({
        title: t('signup.passwordError'),
        description: t('signup.passwordMinLength'),
        variant: 'destructive',
      });
      return;
    }

    if (signupRole === 'admin' && !signupForm.companyName.trim()) {
      toast({
        title: t('signup.enterCompanyName'),
        description: t('signup.enterCompanyNameDesc'),
        variant: 'destructive',
      });
      return;
    }

    if (signupRole === 'admin' && !signupForm.companyCode.trim()) {
      toast({
        title: t('signup.enterCompanyCode'),
        description: t('signup.enterCompanyCodeDesc'),
        variant: 'destructive',
      });
      return;
    }

    const phone = normalizePhone(adminPhone);
    if (!phone) {
      toast({
        title: t('signup.enterPhone'),
        description: signupRole === 'admin' ? t('signup.enterPhoneForAdmin') : t('signup.enterPhoneForTeam'),
        variant: 'destructive',
      });
      return;
    }

    if (!adminOtpVerified) {
      toast({
        title: t('signup.phoneVerifyNeeded'),
        description: t('signup.phoneVerifyNeededDesc'),
        variant: 'destructive',
      });
      return;
    }

    // 팀원 가입 시 회사 코드가 있으면 해당 회사로 연결
    const companyCodeToUse = signupForm.companyCode.trim();
    // 팀원은 회사명 입력 없이 코드만으로 가입 가능 (기존 회사 참조)
    const companyNameToUse = signupRole === 'admin' ? signupForm.companyName.trim() : '';

    const result = await signup(
      signupForm.email,
      signupForm.password,
      signupForm.name,
      signupRole,
      companyCodeToUse,
      companyNameToUse,
      undefined
    );

    if (result.success) {
      toast({
        title: t('signup.signupComplete'),
        description: t('signup.signupCompleteDesc'),
      });
      setSignupOpen(false);
      resetSignupForm();
    } else {
      toast({
        title: t('signup.signupFailed'),
        description: result.error || t('common.tryAgain'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen w-screen flex bg-white dark:bg-[#0b1220] overflow-x-hidden">
      {/* 좌측 브랜드 패널 — 태블릿/데스크탑만 표시 */}
      <div
        className="hidden md:flex w-[44%] shrink-0 relative flex-col justify-between p-10 lg:p-12 overflow-hidden bg-black"
      >
        <video
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          src="/login-bg.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="absolute inset-0 bg-black/40 pointer-events-none" />
        <div className="relative z-10 flex items-end gap-2.5">
          <img src={rootLogo} alt={t('login.logoAlt')} className="h-12 w-auto object-contain" />
          <span className="text-[11px] font-bold text-white bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-[6px] tracking-wide -translate-y-[25%]">BETA</span>
        </div>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-white leading-tight tracking-tight whitespace-pre-line">
            {t('login.heroHeadline')}
          </h1>
          <div className="mt-4 text-sm text-white/80 leading-relaxed max-w-sm flex flex-col gap-2">
            {t('login.heroDescription').split('\n\n').map((block: string, i: number) => (
              <p key={i} className="whitespace-pre-line m-0">{block}</p>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-[11px] text-white/70 leading-relaxed">
          {t('login.copyright')}<br />{t('login.patentNotice')}
        </div>
      </div>

      {/* 모바일 전용 — 영상 배경 + 카드 오버레이 */}
      <div className="md:hidden flex-1 relative min-h-screen flex flex-col items-center justify-center overflow-y-auto">
        <video
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          src="/login-bg.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="absolute inset-0 bg-black/50 pointer-events-none" />

        <div className="relative z-10 w-full max-w-[400px] px-5 py-10 flex flex-col items-center">
          {/* 카드 위 헤드라인 */}
          <h1 className="text-xl font-bold text-white text-center leading-tight tracking-tight mb-6 whitespace-pre-line">
            {t('login.heroHeadline')}
          </h1>

          {/* 로그인 카드 */}
          <div className="w-full bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.25)] p-6">
            {/* 카드 내 로고 */}
            <div className="flex items-center justify-center mb-5">
              <img src={logo} alt={t('login.logoAlt')} className="h-[52px] w-auto object-contain" />
              <span className="ml-2 text-[11px] font-bold text-[#2563eb] bg-[#dbeafe] px-1.5 py-0.5 rounded">BETA</span>
            </div>

            <Tabs defaultValue="admin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4 bg-slate-100 p-1 rounded-xl h-auto">
                <TabsTrigger
                  value="admin"
                  className="rounded-lg py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500 transition-all"
                >
                  {t('login.adminTab')}
                </TabsTrigger>
                <TabsTrigger
                  value="team"
                  className="rounded-lg py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500 transition-all"
                >
                  {t('login.teamTab')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="admin">
                <form onSubmit={async (e) => { e.preventDefault(); await handleLogin('admin'); }} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="m-admin-email" className="text-xs font-semibold text-slate-700">{t('login.email')}</Label>
                    <Input id="m-admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} required className="h-10 rounded-lg text-[16px]" placeholder="admin@company.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="m-admin-pw" className="text-xs font-semibold text-slate-700">{t('login.password')}</Label>
                    <Input id="m-admin-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} required className="h-10 rounded-lg text-[16px]" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={rememberEmail} onChange={(e) => setRememberEmail(e.target.checked)} className="w-4 h-4 accent-[#2563eb] rounded" />
                      <span className="text-xs text-slate-600">{t('login.rememberEmail')}</span>
                    </label>
                    <button type="button" className="text-xs text-[#2563eb] hover:text-[#1d4ed8]" onClick={() => setResetPasswordOpen(true)}>{t('login.forgotPassword')}</button>
                  </div>
                  <Button type="submit" className="w-full h-11 rounded-[10px] bg-[#2563eb] hover:bg-[#1d4ed8] font-semibold" disabled={isLoading}>
                    {isLoading ? t('login.loggingIn') : t('login.adminLogin')}
                  </Button>
                  <p className="text-xs text-center text-slate-500 mt-2">
                    {t('login.noAccount')}{' '}
                    <button type="button" className="text-[#2563eb] hover:text-[#1d4ed8] font-medium" onClick={() => { resetSignupForm(); setSignupRole('admin'); setSignupOpen(true); }}>{t('login.signup')}</button>
                  </p>
                  <div className="flex items-center gap-3 my-3"><div className="flex-1 h-px bg-[#e5e7eb]" /><span className="text-xs text-slate-400">또는</span><div className="flex-1 h-px bg-[#e5e7eb]" /></div>
                  <div className="space-y-2">
                    <button type="button" className="w-full h-10 flex items-center gap-3 px-4 bg-white border border-[#e5e7eb] rounded-[10px] hover:bg-slate-50 transition-colors" onClick={handleGoogleLogin}>
                      <span className="w-5 h-5 flex items-center justify-center shrink-0"><img src={googleLogo} alt="Google" className={socialLogoClassByProvider.google} /></span>
                      <span className="flex-1 text-sm font-medium text-slate-700 text-center">{t('login.continueWithGoogle')}</span>
                    </button>
                    <button type="button" className="w-full h-10 flex items-center gap-3 px-4 bg-white border border-[#e5e7eb] rounded-[10px] hover:bg-slate-50 transition-colors" onClick={handleAppleLogin}>
                      <span className="w-5 h-5 flex items-center justify-center shrink-0"><img src={appleLogo} alt="Apple" className={socialLogoClassByProvider.apple} /></span>
                      <span className="flex-1 text-sm font-medium text-slate-700 text-center">{t('login.continueWithApple')}</span>
                    </button>
                    <button type="button" className="w-full h-10 flex items-center gap-3 px-4 bg-white border border-[#e5e7eb] rounded-[10px] hover:bg-slate-50 transition-colors" onClick={handleKakaoLogin}>
                      <span className="w-5 h-5 flex items-center justify-center shrink-0"><img src={kakaoLogo} alt="Kakao" className={socialLogoClassByProvider.kakao} /></span>
                      <span className="flex-1 text-sm font-medium text-slate-700 text-center">{t('login.continueWithKakao')}</span>
                    </button>
                    <button type="button" className="w-full h-10 flex items-center gap-3 px-4 bg-white border border-[#e5e7eb] rounded-[10px] hover:bg-slate-50 transition-colors" onClick={handleNaverLogin}>
                      <span className="w-5 h-5 flex items-center justify-center shrink-0"><img src={naverLogo} alt="Naver" className={socialLogoClassByProvider.naver} /></span>
                      <span className="flex-1 text-sm font-medium text-slate-700 text-center">{t('login.continueWithNaver')}</span>
                    </button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="team">
                <form onSubmit={async (e) => { e.preventDefault(); await handleLogin('team'); }} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="m-team-email" className="text-xs font-semibold text-slate-700">{t('login.email')}</Label>
                    <Input id="m-team-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} required className="h-10 rounded-lg text-[16px]" placeholder="user@company.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="m-team-pw" className="text-xs font-semibold text-slate-700">{t('login.password')}</Label>
                    <Input id="m-team-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} required className="h-10 rounded-lg text-[16px]" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={rememberEmail} onChange={(e) => setRememberEmail(e.target.checked)} className="w-4 h-4 accent-[#2563eb] rounded" />
                      <span className="text-xs text-slate-600">{t('login.rememberEmail')}</span>
                    </label>
                    <button type="button" className="text-xs text-[#2563eb] hover:text-[#1d4ed8]" onClick={() => setResetPasswordOpen(true)}>{t('login.forgotPassword')}</button>
                  </div>
                  <Button type="submit" className="w-full h-11 rounded-[10px] bg-[#2563eb] hover:bg-[#1d4ed8] font-semibold" disabled={isLoading}>
                    {isLoading ? t('login.loggingIn') : t('login.teamLogin')}
                  </Button>
                  <p className="text-xs text-center text-slate-500 mt-2">
                    {t('login.noAccount')}{' '}
                    <button type="button" className="text-[#2563eb] hover:text-[#1d4ed8] font-medium" onClick={() => { resetSignupForm(); setSignupRole('team'); setSignupOpen(true); }}>{t('login.signup')}</button>
                  </p>
                  <div className="flex items-center gap-3 my-3"><div className="flex-1 h-px bg-[#e5e7eb]" /><span className="text-xs text-slate-400">또는</span><div className="flex-1 h-px bg-[#e5e7eb]" /></div>
                  <div className="space-y-2">
                    <button type="button" className="w-full h-10 flex items-center gap-3 px-4 bg-white border border-[#e5e7eb] rounded-[10px] hover:bg-slate-50 transition-colors" onClick={handleGoogleLogin}>
                      <span className="w-5 h-5 flex items-center justify-center shrink-0"><img src={googleLogo} alt="Google" className={socialLogoClassByProvider.google} /></span>
                      <span className="flex-1 text-sm font-medium text-slate-700 text-center">{t('login.continueWithGoogle')}</span>
                    </button>
                    <button type="button" className="w-full h-10 flex items-center gap-3 px-4 bg-white border border-[#e5e7eb] rounded-[10px] hover:bg-slate-50 transition-colors" onClick={handleAppleLogin}>
                      <span className="w-5 h-5 flex items-center justify-center shrink-0"><img src={appleLogo} alt="Apple" className={socialLogoClassByProvider.apple} /></span>
                      <span className="flex-1 text-sm font-medium text-slate-700 text-center">{t('login.continueWithApple')}</span>
                    </button>
                    <button type="button" className="w-full h-10 flex items-center gap-3 px-4 bg-white border border-[#e5e7eb] rounded-[10px] hover:bg-slate-50 transition-colors" onClick={handleKakaoLogin}>
                      <span className="w-5 h-5 flex items-center justify-center shrink-0"><img src={kakaoLogo} alt="Kakao" className={socialLogoClassByProvider.kakao} /></span>
                      <span className="flex-1 text-sm font-medium text-slate-700 text-center">{t('login.continueWithKakao')}</span>
                    </button>
                    <button type="button" className="w-full h-10 flex items-center gap-3 px-4 bg-white border border-[#e5e7eb] rounded-[10px] hover:bg-slate-50 transition-colors" onClick={handleNaverLogin}>
                      <span className="w-5 h-5 flex items-center justify-center shrink-0"><img src={naverLogo} alt="Naver" className={socialLogoClassByProvider.naver} /></span>
                      <span className="flex-1 text-sm font-medium text-slate-700 text-center">{t('login.continueWithNaver')}</span>
                    </button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
            <div className="mt-5 pt-4 border-t border-[#e5e7eb] text-[10px] text-center text-slate-500 leading-relaxed whitespace-pre-line">
              {'주식회사 인포크리에이티브\n대표: 정도천\n사업자등록번호: 841-86-03004\n통신판매업신고번호: 2024-서울금천-0112호\n\n고객지원: support@traystorage.net\n도입문의 및 비즈니스 제안: support@traystorage.net\n고객지원번호: 02-333-7334\n\n서울특별시 금천구 가산디지털2로 43-14 708-709호\n(가산동, 가산한화비즈메트로2차)'}
            </div>
          </div>

          {/* 카드 아래 저작권 */}
          <div className="mt-4 text-[10px] text-center text-white/60 leading-relaxed">
            {t('login.copyright')}<br />{t('login.patentNotice')}
          </div>
        </div>
      </div>

      {/* 우측 폼 패널 — 데스크탑 전용 */}
      <div className="hidden md:flex flex-1 flex-col items-center justify-center min-h-screen overflow-y-auto p-6 sm:p-8 dark:bg-[#0b1220]">
        <div className="w-full max-w-[420px]">
          <div className="mb-6">
            <div className="mb-1.5">
              <h2 className="text-[26px] font-bold text-slate-900 tracking-tight">로그인</h2>
            </div>
            <p className="text-sm text-slate-500">TrayStorage CONNECT에 오신 것을 환영합니다.</p>
          </div>

          <Tabs defaultValue="admin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-5 bg-slate-100 p-1 rounded-xl h-auto">
              <TabsTrigger
                value="admin"
                className="rounded-lg py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500 transition-all"
              >
                {t('login.adminTab')}
              </TabsTrigger>
              <TabsTrigger
                value="team"
                className="rounded-lg py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500 transition-all"
              >
                {t('login.teamTab')}
              </TabsTrigger>
            </TabsList>
              <TabsContent value="admin">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await handleLogin('admin');
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">{t('login.email')}</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">{t('login.password')}</Label>
                    <Input
                      id="admin-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberEmail}
                        onChange={(e) => setRememberEmail(e.target.checked)}
                        className="w-4 h-4 accent-[#2563eb] rounded"
                      />
                      <span className="text-sm text-slate-600">{t('login.rememberEmail')}</span>
                    </label>
                    <button
                      type="button"
                      className="text-sm text-[#2563eb] hover:text-[#1d4ed8]"
                      onClick={() => setResetPasswordOpen(true)}
                    >
                      {t('login.forgotPassword')}
                    </button>
                  </div>
                  <Button type="submit" className="w-full h-11 rounded-[10px] bg-[#2563eb] hover:bg-[#1d4ed8] font-semibold" disabled={isLoading}>
                    {isLoading ? t('login.loggingIn') : t('login.adminLogin')}
                  </Button>
                  <p className="text-xs text-center text-slate-500 mt-3">
                    {t('login.noAccount')}{' '}
                    <button
                      type="button"
                      className="text-[#2563eb] hover:text-[#1d4ed8] font-medium"
                      onClick={() => {
                        resetSignupForm();
                        setSignupRole('admin');
                        setSignupOpen(true);
                      }}
                    >
                      {t('login.signup')}
                    </button>
                  </p>
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-[#e5e7eb]" />
                    <span className="text-xs text-slate-400">또는</span>
                    <div className="flex-1 h-px bg-[#e5e7eb]" />
                  </div>
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      className="w-full h-11 flex items-center gap-3 px-4 bg-white border border-[#e5e7eb] rounded-[10px] hover:bg-slate-50 transition-colors"
                      onClick={handleGoogleLogin}
                    >
                      <span className="w-5 h-5 flex items-center justify-center shrink-0">
                        <img src={googleLogo} alt="Google" className={socialLogoClassByProvider.google} />
                      </span>
                      <span className="flex-1 text-sm font-medium text-slate-700 text-center">{t('login.continueWithGoogle')}</span>
                    </button>
                    <button
                      type="button"
                      className="w-full h-11 flex items-center gap-3 px-4 bg-white border border-[#e5e7eb] rounded-[10px] hover:bg-slate-50 transition-colors"
                      onClick={handleAppleLogin}
                    >
                      <span className="w-5 h-5 flex items-center justify-center shrink-0">
                        <img src={appleLogo} alt="Apple" className={socialLogoClassByProvider.apple} />
                      </span>
                      <span className="flex-1 text-sm font-medium text-slate-700 text-center">{t('login.continueWithApple')}</span>
                    </button>
                    <button
                      type="button"
                      className="w-full h-11 flex items-center gap-3 px-4 bg-white border border-[#e5e7eb] rounded-[10px] hover:bg-slate-50 transition-colors"
                      onClick={handleKakaoLogin}
                    >
                      <span className="w-5 h-5 flex items-center justify-center shrink-0">
                        <img src={kakaoLogo} alt="Kakao" className={socialLogoClassByProvider.kakao} />
                      </span>
                      <span className="flex-1 text-sm font-medium text-slate-700 text-center">{t('login.continueWithKakao')}</span>
                    </button>
                    <button
                      type="button"
                      className="w-full h-11 flex items-center gap-3 px-4 bg-white border border-[#e5e7eb] rounded-[10px] hover:bg-slate-50 transition-colors"
                      onClick={handleNaverLogin}
                    >
                      <span className="w-5 h-5 flex items-center justify-center shrink-0">
                        <img src={naverLogo} alt="Naver" className={socialLogoClassByProvider.naver} />
                      </span>
                      <span className="flex-1 text-sm font-medium text-slate-700 text-center">{t('login.continueWithNaver')}</span>
                    </button>
                  </div>
                </form>
              </TabsContent>
              <TabsContent value="team">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await handleLogin('team');
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="team-email">{t('login.email')}</Label>
                    <Input
                      id="team-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="team-password">{t('login.password')}</Label>
                    <Input
                      id="team-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberEmail}
                        onChange={(e) => setRememberEmail(e.target.checked)}
                        className="w-4 h-4 accent-[#2563eb] rounded"
                      />
                      <span className="text-sm text-slate-600">{t('login.rememberEmail')}</span>
                    </label>
                    <button
                      type="button"
                      className="text-sm text-[#2563eb] hover:text-[#1d4ed8]"
                      onClick={() => setResetPasswordOpen(true)}
                    >
                      {t('login.forgotPassword')}
                    </button>
                  </div>
                  <Button type="submit" className="w-full h-11 rounded-[10px] bg-[#2563eb] hover:bg-[#1d4ed8] font-semibold" disabled={isLoading}>
                    {isLoading ? t('login.loggingIn') : t('login.teamLogin')}
                  </Button>
                  <p className="text-xs text-center text-slate-500 mt-3">
                    {t('login.noAccount')}{' '}
                    <button
                      type="button"
                      className="text-[#2563eb] hover:text-[#1d4ed8] font-medium"
                      onClick={() => {
                        resetSignupForm();
                        setSignupRole('team');
                        setSignupOpen(true);
                      }}
                    >
                      {t('login.signup')}
                    </button>
                  </p>
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-[#e5e7eb]" />
                    <span className="text-xs text-slate-400">또는</span>
                    <div className="flex-1 h-px bg-[#e5e7eb]" />
                  </div>
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      className="w-full h-11 flex items-center gap-3 px-4 bg-white border border-[#e5e7eb] rounded-[10px] hover:bg-slate-50 transition-colors"
                      onClick={handleGoogleLogin}
                    >
                      <span className="w-5 h-5 flex items-center justify-center shrink-0">
                        <img src={googleLogo} alt="Google" className={socialLogoClassByProvider.google} />
                      </span>
                      <span className="flex-1 text-sm font-medium text-slate-700 text-center">{t('login.continueWithGoogle')}</span>
                    </button>
                    <button
                      type="button"
                      className="w-full h-11 flex items-center gap-3 px-4 bg-white border border-[#e5e7eb] rounded-[10px] hover:bg-slate-50 transition-colors"
                      onClick={handleAppleLogin}
                    >
                      <span className="w-5 h-5 flex items-center justify-center shrink-0">
                        <img src={appleLogo} alt="Apple" className={socialLogoClassByProvider.apple} />
                      </span>
                      <span className="flex-1 text-sm font-medium text-slate-700 text-center">{t('login.continueWithApple')}</span>
                    </button>
                    <button
                      type="button"
                      className="w-full h-11 flex items-center gap-3 px-4 bg-white border border-[#e5e7eb] rounded-[10px] hover:bg-slate-50 transition-colors"
                      onClick={handleKakaoLogin}
                    >
                      <span className="w-5 h-5 flex items-center justify-center shrink-0">
                        <img src={kakaoLogo} alt="Kakao" className={socialLogoClassByProvider.kakao} />
                      </span>
                      <span className="flex-1 text-sm font-medium text-slate-700 text-center">{t('login.continueWithKakao')}</span>
                    </button>
                    <button
                      type="button"
                      className="w-full h-11 flex items-center gap-3 px-4 bg-white border border-[#e5e7eb] rounded-[10px] hover:bg-slate-50 transition-colors"
                      onClick={handleNaverLogin}
                    >
                      <span className="w-5 h-5 flex items-center justify-center shrink-0">
                        <img src={naverLogo} alt="Naver" className={socialLogoClassByProvider.naver} />
                      </span>
                      <span className="flex-1 text-sm font-medium text-slate-700 text-center">{t('login.continueWithNaver')}</span>
                    </button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
            <div className="mt-6 pt-5 border-t border-[#e5e7eb] text-xs text-center text-slate-500 leading-relaxed whitespace-pre-line">
              {'주식회사 인포크리에이티브\n대표: 정도천\n사업자등록번호: 841-86-03004\n통신판매업신고번호: 2024-서울금천-0112호\n\n고객지원: support@traystorage.net\n도입문의 및 비즈니스 제안: support@traystorage.net\n고객지원번호: 02-333-7334\n\n서울특별시 금천구 가산디지털2로 43-14 708-709호\n(가산동, 가산한화비즈메트로2차)'}
            </div>
          </div>
        </div>

      {signupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md my-auto flex flex-col max-h-[90vh] bg-white rounded-[14px] border border-[#e5e7eb] shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <div className="shrink-0 px-6 pt-5 pb-4">
              <h3 className="text-[22px] font-bold text-slate-900 tracking-tight">{t('signup.title')}</h3>
              <p className="text-[12.5px] text-slate-500 mt-1.5">{t('signup.description')}</p>
            </div>
            <div className="flex flex-col gap-[13px] flex-1 min-h-0 overflow-y-auto px-6">
              <Tabs
                value={signupRole}
                onValueChange={(v) => setSignupRole(v as 'admin' | 'team')}
              >
                <TabsList className="grid w-full grid-cols-2 mb-4 bg-slate-100 p-1 rounded-xl h-auto">
                  <TabsTrigger
                    value="admin"
                    className="rounded-lg py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500 transition-all"
                  >
                    {t('signup.adminTab')}
                  </TabsTrigger>
                  <TabsTrigger
                    value="team"
                    className="rounded-lg py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500 transition-all"
                  >
                    {t('signup.teamTab')}
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* 관리자: 회사명 + 회사 코드 직접 입력 */}
              {signupRole === 'admin' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-slate-900">{t('signup.companyName')}</label>
                    <Input
                      className="h-10 rounded-lg border-[#e5e7eb] text-[14px]"
                      placeholder={t('signup.companyNamePlaceholder')}
                      value={signupForm.companyName}
                      onChange={(e) =>
                        setSignupForm((prev) => ({
                          ...prev,
                          companyName: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-slate-900">{t('signup.companyCode')}</label>
                    <Input
                      className="h-10 rounded-lg border-[#e5e7eb] text-[14px]"
                      placeholder={t('signup.companyCodePlaceholder')}
                      value={signupForm.companyCode}
                      onChange={(e) =>
                        setSignupForm((prev) => ({
                          ...prev,
                          companyCode: e.target.value,
                        }))
                      }
                    />
                  </div>
                </>
              )}

              {/* 팀원: 기존 회사 코드로 가입 (선택) */}
              {signupRole === 'team' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-slate-900">{t('signup.companyCodeOptional')}</label>
                  <Input
                    className="h-10 rounded-lg border-[#e5e7eb] text-[14px]"
                    placeholder={t('signup.companyCodeOptionalPlaceholder')}
                    value={signupForm.companyCode}
                    onChange={(e) =>
                      setSignupForm((prev) => ({
                        ...prev,
                        companyCode: e.target.value,
                      }))
                    }
                  />
                  <p className="text-[11.5px] text-slate-500">
                    {t('signup.companyCodeOptionalHint')}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-900">{t('signup.name')}</label>
                <Input
                  className="h-10 rounded-lg border-[#e5e7eb] text-[14px]"
                  placeholder={t('signup.namePlaceholder')}
                  value={signupForm.name}
                  onChange={(e) =>
                    setSignupForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-900">{t('signup.email')}</label>
                <Input
                  className="h-10 rounded-lg border-[#e5e7eb] text-[14px]"
                  type="email"
                  placeholder={t('signup.emailPlaceholder')}
                  value={signupForm.email}
                  onChange={(e) =>
                    setSignupForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-900">{t('signup.phoneVerification')}</label>
                <div className="flex gap-2">
                  <Input
                    className="h-10 rounded-lg border-[#e5e7eb] text-[14px] flex-1"
                    placeholder={t('signup.phonePlaceholder')}
                    value={adminPhone}
                    onChange={(e) => {
                      setAdminPhone(e.target.value);
                      setAdminOtpVerified(false);
                    }}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={handleSendAdminOtp}
                    disabled={isLoading || isSendingAdminOtp || !adminPhone.trim()}
                    className="h-10 px-3 rounded-lg text-[12px] font-medium border border-[#e5e7eb] bg-white text-slate-900 hover:bg-slate-50 shrink-0 disabled:opacity-50"
                  >
                    {isSendingAdminOtp
                      ? t('common.sending')
                      : adminOtpSent
                      ? t('signup.resend')
                      : t('signup.sendOtp')}
                  </button>
                </div>
                <div className="flex gap-2">
                  <Input
                    className="h-10 rounded-lg border-[#e5e7eb] text-[14px] flex-1"
                    placeholder={t('signup.otpPlaceholder')}
                    value={adminOtp}
                    onChange={(e) => setAdminOtp(e.target.value)}
                    disabled={isLoading || !adminOtpSent || adminOtpVerified}
                  />
                  <button
                    type="button"
                    onClick={handleVerifyAdminOtp}
                    disabled={
                      isLoading ||
                      !adminOtpSent ||
                      adminOtpVerified ||
                      isVerifyingAdminOtp ||
                      !adminOtp.trim()
                    }
                    className={`h-10 px-3 rounded-lg text-[12px] font-semibold shrink-0 flex items-center gap-1 disabled:opacity-50 ${
                      adminOtpVerified
                        ? 'bg-[#10b981] text-white border-none'
                        : 'border border-[#e5e7eb] bg-white text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {adminOtpVerified
                      ? t('signup.otpVerified')
                      : isVerifyingAdminOtp
                      ? t('signup.verifyingOtp')
                      : t('signup.verifyOtp')}
                  </button>
                </div>
                {adminOtpVerified ? (
                  <p className="text-[11.5px] text-[#10b981] font-medium">{t('signup.phoneVerified')}</p>
                ) : (
                  <p className="text-[11.5px] text-slate-400">{t('signup.phoneVerifyRequired')}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-900">{t('signup.password')}</label>
                <Input
                  className="h-10 rounded-lg border-[#e5e7eb] text-[14px]"
                  type="password"
                  placeholder={t('signup.passwordPlaceholder')}
                  value={signupForm.password}
                  onChange={(e) =>
                    setSignupForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                />
                {passwordValidation && !passwordValidation.isValid && signupForm.password && (
                  <p className="text-[11.5px] text-red-500">
                    ⚠ {passwordValidation.errors.join(' / ')}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-900">{t('signup.confirmPassword')}</label>
                <Input
                  className="h-10 rounded-lg border-[#e5e7eb] text-[14px]"
                  type="password"
                  placeholder={t('signup.confirmPasswordPlaceholder')}
                  value={signupForm.confirmPassword}
                  onChange={(e) =>
                    setSignupForm((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                />
              </div>


              <div className="p-3.5 bg-[#f8fafc] rounded-lg border border-[#e5e7eb]">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={agreeAll}
                    onChange={(e) => handleAgreeAll(e.target.checked)}
                    className="w-[15px] h-[15px] accent-[#2563eb] m-0"
                  />
                  <span className="text-[13px] font-semibold text-slate-900">모두 동의합니다</span>
                </label>
                <div className="pt-2 border-t border-[#e5e7eb] flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreeAge}
                      onChange={(e) => setAgreeAge(e.target.checked)}
                      className="w-[14px] h-[14px] accent-[#2563eb] m-0"
                    />
                    <span className="text-[12px] text-slate-500"><span>[필수]</span> <span className="text-slate-900">만 14세 이상입니다</span></span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="w-[14px] h-[14px] accent-[#2563eb] m-0"
                    />
                    <span className="text-[12px] text-slate-500">
                      [필수]{' '}
                      <button
                        type="button"
                        className="text-[#2563eb] underline hover:text-[#1d4ed8]"
                        onClick={() => setTermsPopupType('tos')}
                      >
                        서비스 이용약관
                      </button>
                      <span className="text-slate-900"> 에 동의합니다</span>
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreePrivacy}
                      onChange={(e) => setAgreePrivacy(e.target.checked)}
                      className="w-[14px] h-[14px] accent-[#2563eb] m-0"
                    />
                    <span className="text-[12px] text-slate-500">
                      [필수]{' '}
                      <button
                        type="button"
                        className="text-[#2563eb] underline hover:text-[#1d4ed8]"
                        onClick={() => setTermsPopupType('privacy')}
                      >
                        개인정보 처리방침
                      </button>
                      <span className="text-slate-900"> 에 동의합니다</span>
                    </span>
                  </label>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
            <div className="flex gap-2 px-6 py-3.5 border-t border-[#f1f5f9] bg-[#fafbfc] rounded-b-[14px]">
              <button
                type="button"
                onClick={() => {
                  setSignupOpen(false);
                  resetSignupForm();
                  clearError();
                }}
                disabled={isLoading}
                className="flex-1 h-11 rounded-[10px] text-[13px] font-semibold border border-[#e5e7eb] bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSignup}
                disabled={
                  isLoading ||
                  !signupForm.email ||
                  !signupForm.password ||
                  !signupForm.name ||
                  !adminPhone.trim() ||
                  !adminOtpVerified ||
                  !allAgreed ||
                  (signupRole === 'admin' && (!signupForm.companyName.trim() || !signupForm.companyCode.trim()))
                }
                className="flex-[2] h-11 rounded-[10px] text-[14px] font-semibold bg-[#2563eb] text-white hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_1px_3px_rgba(37,99,235,0.3)]"
              >
                {isLoading ? t('signup.signingUp') : t('signup.signupButton')}
              </button>
            </div>
          </div>
        </div>
      )}
      <Dialog open={termsPopupType !== null} onOpenChange={(open) => { if (!open) setTermsPopupType(null); }}>
        <DialogContent variant="v1" className="max-w-4xl max-h-[80vh] flex flex-col overflow-hidden" hideClose>
          <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
            <div className="w-10 h-10 rounded-[10px] bg-[#eff6ff] flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[17px] font-semibold text-slate-900 tracking-[-0.01em]">
                {termsPopupType === 'tos' ? t('terms.tos') : t('terms.privacy')}
              </h2>
              <p className="text-[13px] text-slate-500 mt-0.5">내용을 확인해 주세요.</p>
            </div>
            <button
              type="button"
              onClick={() => setTermsPopupType(null)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
            <div className="text-[13px] text-slate-700 leading-relaxed space-y-4">
              {termsPopupType === 'tos' ? <TermsOfServiceContent /> : <PrivacyPolicyContent />}
            </div>
          </div>
          <div className="flex justify-end px-6 py-3.5 border-t border-[#f1f5f9] bg-[#fafbfc] rounded-b-[16px] shrink-0">
            <button
              type="button"
              onClick={() => setTermsPopupType(null)}
              className="h-9 px-5 rounded-[10px] text-[13px] font-semibold bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
            >
              확인
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('resetPassword.title')}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-600">
              {t('resetPassword.description')}<br />
              {t('resetPassword.description2')}
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="reset-email">{t('resetPassword.email')}</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder={t('resetPassword.emailPlaceholder')}
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                disabled={isResetting}
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setResetPasswordOpen(false);
                  setResetEmail('');
                }}
                disabled={isResetting}
                className="flex-1"
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleResetPassword}
                disabled={isResetting || !resetEmail.trim()}
                className="flex-1"
              >
                {isResetting ? t('common.sending') : t('resetPassword.sendLink')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 탈퇴 신청 경고 다이얼로그 */}
      <Dialog open={deletionWarningOpen} onOpenChange={(open) => {
        if (!open) {
          setDeletionWarningOpen(false);
          setDeletionInfo(null);
          setPendingLoginRole(null);
          // 다이얼로그 닫으면 로그아웃
          supabase.auth.signOut();
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">{t('deletion.warningTitle')}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800 font-medium mb-2">
                {t('deletion.accountPending')}
              </p>
              {deletionInfo && (
                <div className="text-sm text-amber-700 space-y-1">
                  <p>• {t('deletion.scheduledDate')} <strong>{deletionInfo.scheduledDate}</strong></p>
                  <p>• {t('deletion.remainingDays')} <strong>{deletionInfo.remainingDays}{t('common.days')}</strong></p>
                </div>
              )}
            </div>
            
            <p className="text-sm text-slate-600">
              {t('deletion.cancelInfo')}
              <br />
              {t('deletion.noCancelInfo')}
            </p>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDeletionWarningOpen(false);
                  setDeletionInfo(null);
                  setPendingLoginRole(null);
                  supabase.auth.signOut();
                }}
                disabled={isCancellingDeletion}
                className="flex-1"
              >
                {t('common.logout')}
              </Button>
              <Button
                onClick={handleCancelDeletion}
                disabled={isCancellingDeletion}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isCancellingDeletion ? t('common.processing') : t('deletion.cancelDeletion')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
