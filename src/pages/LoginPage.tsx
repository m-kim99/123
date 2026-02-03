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

    if (!companyCodeVerified) {
      toast({
        title: '회사 인증 필요',
        description: '먼저 회사 정보를 인증해주세요.',
        variant: 'destructive',
      });
      return;
    }

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

      if (fnError) {
        throw new Error(fnError.message || '문자 발송 실패');
      }

      if (!data?.success) {
        throw new Error(data?.error || '문자 발송 실패');
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
                      disabled={isLoading || isSendingAdminOtp || !companyCodeVerified || !adminPhone.trim()}
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
            <div className="border rounded-lg flex flex-col min-h-0 flex-1">
              <h2 className="text-lg font-bold p-3 text-blue-600 border-b bg-slate-50 rounded-t-lg shrink-0">서비스 이용 약관</h2>
              <div className="overflow-y-auto flex-1 p-4">
                <div className="text-sm text-slate-700 space-y-4">
                <p>
                  이 약관은 주식회사 인포크리에이티브(이하 "회사")가 제공하는 문서 관리 서비스인 트레이 스토리지 커넥트의 이용과 관련하여 회사와 회원 사이 권리와 의무, 회원의 서비스 이용 절차 및 그 밖의 제반 사항을 정하는 것을 목적으로 합니다.
                </p>

                <h3 className="font-semibold text-slate-900">제1조 (정의)</h3>
                <p>이 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>"서비스"란 이용자가 보유하고 있는 문서를 쉽고 편리하게 관리할 수 있도록 회사가 온라인으로 제공하는 서비스를 말합니다.</li>
                  <li>"트레이 스토리지 커넥트"란 회사가 서비스를 제공하기 위하여 운영하는 온라인 플랫폼 서비스를 말합니다.</li>
                  <li>"회원"이란 서비스를 이용하기 위하여 회사가 정한 절차에 따라 트레이 스토리지 커넥트에 회원으로 등록된 이용자를 말합니다.</li>
                  <li>"게시물"이란 종이문서 촬영 사진, 전자적 형태로 작성된 문서 파일, 이미지 등 회원이 보유하고 있는 각종 문서파일 및 이미지로서 트레이 스토리지 커넥트에 등록된 것을 말합니다.</li>
                  <li>"트레이 스토리지 제품"이란 종이문서를 편하게 보관하고 관리할 수 있는 것으로서 별도 구매한 NFC 스티커를 부착하여 트레이 스토리지 커넥트와 연동하여 사용할 수 있는 유료 판매 제품을 말합니다.</li>
                </ul>
                <p>본조에서 정하지 않은 용어의 뜻은 일반 상관례 및 관련 법령에 따릅니다.</p>

                <h3 className="font-semibold text-slate-900">제2조 (약관의 게시 및 개정)</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>회사는 회원이 이 약관을 쉽게 찾을 수 있도록 트레이 스토리지 브랜드 홈페이지 공지 게시판에 게시합니다.</li>
                  <li>회사는 필요할 경우 관련 법령에 위반되지 않는 범위 내에서 이 약관을 개정할 수 있습니다.</li>
                  <li>회사가 약관을 개정할 경우, 개정 내용과 시행 일자를 시행일 7일 전부터 공지합니다. 다만 개정 내용이 회원의 권리 의무에 중대한 영향을 미치거나 회원에게 불리한 경우에는, 최소 30일 전에 공지하고 회원에게는 등록된 연락처(휴대전화번호 또는 이메일 주소)로 개별적으로 통지합니다.</li>
                  <li>회사는 회원에게 약관 개정 내용을 공지 또는 통지하면서, "시행일 전까지 이에 동의하지 않는다는 뜻을 표시하지 아니하면 개정 약관에 동의한 것으로 본다"는 뜻을 명확히 알립니다.</li>
                </ul>

                <h3 className="font-semibold text-slate-900">제3조 (약관 효력 및 운영 정책)</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>이 약관은 회원이 이에 동의함으로써 효력이 발생하고 회원에게 적용됩니다.</li>
                  <li>이 약관에서 정하지 아니한 사항은, 「약관의 규제에 관한 법률」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」, 「소비자기본법」, 「전자상거래 등에서의 소비자 보호에 관한 법률」, 「전자문서 및 전자거래 기본법」 등 관련 법령 및 회사가 별도로 정하는 운영 정책 등에서 정하는 바에 따릅니다.</li>
                </ul>

                <h3 className="font-semibold text-slate-900">제4조 (회원 가입)</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>회사가 제공하는 서비스를 이용하고자 하는 자는 회사가 정한 절차에 따라 회원 가입 신청을 하고 이 약관에 동의해야 합니다.</li>
                  <li>회사는 회원 가입 신청을 받으면 다음 사유가 없는 한 회원 가입을 승인하고 회원으로 등록합니다: 회원 탈퇴 후 7일이 경과되지 않은 자, 허위 사실 포함, 약관 위반으로 말소된 전력이 있는 자 등.</li>
                </ul>

                <h3 className="font-semibold text-slate-900">제5조 (회원 탈퇴 및 회원 등록 말소)</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>회원은 언제든지 트레이 스토리지 커넥트의 '회원 탈퇴하기'를 이용하여 회원 탈퇴를 할 수 있습니다.</li>
                  <li>6개월 동안 로그인 기록이 없는 경우, 휴면회원으로 전환 후 해당 회원의 개인정보를 별도로 분리하여 보관</li>
                  <li>1년 동안 로그인 기록이 없는 경우, 회원 등록 말소 후 해당 회원의 개인정보 파기 및 트레이 스토리지 커넥트의 게시물 영구 삭제</li>
                </ul>

                <h3 className="font-semibold text-slate-900">제6조 (서비스의 내용 및 변경)</h3>
                <p>회사는 다음과 같은 서비스를 제공합니다:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>문서파일, 이미지 등을 저장하고 관리하는 서비스</li>
                  <li>부서를 생성하고 부서별로 문서파일, 이미지 등을 저장하고 관리하는 서비스</li>
                  <li>트레이 스토리지 제품과 연동하여 문서를 저장하고 관리하는 서비스</li>
                  <li>기타 관련 부수 서비스</li>
                </ul>
                <p>회사가 제공하는 서비스는 베타 테스터 기간동안 한시적인 무료입니다.</p>

                <h3 className="font-semibold text-slate-900">제7조 (서비스의 중지)</h3>
                <p>회사는 365일 중단 없는 계속적인 서비스 제공을 원칙으로 합니다. 다만 시스템 정기점검이나 업그레이드 등 서비스 품질 향상을 위하거나 시스템 장애 또는 고장이 발생하여 수리가 필요한 경우에는 사전에 회원에게 공지 또는 통지한 후 서비스 제공을 일시 중지할 수 있습니다.</p>

                <h3 className="font-semibold text-slate-900">제8조 (게시물 등록에 관한 사항)</h3>
                <p>회원은 다음의 게시물은 등록할 수 없습니다:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>인감증명서, 등기권리증 등 법적인 권리의무자격을 증명하는 문서</li>
                  <li>가족관계증명서, 주민등록표등본 등 신분관계 증명에 관한 문서</li>
                  <li>이력서, 경력증명서, 재직증명서 등 개인의 경력 사항을 알 수 있는 문서</li>
                  <li>통장 사본 등 금융기관에서 발행한 문서</li>
                </ul>

                <h3 className="font-semibold text-slate-900">제9조 (서비스 이용 시 회원의 준수사항)</h3>
                <p>회원은 다음 사항을 준수하여야 합니다:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>컴퓨터 바이러스 또는 악성 프로그램의 유포, 서버 공격 등 회사의 원활한 서비스 제공에 방해되는 행위 금지</li>
                  <li>회사의 시스템에 비정상적인 방법으로 접근하는 행위 금지</li>
                  <li>다른 회원의 개인정보를 무단으로 수집하여 처리하는 행위 금지</li>
                  <li>다른 회원이나 회사의 임직원에 대한 욕설, 비방, 모욕, 명예훼손 행위 금지</li>
                </ul>

                <h3 className="font-semibold text-slate-900">제10조 (회사의 역할)</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>회사는 지속적이고 안정된 서비스가 제공될 수 있도록 노력합니다.</li>
                  <li>회사는 회원의 게시물을 안전하게 관리하고 외부 해킹에 의하여 게시물이 유출되지 않도록 필요한 조치를 취하고 있습니다.</li>
                  <li>회사는 회원의 개인정보를 보호하기 위하여 「개인정보 보호법」 등 관련 법령에서 정하는 바를 준수합니다.</li>
                </ul>

                <h3 className="font-semibold text-slate-900">제11조 (회원 정보 관리)</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>회원은 자신의 계정 및 회원 정보에 관한 관리책임이 있습니다.</li>
                  <li>회원은 자신의 계정 및 회원 정보를 제3자에게 이용하게 함으로써 발생된 문제에 대하여 책임을 부담해야 합니다.</li>
                </ul>

                <h3 className="font-semibold text-slate-900">제12조 (분쟁해결 및 관할)</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>이 약관에서 정하지 아니한 사항 또는 이 약관의 내용에 대하여 회사와 회원 사이 이견이 있을 경우, 회사와 회원이 협의하여 결정합니다.</li>
                  <li>분쟁에 대하여 소송이 제기되는 경우, 재판의 관할은 민사소송법의 관할 규정에 따릅니다.</li>
                </ul>

                <p className="font-semibold">이 약관은 2026. 2. 1. 부터 시행합니다.</p>
                </div>
              </div>
            </div>

            <div className="border rounded-lg flex flex-col min-h-0 flex-1">
              <h2 className="text-lg font-bold p-3 text-blue-600 border-b bg-slate-50 rounded-t-lg shrink-0">개인정보 처리방침</h2>
              <div className="overflow-y-auto flex-1 p-4">
                <div className="text-sm text-slate-700 space-y-4">
                <p>
                  주식회사 인포크리에이티브(이하 "회사")는 「개인정보 보호법」 제30조에 따라 회사가 서비스하는 트레이 스토리지 커넥트를 이용하는 사용자(이하 "정보주체")의 개인정보를 보호하고 이와 관련된 고충을 신속하고 원활하게 처리하기 위하여 다음과 같이 개인정보 처리방침을 운영합니다.
                </p>

                <h3 className="font-semibold text-slate-900">제1조 (개인정보 수집·이용 목적)</h3>
                <p>회사는 서비스 제공을 위한 필요 최소한의 개인정보를 수집하고 있으며, 정보주체의 동의를 받아 다음의 목적으로 개인정보를 수집합니다:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>회원 가입 및 관리:</strong> 회원제 서비스에 제공에 따른 본인 식별인증, 중복 가입 및 부정 가입 방지, 회원 자격 유지제한, 각종 통지 및 고지</li>
                  <li><strong>서비스 제공 및 이용:</strong> 문서 등록 및 관리</li>
                  <li><strong>고충 처리:</strong> 회원 고충 사항 확인, 본인 확인, 처리 결과 통지 및 연락</li>
                  <li><strong>마케팅 및 프로모션:</strong> 이벤트, 프로모션 정보 및 참여 기회 제공</li>
                </ul>

                <h3 className="font-semibold text-slate-900">제2조 (수집·이용하는 개인정보 항목)</h3>
                <p>회사가 수집 및 이용하는 개인정보의 항목:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>웹을 통한 회원 가입:</strong> 회사명, 부서명, 이메일, 생년월일, 아이디, 비밀번호, 휴대전화번호</li>
                  <li><strong>카카오 계정을 통한 회원 가입:</strong> 카카오 계정(아이디), 비밀번호</li>
                  <li><strong>구글 계정을 통한 회원 가입:</strong> 이름, 이메일주소</li>
                  <li><strong>네이버 계정을 통한 회원 가입:</strong> 아이디, 비밀번호</li>
                  <li><strong>애플 계정을 통한 회원 가입:</strong> 아이디, 비밀번호</li>
                  <li><strong>회원 고충 및 불만 처리:</strong> 이름, 이메일주소, 연락처, 1:1문의, 고충 및 불만 내용</li>
                </ul>

                <h3 className="font-semibold text-slate-900">제3조 (개인정보 보유 및 이용 기간)</h3>
                <p>회사는 정보주체의 개인정보를 수집할 때 동의 받은 개인정보 보유 및 이용기간 또는 법령에 따른 개인정보 보유 및 이용기간 내에서 개인정보를 처리합니다:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>회원 가입 및 관리:</strong> 회원 탈퇴 및 말소 시까지. 다만, 회원 재가입 확인 또는 부정 가입 방지를 위하여 탈퇴 또는 말소 후 2년 동안 보유</li>
                  <li><strong>고충 처리:</strong> 해당 고충 및 분쟁 처리 시까지. 다만, 처리 과정 및 결과에 관한 기록은 「전자상거래법」에 따라 최소한 3년 동안 보유</li>
                  <li><strong>정보통신 기록:</strong> 회원 탈퇴 및 말소 시까지. 다만, 「통신비밀보호법 시행령」에 따라 최소한 3개월 동안 보유</li>
                </ul>

                <h3 className="font-semibold text-slate-900">제4조 (개인정보의 제3자 제공)</h3>
                <p>회사는 원칙적으로 정보주체의 개인정보를 제3자에게 제공하지 않습니다. 다음의 경우에는 정보주체의 동의 없이 제3자에게 제공할 수 있습니다:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>법률에 특별한 규정이 있는 경우</li>
                  <li>법률에 근거하여 정부 및 공공기관, 수사기관, 법원 등에서 정보 제공을 요청하는 경우</li>
                  <li>통계작성, 과학적 연구, 공익적 기록보존 등을 위하여 가명정보를 제공하는 경우</li>
                  <li>재난, 감염병, 급박한 생명 및 신체 위험을 초래하는 사건 및 사고 등의 긴급사항이 발생하는 경우</li>
                </ul>

                <h3 className="font-semibold text-slate-900">제5조 (정보주체의 권리 및 행사방법)</h3>
                <p>정보주체는 회사가 처리하는 자신의 개인정보에 대하여 언제든지 다음의 권리를 행사할 수 있습니다:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>개인정보 열람 요구권:</strong> 회사가 보유한 개인정보의 열람을 청구할 수 있습니다.</li>
                  <li><strong>개인정보 정정·삭제 요구권:</strong> 자신이 열람한 개인정보의 정정 또는 삭제를 요구할 수 있습니다.</li>
                  <li><strong>개인정보 처리정지 요구 및 동의철회권:</strong> 자신의 개인정보 처리의 정지를 요구하거나 개인정보 처리에 대한 동의를 철회할 수 있습니다.</li>
                </ul>
                <p>정보주체는 개인정보 보호책임자(연락처: 02-333-7334) 또는 전자우편(support@traystorage.net)을 통해 권리를 행사할 수 있습니다.</p>

                <h3 className="font-semibold text-slate-900">제6조 (개인정보의 파기)</h3>
                <p>회사는 개인정보 처리목적의 달성, 개인정보 보유 및 이용 기간의 경과, 사업의 종료 등 정보주체의 개인정보가 불필요하게 되었을 때는 즉시 개인정보를 파기합니다.</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>파기 절차:</strong> 파기 사유가 발생한 개인정보를 선정하고 개인정보 보호책임자의 책임하에 개인정보를 파기합니다.</li>
                  <li><strong>파기 방법:</strong> 전자적 파일 형태로 기록·저장된 개인정보는 복원이 불가능한 방법으로 영구 삭제하고, 종이 문서나 그 밖의 기록매체에 기록된 개인정보는 파쇄 또는 소각합니다.</li>
                </ul>

                <h3 className="font-semibold text-slate-900">제7조 (개인정보의 안전성 확보조치)</h3>
                <p>회사는 정보주체의 개인정보가 분실·도난·유출·위/변조·훼손되지 않도록 다음과 같은 조치를 하고 있습니다:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>개인정보 보호를 위한 내부 관리계획의 수립·시행, 정기적 직원 교육</li>
                  <li>개인정보처리시스템에 대한 접근 통제 및 접근 권한 제한 조치, 고유식별정보 등의 암호화, 보안프로그램의 설치</li>
                  <li>개인정보의 안전한 보관을 위한 보관시설의 마련 또는 잠금장치의 설치 및 접근 통제</li>
                </ul>

                <h3 className="font-semibold text-slate-900">제8조 (개인정보 자동 수집 장치의 설치·운영 및 거부에 관한 사항)</h3>
                <p>회사는 정보주체에게 개별적인 맞춤서비스를 제공하기 위해 이용정보를 저장하고 수시로 불러오는 '쿠키(cookie)'를 사용합니다.</p>
                <p>정보주체는 웹 브라우저 설정을 통하여 쿠키를 허용하거나 거부할 수 있습니다. 쿠키 저장을 거부할 경우 맞춤형 서비스 이용에 어려움이 발생할 수 있습니다.</p>

                <h3 className="font-semibold text-slate-900">제9조 (개인정보 보호책임자)</h3>
                <p>회사는 개인정보 처리에 관한 업무를 총괄하여 책임지고, 개인정보 처리와 관련된 정보주체의 불만처리 및 피해구제와 권리행사를 위하여 다음과 같이 개인정보 보호책임자를 지정하여 운영하고 있습니다:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>성명:</strong> 정도천</li>
                  <li><strong>직책:</strong> 대표이사</li>
                  <li><strong>연락처:</strong> 02-333-7334</li>
                  <li><strong>이메일:</strong> support@traystorage.net</li>
                </ul>

                <h3 className="font-semibold text-slate-900">제10조 (정보주체의 권익침해에 대한 구제방법)</h3>
                <p>정보주체는 아래의 기관에 개인정보 침해에 대한 피해구제, 상담 등을 문의할 수 있습니다:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>개인정보침해 신고센터 (한국인터넷진흥원 운영):</strong> (국번없이) 118, privacy.kisa.or.kr</li>
                  <li><strong>개인정보 분쟁조정위원회:</strong> (국번없이) 1833-6972, www.kopico.go.kr</li>
                  <li><strong>대검찰청 사이버수사과:</strong> (국번없이) 1301, www.spo.go.kr</li>
                  <li><strong>경찰청 사이버범죄 신고시스템(ECRM):</strong> (국번없이) 182, ecrm.cyber.go.kr</li>
                </ul>

                <h3 className="font-semibold text-slate-900">제11조 (개인정보 처리방침의 변경 및 시행)</h3>
                <p>회사가 본 개인정보 처리방침을 변경하는 경우에는, 변경내용 시행 7일 전부터 정보주체가 알 수 있도록 변경 전·후의 내용을 비교하여 공지합니다.</p>
                <p className="font-semibold">본 개인정보 처리방침은 2026. 2. 1.부터 시행합니다.</p>
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
