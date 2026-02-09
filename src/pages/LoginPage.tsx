import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupRole, setSignupRole] = useState<'admin' | 'team'>('team');
  const [companyCodeVerified, setCompanyCodeVerified] = useState(false);
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
  const [availableDepartments, setAvailableDepartments] = useState<any[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation | null>(null);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const [adminPhone, setAdminPhone] = useState('');
  const [adminOtp, setAdminOtp] = useState('');
  const [adminOtpSent, setAdminOtpSent] = useState(false);
  const [adminOtpVerified, setAdminOtpVerified] = useState(false);
  const [isSendingAdminOtp, setIsSendingAdminOtp] = useState(false);
  const [isVerifyingAdminOtp, setIsVerifyingAdminOtp] = useState(false);

  // 비밀번호 실시간 검증
  useEffect(() => {
    if (signupForm.password) {
      const validation = validatePasswordClient(signupForm.password);
      setPasswordValidation(validation);
    } else {
      setPasswordValidation(null);
    }
  }, [signupForm.password]);
  const { login, signup, isLoading, error, clearError, redirectAfterLogin, setRedirectAfterLogin } =
    useAuthStore();

  const handleGoogleLogin = async () => {
    console.log('🔵 Google 로그인 시작');
    console.log('🔵 Supabase 객체:', supabase);
    console.log('🔵 window.location.origin:', window.location.origin);

    try {
      const redirectTo = `${window.location.origin}`;

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
          title: 'Google 로그인 실패',
          description: error.message || '다시 시도해주세요',
          variant: 'destructive',
        });
      } else {
        console.log('✅ Google 로그인 성공, 리디렉션 시작');
      }
    } catch (error: any) {
      console.error('❌ Google 로그인 예외:', error);
      toast({
        title: 'Google 로그인 오류',
        description: error?.message || 'Google 로그인 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleKakaoLogin = async () => {
    console.log('🟡 Kakao 로그인 시작');
    console.log('🟡 Supabase 객체:', supabase);
    console.log('🟡 window.location.origin:', window.location.origin);

    try {
      const redirectTo = `${window.location.origin}`;

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
          title: 'Kakao 로그인 실패',
          description: error.message || '다시 시도해주세요',
          variant: 'destructive',
        });
      } else {
        console.log('✅ Kakao 로그인 성공, 리디렉션 시작');
      }
    } catch (error: any) {
      console.error('❌ Kakao 로그인 예외:', error);
      toast({
        title: 'Kakao 로그인 오류',
        description: error?.message || 'Kakao 로그인 중 오류가 발생했습니다.',
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
        title: 'Naver 로그인 오류',
        description: error?.message || 'Naver 로그인 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleAppleLogin = async () => {
    console.log('🍎 Apple 로그인 시작');
    console.log('🍎 Supabase 객체:', supabase);
    console.log('🍎 window.location.origin:', window.location.origin);

    try {
      const redirectTo = `${window.location.origin}`;

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
          title: 'Apple 로그인 실패',
          description: error.message || '다시 시도해주세요',
          variant: 'destructive',
        });
      } else {
        console.log('✅ Apple 로그인 성공, 리디렉션 시작');
      }
    } catch (error: any) {
      console.error('❌ Apple 로그인 예외:', error);
      toast({
        title: 'Apple 로그인 오류',
        description: error?.message || 'Apple 로그인 중 오류가 발생했습니다.',
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
    setCompanyCodeVerified(false);
    setAvailableDepartments([]);
    setIsLoadingDepartments(false);

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
        title: '휴대폰 번호 입력',
        description: '휴대폰 번호를 정확히 입력해주세요. (예: 01012345678)',
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
        let errMsg = fnError.message || '문자 발송 실패';
        try {
          const errBody = await fnError.context?.json();
          if (errBody?.error) errMsg = errBody.error;
        } catch {}
        throw new Error(errMsg);
      }

      if (!data?.success) {
        throw new Error(data?.error || data?.message || '문자 발송 실패');
      }

      setAdminOtpSent(true);
      setAdminOtpVerified(false);
      setAdminOtp('');

      toast({
        title: '인증번호 전송 완료',
        description: '문자로 받은 인증번호를 입력해주세요. (5분 유효)',
      });
    } catch (err: any) {
      toast({
        title: '인증번호 전송 실패',
        description: err?.message || '잠시 후 다시 시도해주세요.',
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
        title: '휴대폰 번호 입력',
        description: '휴대폰 번호를 확인해주세요.',
        variant: 'destructive',
      });
      return;
    }

    if (!adminOtpSent) {
      toast({
        title: '인증번호 전송',
        description: '먼저 인증번호를 전송해주세요.',
        variant: 'destructive',
      });
      return;
    }

    if (!code) {
      toast({
        title: '인증번호 입력',
        description: '인증번호를 입력해주세요.',
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
        throw new Error(fnError.message || '인증 실패');
      }

      if (!data?.success) {
        throw new Error(data?.error || '인증 실패');
      }

      setAdminOtpVerified(true);

      toast({
        title: '휴대폰 인증 완료',
        description: '관리자 회원가입을 계속 진행할 수 있습니다.',
      });
    } catch (err: any) {
      toast({
        title: '인증 실패',
        description: err?.message || '다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setIsVerifyingAdminOtp(false);
    }
  };

  const handleLogin = async (role: 'admin' | 'team') => {
    clearError();

    const result = await login(email, password, role);

    if (result.success) {
      toast({
        title: '로그인 성공',
        description: '환영합니다.',
      });

      const basePath = role === 'admin' ? '/admin' : '/team';

      // 저장된 리다이렉트 경로가 있으면 우선 이동
      if (redirectAfterLogin) {
        // 전체 경로가 저장되어 있으므로 그대로 사용
        navigate(redirectAfterLogin, { replace: true });
        setRedirectAfterLogin(null);
      } else {
        navigate(basePath);
      }
    } else {
      toast({
        title: '로그인 실패',
        description: result.error || '다시 시도해주세요',
        variant: 'destructive',
      });
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail.trim()) {
      toast({
        title: '이메일 입력',
        description: '이메일 주소를 입력해주세요',
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
        throw new Error(fnError.message || '요청 처리 실패');
      }

      if (!data.success) {
        // OAuth 사용자인 경우
        if (data.isOAuth) {
          toast({
            title: 'OAuth 계정',
            description: data.message,
            variant: 'destructive',
          });
        } else {
          toast({
            title: '오류',
            description: data.error || '다시 시도해주세요',
            variant: 'destructive',
          });
        }
        return;
      }

      // 성공
      toast({
        title: '이메일 전송 완료',
        description: data.message,
      });

      setResetPasswordOpen(false);
      setResetEmail('');
    } catch (error: any) {
      console.error('비밀번호 재설정 오류:', error);
      toast({
        title: '오류',
        description: error?.message || '다시 시도해주세요',
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
        title: '입력 오류',
        description: '모든 필드를 입력해주세요',
        variant: 'destructive',
      });
      return;
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      toast({
        title: '비밀번호 불일치',
        description: '비밀번호가 일치하지 않습니다',
        variant: 'destructive',
      });
      return;
    }

    if (signupForm.password.length < 6) {
      toast({
        title: '비밀번호 오류',
        description: '비밀번호는 최소 6자 이상이어야 합니다',
        variant: 'destructive',
      });
      return;
    }

    if (signupRole === 'team' && !signupForm.departmentId) {
      toast({
        title: '부서 선택',
        description: '부서를 선택해주세요',
        variant: 'destructive',
      });
      return;
    }

    if (signupRole === 'admin') {
      const phone = normalizePhone(adminPhone);
      if (!phone) {
        toast({
          title: '휴대폰 번호 입력',
          description: '관리자 가입을 위해 휴대폰 인증이 필요합니다.',
          variant: 'destructive',
        });
        return;
      }

      if (!adminOtpVerified) {
        toast({
          title: '휴대폰 인증 필요',
          description: '관리자 가입을 위해 휴대폰 인증을 완료해주세요.',
          variant: 'destructive',
        });
        return;
      }
    }

    const result = await signup(
      signupForm.email,
      signupForm.password,
      signupForm.name,
      signupRole,
      signupForm.companyCode.trim(),
      signupForm.companyName.trim(),
      signupRole === 'team' ? signupForm.departmentId : undefined
    );

    if (result.success) {
      toast({
        title: '회원가입 완료',
        description: '이제 로그인할 수 있습니다',
      });
      setSignupOpen(false);
      resetSignupForm();
    } else {
      toast({
        title: '회원가입 실패',
        description: result.error || '다시 시도해주세요',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="relative min-h-screen w-screen flex items-center justify-center md:justify-start bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:pl-16 md:pr-4 overflow-hidden">
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

      <div className="relative z-10 flex w-full max-w-md flex-col items-center md:items-start">
        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="flex flex-row justify-center items-center gap-2 max-w-full overflow-hidden">
              <img
                src={logo}
                alt="문서 관리 시스템 로고"
                className="h-14 sm:h-16 w-auto max-w-[calc(100%-4rem)] object-contain"
              />
              <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded shrink-0 whitespace-nowrap translate-y-[0.35rem] sm:translate-y-[0.4rem]">
                BETA
              </span>
            </CardTitle>
            <CardDescription>
              <br />
              쓰기 쉬운 AI 문서정리 솔루션
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="admin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger
                  value="admin"
                  className="bg-white text-black data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  관리자
                </TabsTrigger>
                <TabsTrigger
                  value="team"
                  className="bg-white text-black data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  팀원
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
                    <Label htmlFor="admin-email">이메일</Label>
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
                    <Label htmlFor="admin-password">비밀번호</Label>
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
                      비밀번호를 잊으셨나요?
                    </Button>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? '로그인 중...' : '관리자 로그인'}
                  </Button>
                  <p className="text-xs text-center text-slate-500">
                    계정이 없으신가요?{' '}
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
                      회원가입
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
                        <span className="text-sm text-black w-[165px] text-left">Google 계정으로 계속하기</span>
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
                        <span className="text-sm w-[165px] text-left">Apple 계정으로 계속하기</span>
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
                        <span className="text-sm w-[165px] text-left">Kakao 계정으로 계속하기</span>
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
                        <span className="text-sm w-[165px] text-left">Naver 계정으로 계속하기</span>
                      </span>
                    </Button>
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-xs text-slate-500">
                      회원가입 또는 로그인 시 서비스 이용약관 및 개인정보 처리방침에 동의한 것으로 간주합니다.
                      <Button
                        type="button"
                        variant="link"
                        className="text-blue-600 hover:text-blue-800 p-0 h-auto text-xs underline bg-transparent hover:bg-transparent rounded-none"
                        onClick={() => setTermsModalOpen(true)}
                      >
                        보기
                      </Button>
                    </p>
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
                    <Label htmlFor="team-email">이메일</Label>
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
                    <Label htmlFor="team-password">비밀번호</Label>
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
                      비밀번호를 잊으셨나요?
                    </Button>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? '로그인 중...' : '팀원 로그인'}
                  </Button>
                  <p className="text-xs text-center text-slate-500">
                    계정이 없으신가요?{' '}
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
                      회원가입
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
                        <span className="text-sm text-black w-[165px] text-left">Google 계정으로 계속하기</span>
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
                        <span className="text-sm w-[165px] text-left">Apple 계정으로 계속하기</span>
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
                        <span className="text-sm w-[165px] text-left">Kakao 계정으로 계속하기</span>
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
                        <span className="text-sm w-[165px] text-left">Naver 계정으로 계속하기</span>
                      </span>
                    </Button>
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-xs text-slate-500">
                      회원가입 또는 로그인 시 서비스 이용약관 및 개인정보 처리방침에 동의한 것으로 간주합니다.
                      <Button
                        type="button"
                        variant="link"
                        className="text-blue-600 hover:text-blue-800 p-0 h-auto text-xs underline bg-transparent hover:bg-transparent rounded-none"
                        onClick={() => setTermsModalOpen(true)}
                      >
                        보기
                      </Button>
                    </p>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="mt-4 w-full text-center md:text-left">
          <p className="text-xs text-white">
            COPYRIGHT © TRAYSTORAGE CONNECT. ALL RIGHTS RESERVED.
          </p>
          <p className="text-xs text-white mt-1">
            (주의)본 솔루션에 사용된 모든 기술은 등록특허(제10-2843883, 제10-2731096) 및 출원특허로 보호받고 있습니다.
          </p>
        </div>
      </div>

      {signupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>회원가입</CardTitle>
              <CardDescription>새 계정을 생성합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[90vh] overflow-y-auto">
              <Tabs
                value={signupRole}
                onValueChange={(v) => setSignupRole(v as 'admin' | 'team')}
              >
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger
                    value="admin"
                    className="bg-white text-black data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                  >
                    관리자
                  </TabsTrigger>
                  <TabsTrigger
                    value="team"
                    className="bg-white text-black data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                  >
                    팀원
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="space-y-2">
                <Label>회사 코드</Label>
                <Input
                  placeholder="예: COMPANY001"
                  value={signupForm.companyCode}
                  onChange={(e) => {
                    setSignupForm((prev) => ({
                      ...prev,
                      companyCode: e.target.value,
                    }));
                    setCompanyCodeVerified(false);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>회사명</Label>
                <Input
                  placeholder="예: 삼성전자"
                  value={signupForm.companyName}
                  onChange={(e) => {
                    setSignupForm((prev) => ({
                      ...prev,
                      companyName: e.target.value,
                    }));
                    setCompanyCodeVerified(false);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Button
                  type="button"
                  className={`w-full ${
                    companyCodeVerified
                      ? 'bg-green-600 hover:bg-green-600'
                      : ''
                  }`}
                  onClick={async () => {
                    if (
                      signupForm.companyCode.trim() &&
                      signupForm.companyName.trim()
                    ) {
                      setCompanyCodeVerified(true);

                      // 팀원인 경우 부서 목록 로드
                      if (signupRole === 'team') {
                        setIsLoadingDepartments(true);
                        try {
                          const { data: company } = await supabase
                            .from('companies')
                            .select('*')
                            .eq('code', signupForm.companyCode.trim())
                            .single();

                          if (company) {
                            const { data: departments, error: deptError } =
                              await supabase
                                .from('departments')
                                .select('*')
                                .eq('company_id', company.id)
                                .order('name');

                            if (!deptError && departments) {
                              setAvailableDepartments(departments);
                              toast({
                                title: '인증 완료',
                                description: `${departments.length}개 부서를 불러왔습니다.`,
                              });
                            } else {
                              setAvailableDepartments([]);
                              toast({
                                title: '인증 완료',
                                description: '해당 회사에 부서가 없습니다.',
                              });
                            }
                          } else {
                            setAvailableDepartments([]);
                            toast({
                              title: '인증 완료',
                              description: '새로운 회사입니다.',
                            });
                          }
                        } catch (error) {
                          console.error('부서 로드 실패:', error);
                          setAvailableDepartments([]);
                        } finally {
                          setIsLoadingDepartments(false);
                        }
                      } else {
                        // 관리자인 경우
                        toast({
                          title: '인증 완료',
                          description: '회사 정보가 인증되었습니다.',
                        });
                      }
                    } else {
                      toast({
                        title: '회사 정보 입력',
                        description:
                          '회사 코드와 회사명을 모두 입력해주세요.',
                        variant: 'destructive',
                      });
                    }
                  }}
                  disabled={
                    !signupForm.companyCode.trim() ||
                    !signupForm.companyName.trim()
                  }
                  variant={companyCodeVerified ? 'default' : 'outline'}
                >
                  {companyCodeVerified ? '✓ 인증됨 (다시 인증)' : '인증하기'}
                </Button>
                {!companyCodeVerified && (
                  <p className="text-xs text-slate-400">
                    회사 코드와 회사명을 입력하고 인증해주세요
                  </p>
                )}
                {companyCodeVerified && (
                  <p className="text-xs text-green-600">
                    다른 회사로 변경하려면 위에서 수정 후 다시 인증하세요
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>이름</Label>
                <Input
                  placeholder="홍길동"
                  value={signupForm.name}
                  onChange={(e) =>
                    setSignupForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>이메일</Label>
                <Input
                  type="email"
                  placeholder="example@company.com"
                  value={signupForm.email}
                  onChange={(e) =>
                    setSignupForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>

              {signupRole === 'admin' && (
                <div className="space-y-2">
                  <Label>휴대폰 인증</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="01012345678"
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
                        ? '전송 중...'
                        : adminOtpSent
                        ? '재전송'
                        : '인증번호 전송'}
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="인증번호 6자리"
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
                        ? '인증 완료'
                        : isVerifyingAdminOtp
                        ? '확인 중...'
                        : '확인'}
                    </Button>
                  </div>

                  {adminOtpVerified ? (
                    <p className="text-xs text-green-600">휴대폰 인증이 완료되었습니다.</p>
                  ) : (
                    <p className="text-xs text-slate-400">관리자 가입을 위해 휴대폰 인증이 필요합니다.</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>비밀번호</Label>
                <Input
                  type="password"
                  placeholder="8자 이상, 대/소문자, 숫자, 특수문자 포함"
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
                <Label>비밀번호 확인</Label>
                <Input
                  type="password"
                  placeholder="비밀번호 재입력"
                  value={signupForm.confirmPassword}
                  onChange={(e) =>
                    setSignupForm((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                />
              </div>

              {signupRole === 'team' && (
                <div className="space-y-2">
                  <Label>부서</Label>
                  <Select
                    value={signupForm.departmentId}
                    onValueChange={(value) =>
                      setSignupForm((prev) => ({
                        ...prev,
                        departmentId: value,
                      }))
                    }
                    disabled={!companyCodeVerified || isLoadingDepartments}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          !companyCodeVerified
                            ? '먼저 회사 정보를 인증해주세요'
                            : isLoadingDepartments
                            ? '부서를 불러오는 중...'
                            : availableDepartments.length === 0
                            ? '사용 가능한 부서가 없습니다'
                            : '부서 선택'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDepartments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name} ({dept.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!companyCodeVerified && (
                    <p className="text-xs text-slate-400">
                      회사 인증 후 부서를 선택할 수 있습니다
                    </p>
                  )}
                  {companyCodeVerified && availableDepartments.length === 0 && (
                    <p className="text-xs text-red-500">
                      부서가 없습니다. 관리자에게 문의하거나 관리자 계정으로 가입하세요.
                    </p>
                  )}
                </div>
              )}

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
                취소
              </Button>
              <Button
                onClick={handleSignup}
                className="w-full"
                disabled={
                  isLoading ||
                  !companyCodeVerified ||
                  !signupForm.email ||
                  !signupForm.password ||
                  !signupForm.name ||
                  (signupRole === 'team' && !signupForm.departmentId) ||
                  (signupRole === 'admin' && (!adminPhone.trim() || !adminOtpVerified))
                }
              >
                {isLoading ? '가입 중...' : '회원가입'}
              </Button>
            </div>
          </Card>
        </div>
      )}
      <Dialog open={termsModalOpen} onOpenChange={setTermsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>서비스 이용약관 및 개인정보 처리방침</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            <div className="border rounded-lg flex flex-col min-h-0 h-1/2">
              <h2 className="text-lg font-bold p-3 text-blue-600 border-b bg-slate-50 rounded-t-lg shrink-0">서비스 이용 약관</h2>
              <div className="overflow-y-auto flex-1 p-4">
                <div className="text-sm text-slate-700 space-y-4" id="terms-content">
                  <TermsOfServiceContent />
                </div>
              </div>
            </div>

            <div className="border rounded-lg flex flex-col min-h-0 h-1/2">
              <h2 className="text-lg font-bold p-3 text-blue-600 border-b bg-slate-50 rounded-t-lg shrink-0">개인정보 처리방침</h2>
              <div className="overflow-y-auto flex-1 p-4">
                <div className="text-sm text-slate-700 space-y-4">
                  <PrivacyPolicyContent />
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>비밀번호 재설정</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-600">
              가입하신 이메일 주소를 입력하시면<br />
              비밀번호 재설정 링크를 보내드립니다.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="reset-email">이메일</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="example@company.com"
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
                취소
              </Button>
              <Button
                onClick={handleResetPassword}
                disabled={isResetting || !resetEmail.trim()}
                className="flex-1"
              >
                {isResetting ? '전송 중...' : '재설정 링크 보내기'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
