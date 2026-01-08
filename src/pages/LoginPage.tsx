import { useState } from 'react';
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

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupRole, setSignupRole] = useState<'admin' | 'team'>('team');
  const [companyCodeVerified, setCompanyCodeVerified] = useState(false);
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
    <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="flex flex-col items-center">
        <Card className="w-full max-w-md mx-auto">
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
              우리 회사 문서, AI로 스마트하게 관리하세요.
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
                      placeholder="admin@company.com"
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
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? '로그인 중...' : '관리자 로그인'}
                  </Button>
                  <p className="text-xs text-center text-slate-500">
                    계정이 없으신가요?{' '}
                    <Button
                      type="button"
                      variant="link"
                      className="text-white hover:text-white/80 px-4 h-auto"
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
                      className="w-full flex items-center justify-center gap-2 bg-white"
                      onClick={handleGoogleLogin}
                    >
                      <img src={googleLogo} alt="Google" className="h-5 w-5" />
                      <span className="text-sm text-black">Google 계정으로 계속하기</span>
                    </Button>
                  </div>
                  <div className="mt-2 flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2 bg-white text-black"
                      onClick={handleAppleLogin}
                    >
                      <img src={appleLogo} alt="Apple" className="h-5 w-5" />
                      <span className="text-sm">Apple 계정으로 계속하기</span>
                    </Button>
                  </div>
                  <div className="mt-2 flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2 bg-white text-black"
                      onClick={handleKakaoLogin}
                    >
                      <img src={kakaoLogo} alt="Kakao" className="h-5 w-5" />
                      <span className="text-sm">Kakao 계정으로 계속하기</span>
                    </Button>
                  </div>
                  <div className="mt-2 flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2 bg-white text-black"
                      onClick={handleNaverLogin}
                    >
                      <img src={naverLogo} alt="Naver" className="h-5 w-5" />
                      <span className="text-sm">Naver 계정으로 계속하기</span>
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
                    <Label htmlFor="team-email">이메일</Label>
                    <Input
                      id="team-email"
                      type="email"
                      placeholder="team@company.com"
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
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? '로그인 중...' : '팀원 로그인'}
                  </Button>
                  <p className="text-xs text-center text-slate-500">
                    계정이 없으신가요?{' '}
                    <Button
                      type="button"
                      variant="link"
                      className="text-white hover:text-white/80 px-4 h-auto"
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
                      className="w-full flex items-center justify-center gap-2 bg-white"
                      onClick={handleGoogleLogin}
                    >
                      <img src={googleLogo} alt="Google" className="h-5 w-5" />
                      <span className="text-sm text-black">Google 계정으로 계속하기</span>
                    </Button>
                  </div>
                  <div className="mt-2 flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2 bg-white text-black"
                      onClick={handleAppleLogin}
                    >
                      <img src={appleLogo} alt="Apple" className="h-5 w-5" />
                      <span className="text-sm">Apple 계정으로 계속하기</span>
                    </Button>
                  </div>
                  <div className="mt-2 flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2 bg-white text-black"
                      onClick={handleKakaoLogin}
                    >
                      <img src={kakaoLogo} alt="Kakao" className="h-5 w-5" />
                      <span className="text-sm">Kakao 계정으로 계속하기</span>
                    </Button>
                  </div>
                  <div className="mt-2 flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2 bg-white text-black"
                      onClick={handleNaverLogin}
                    >
                      <img src={naverLogo} alt="Naver" className="h-5 w-5" />
                      <span className="text-sm">Naver 계정으로 계속하기</span>
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="mt-4 text-center">
          <p className="text-xs text-black">
            COPYRIGHT © TRAYSTORAGE CONNECT. ALL RIGHTS RESERVED.
          </p>
          <p className="text-xs text-black mt-1">
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

              <div className="space-y-2">
                <Label>비밀번호</Label>
                <Input
                  type="password"
                  placeholder="최소 6자"
                  value={signupForm.password}
                  onChange={(e) =>
                    setSignupForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                />
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
                  (signupRole === 'team' && !signupForm.departmentId)
                }
              >
                {isLoading ? '가입 중...' : '회원가입'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
