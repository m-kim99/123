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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import logo from '@/assets/logo.png';
import googleLogo from '@/assets/google.png';
import appleLogo from '@/assets/apple.png';
import kakaoLogo from '@/assets/kakao.png';
import naverLogo from '@/assets/naver.png';
import { validatePasswordClient, PasswordValidation } from '@/lib/password-validator';
import { TermsOfServiceContent } from '@/components/terms/TermsOfService';
import { PrivacyPolicyContent } from '@/components/terms/PrivacyPolicy';

export function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupRole, setSignupRole] = useState<'admin' | 'team'>('team');
  const backgroundVideoSrc = '/login-bg.mp4';
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
        ? 'com.dms.app://login-callback'
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
        ? 'com.dms.app://login-callback'
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
        ? 'com.dms.app://login-callback'
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
        description: t('signup.enterPhoneForAdmin'),
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

    const result = await signup(
      signupForm.email,
      signupForm.password,
      signupForm.name,
      signupRole,
      signupRole === 'admin' ? signupForm.companyCode.trim() : '',
      signupRole === 'admin' ? signupForm.companyName.trim() : '',
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
    <div className="relative min-h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 overflow-hidden">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
      >
        <source src={backgroundVideoSrc} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/45" aria-hidden="true" />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="flex flex-row justify-center items-center gap-2 max-w-full overflow-hidden">
              <img
                src={logo}
                alt={t('login.logoAlt')}
                className="h-14 sm:h-16 w-auto max-w-[calc(100%-4rem)] object-contain"
              />
              <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded shrink-0 whitespace-nowrap translate-y-[0.35rem] sm:translate-y-[0.4rem]">
                BETA
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="admin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger
                  value="admin"
                  className="bg-white text-black data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  {t('login.adminTab')}
                </TabsTrigger>
                <TabsTrigger
                  value="team"
                  className="bg-white text-black data-[state=active]:bg-blue-600 data-[state=active]:text-white"
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
                  <div className="text-right">
                    <Button
                      type="button"
                      variant="link"
                      className="text-blue-600 hover:text-blue-800 p-0 h-auto text-sm bg-transparent hover:bg-transparent"
                      onClick={() => setResetPasswordOpen(true)}
                    >
                      {t('login.forgotPassword')}
                    </Button>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? t('login.loggingIn') : t('login.adminLogin')}
                  </Button>
                  <p className="text-xs text-center text-slate-500 mt-4">
                    {t('login.noAccount')}{' '}
                    <Button
                      type="button"
                      variant="link"
                      className="text-blue-600 hover:text-blue-800 px-1 h-auto"
                      onClick={() => {
                        resetSignupForm();
                        setSignupRole('admin');
                        setSignupOpen(true);
                      }}
                    >
                      {t('login.signup')}
                    </Button>
                  </p>
                  <div className="mt-2 flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full flex items-center justify-center bg-white"
                      onClick={handleGoogleLogin}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="w-6 h-6 flex items-center justify-center shrink-0">
                          <img src={googleLogo} alt="Google" className={socialLogoClassByProvider.google} />
                        </span>
                        <span className="text-sm text-black w-[165px] text-left">{t('login.continueWithGoogle')}</span>
                      </span>
                    </Button>
                  </div>
                  <div className="mt-2 flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full flex items-center justify-center bg-white text-black"
                      onClick={handleAppleLogin}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="w-6 h-6 flex items-center justify-center shrink-0">
                          <img src={appleLogo} alt="Apple" className={socialLogoClassByProvider.apple} />
                        </span>
                        <span className="text-sm w-[165px] text-left">{t('login.continueWithApple')}</span>
                      </span>
                    </Button>
                  </div>
                  <div className="mt-2 flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full flex items-center justify-center bg-white text-black"
                      onClick={handleKakaoLogin}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="w-6 h-6 flex items-center justify-center shrink-0">
                          <img src={kakaoLogo} alt="Kakao" className={socialLogoClassByProvider.kakao} />
                        </span>
                        <span className="text-sm w-[165px] text-left">{t('login.continueWithKakao')}</span>
                      </span>
                    </Button>
                  </div>
                  <div className="mt-2 flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full flex items-center justify-center bg-white text-black"
                      onClick={handleNaverLogin}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="w-6 h-6 flex items-center justify-center shrink-0">
                          <img src={naverLogo} alt="Naver" className={socialLogoClassByProvider.naver} />
                        </span>
                        <span className="text-sm w-[165px] text-left">{t('login.continueWithNaver')}</span>
                      </span>
                    </Button>
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
                  <div className="text-right">
                    <Button
                      type="button"
                      variant="link"
                      className="text-blue-600 hover:text-blue-800 p-0 h-auto text-sm bg-transparent hover:bg-transparent"
                      onClick={() => setResetPasswordOpen(true)}
                    >
                      {t('login.forgotPassword')}
                    </Button>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? t('login.loggingIn') : t('login.teamLogin')}
                  </Button>
                  <p className="text-xs text-center text-slate-500 mt-4">
                    {t('login.noAccount')}{' '}
                    <Button
                      type="button"
                      variant="link"
                      className="text-blue-600 hover:text-blue-800 px-1 h-auto"
                      onClick={() => {
                        resetSignupForm();
                        setSignupRole('team');
                        setSignupOpen(true);
                      }}
                    >
                      {t('login.signup')}
                    </Button>
                  </p>
                  <div className="mt-2 flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full flex items-center justify-center bg-white"
                      onClick={handleGoogleLogin}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="w-6 h-6 flex items-center justify-center shrink-0">
                          <img src={googleLogo} alt="Google" className={socialLogoClassByProvider.google} />
                        </span>
                        <span className="text-sm text-black w-[165px] text-left">{t('login.continueWithGoogle')}</span>
                      </span>
                    </Button>
                  </div>
                  <div className="mt-2 flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full flex items-center justify-center bg-white text-black"
                      onClick={handleAppleLogin}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="w-6 h-6 flex items-center justify-center shrink-0">
                          <img src={appleLogo} alt="Apple" className={socialLogoClassByProvider.apple} />
                        </span>
                        <span className="text-sm w-[165px] text-left">{t('login.continueWithApple')}</span>
                      </span>
                    </Button>
                  </div>
                  <div className="mt-2 flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full flex items-center justify-center bg-white text-black"
                      onClick={handleKakaoLogin}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="w-6 h-6 flex items-center justify-center shrink-0">
                          <img src={kakaoLogo} alt="Kakao" className={socialLogoClassByProvider.kakao} />
                        </span>
                        <span className="text-sm w-[165px] text-left">{t('login.continueWithKakao')}</span>
                      </span>
                    </Button>
                  </div>
                  <div className="mt-2 flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full flex items-center justify-center bg-white text-black"
                      onClick={handleNaverLogin}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="w-6 h-6 flex items-center justify-center shrink-0">
                          <img src={naverLogo} alt="Naver" className={socialLogoClassByProvider.naver} />
                        </span>
                        <span className="text-sm w-[165px] text-left">{t('login.continueWithNaver')}</span>
                      </span>
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="mt-4 w-full text-center">
          <p className="text-xs text-white">
            {t('login.copyright')}
          </p>
          <p className="text-xs text-white mt-1">
            {t('login.patentNotice')}
          </p>
        </div>
      </div>

      {signupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md my-auto flex flex-col max-h-[90vh]">
            <CardHeader className="shrink-0">
              <CardTitle>{t('signup.title')}</CardTitle>
              <CardDescription>{t('signup.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 min-h-0 overflow-y-auto">
              <Tabs
                value={signupRole}
                onValueChange={(v) => setSignupRole(v as 'admin' | 'team')}
              >
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger
                    value="admin"
                    className="bg-white text-black data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                  >
                    {t('signup.adminTab')}
                  </TabsTrigger>
                  <TabsTrigger
                    value="team"
                    className="bg-white text-black data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                  >
                    {t('signup.teamTab')}
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* 관리자: 회사명 + 회사 코드 직접 입력 */}
              {signupRole === 'admin' && (
                <>
                  <div className="space-y-2">
                    <Label>{t('signup.companyName')}</Label>
                    <Input
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

                  <div className="space-y-2">
                    <Label>{t('signup.companyCode')}</Label>
                    <Input
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

              {/* 팀원: 사업자 인증 없이 가입 가능 (회사 연결은 온보딩에서 진행) */}

              <div className="space-y-2">
                <Label>{t('signup.name')}</Label>
                <Input
                  placeholder={t('signup.namePlaceholder')}
                  value={signupForm.name}
                  onChange={(e) =>
                    setSignupForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>{t('signup.email')}</Label>
                <Input
                  type="email"
                  placeholder={t('signup.emailPlaceholder')}
                  value={signupForm.email}
                  onChange={(e) =>
                    setSignupForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>{t('signup.phoneVerification')}</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder={t('signup.phonePlaceholder')}
                    value={adminPhone}
                    onChange={(e) => {
                      setAdminPhone(e.target.value);
                      setAdminOtpVerified(false);
                    }}
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendAdminOtp}
                    disabled={isLoading || isSendingAdminOtp || !adminPhone.trim()}
                    className="shrink-0"
                  >
                    {isSendingAdminOtp
                      ? t('common.sending')
                      : adminOtpSent
                      ? t('signup.resend')
                      : t('signup.sendOtp')}
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder={t('signup.otpPlaceholder')}
                    value={adminOtp}
                    onChange={(e) => setAdminOtp(e.target.value)}
                    disabled={isLoading || !adminOtpSent || adminOtpVerified}
                  />
                  <Button
                    type="button"
                    variant={adminOtpVerified ? 'default' : 'outline'}
                    onClick={handleVerifyAdminOtp}
                    disabled={
                      isLoading ||
                      !adminOtpSent ||
                      adminOtpVerified ||
                      isVerifyingAdminOtp ||
                      !adminOtp.trim()
                    }
                    className="shrink-0"
                  >
                    {adminOtpVerified
                      ? t('signup.otpVerified')
                      : isVerifyingAdminOtp
                      ? t('signup.verifyingOtp')
                      : t('signup.verifyOtp')}
                  </Button>
                </div>

                {adminOtpVerified ? (
                  <p className="text-xs text-green-600">{t('signup.phoneVerified')}</p>
                ) : (
                  <p className="text-xs text-slate-400">{t('signup.phoneVerifyRequired')}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>{t('signup.password')}</Label>
                <Input
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
                  <p className="text-[11px] text-red-500 mt-1">
                    ⚠️ {passwordValidation.errors.join(' / ')}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>{t('signup.confirmPassword')}</Label>
                <Input
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


              <div className="mt-4 border-t pt-4 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeAll}
                    onChange={(e) => handleAgreeAll(e.target.checked)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm font-bold text-slate-700">모두 동의합니다</span>
                </label>
                <div className="border-t pt-3 space-y-2.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreeAge}
                      onChange={(e) => setAgreeAge(e.target.checked)}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-sm text-slate-600">[필수] 만 14세 이상입니다</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-sm text-slate-600">
                      [필수]{' '}
                      <button
                        type="button"
                        className="text-blue-600 underline hover:text-blue-800"
                        onClick={() => setTermsPopupType('tos')}
                      >
                        서비스 이용약관
                      </button>
                      에 동의합니다
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={agreePrivacy}
                      onChange={(e) => setAgreePrivacy(e.target.checked)}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-sm text-slate-600">
                      [필수]{' '}
                      <button
                        type="button"
                        className="text-blue-600 underline hover:text-blue-800"
                        onClick={() => setTermsPopupType('privacy')}
                      >
                        개인정보 처리방침
                      </button>
                      에 동의합니다
                    </span>
                  </div>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            <div className="flex justify-end gap-2 px-6 pb-6">
              <Button
                variant="outline"
                onClick={() => {
                  setSignupOpen(false);
                  resetSignupForm();
                  clearError();
                }}
                disabled={isLoading}
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleSignup}
                className="w-full"
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
              >
                {isLoading ? t('signup.signingUp') : t('signup.signupButton')}
              </Button>
            </div>
          </Card>
        </div>
      )}
      <Dialog open={termsPopupType !== null} onOpenChange={(open) => { if (!open) setTermsPopupType(null); }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-blue-600 text-lg font-bold">
              {termsPopupType === 'tos' ? t('terms.tos') : t('terms.privacy')}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col flex-1 min-h-0">
            <div className="border rounded-lg flex flex-col min-h-0 flex-1">
              <div className="overflow-y-auto flex-1 p-4">
                <div className="text-sm text-slate-700 space-y-4">
                  {termsPopupType === 'tos' ? <TermsOfServiceContent /> : <PrivacyPolicyContent />}
                </div>
              </div>
            </div>
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
