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
import { useDocumentStore } from '@/store/documentStore';
import { toast } from '@/hooks/use-toast';
import logo from '@/assets/logo.png';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupRole, setSignupRole] = useState<'admin' | 'team'>('team');
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    departmentId: '',
  });
  const navigate = useNavigate();
  const { departments } = useDocumentStore();
  const { login, signup, isLoading, error, clearError } = useAuthStore();

  const resetSignupForm = () => {
    setSignupForm({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      departmentId: '',
    });
  };

  const handleLogin = async (role: 'admin' | 'team') => {
    clearError();

    const result = await login(email, password, role);

    if (result.success) {
      toast({
        title: '로그인 성공',
        description: '환영합니다.',
      });
      navigate(role === 'admin' ? '/admin' : '/team');
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
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex justify-center items-center gap-2">
            <img
              src={logo}
              alt="문서 관리 시스템 로고"
              className="h-16"
            />
            <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">
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
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <div className="px-6 pb-4 text-center">
          <p className="text-xs text-slate-400">
            COPYRIGHT © TRAYSTORAGE CONNECT. ALL RIGHTS RESERVED.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            (주의)본 솔루션에 사용된 모든 기술은 등록특허(제10-2843883, 제10-2731096) 및 출원특허로 보호받고 있습니다.
          </p>
        </div>
      </Card>

      {signupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>회원가입</CardTitle>
              <CardDescription>새 계정을 생성합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs
                value={signupRole}
                onValueChange={(v) => setSignupRole(v as 'admin' | 'team')}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="admin">관리자</TabsTrigger>
                  <TabsTrigger value="team">팀원</TabsTrigger>
                </TabsList>
              </Tabs>

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
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="부서를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              <Button onClick={handleSignup} disabled={isLoading}>
                {isLoading ? '가입 중...' : '회원가입'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
