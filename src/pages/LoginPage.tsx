import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [formError, setFormError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { departments } = useDocumentStore();
  const { login, signup, isLoading, error, clearError } = useAuthStore();

  const resetErrors = () => {
    setFormError(null);
    clearError();
  };

  const handleLogin = async (role: 'admin' | 'team') => {
    resetErrors();
    const { success, error: loginError } = await login(email, password, role);

    if (success) {
      toast({
        title: '로그인 성공',
        description: '환영합니다.',
      });
      navigate(role === 'admin' ? '/admin' : '/team');
    } else if (loginError) {
      setFormError(loginError);
    }
  };

  const handleSignup = async (role: 'admin' | 'team') => {
    resetErrors();

    if (!name.trim()) {
      setFormError('이름을 입력하세요.');
      return;
    }

    if (!email.trim()) {
      setFormError('이메일을 입력하세요.');
      return;
    }

    if (!password) {
      setFormError('비밀번호를 입력하세요.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (role === 'team' && !departmentId) {
      setFormError('부서를 선택하세요.');
      return;
    }

    const { success, error: signupError } = await signup(
      email,
      password,
      name,
      role,
      role === 'team' ? departmentId : undefined
    );

    if (success) {
      toast({
        title: '회원가입 완료',
        description: '이메일로 전송된 안내에 따라 로그인하세요.',
      });
      setMode('login');
      setPassword('');
      setConfirmPassword('');
    } else if (signupError) {
      setFormError(signupError);
    }
  };

  const displayError = formError || error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-slate-900 p-3 rounded-xl">
              <FileText className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">문서 관리 시스템</CardTitle>
          <CardDescription>계정으로 로그인하거나 새로 회원가입하세요</CardDescription>
        </CardHeader>
        <CardContent>
          {displayError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>오류</AlertTitle>
              <AlertDescription>{displayError}</AlertDescription>
            </Alert>
          )}
          <Tabs defaultValue="admin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="admin">관리자</TabsTrigger>
              <TabsTrigger value="team">팀원</TabsTrigger>
            </TabsList>
            <TabsContent value="admin">
              {mode === 'login' ? (
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
                    <button
                      type="button"
                      className="text-blue-600 hover:underline"
                      onClick={() => {
                        setMode('signup');
                        resetErrors();
                      }}
                    >
                      회원가입
                    </button>
                  </p>
                </form>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await handleSignup('admin');
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="admin-name">이름</Label>
                    <Input
                      id="admin-name"
                      type="text"
                      placeholder="이름을 입력하세요"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
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
                  <div className="space-y-2">
                    <Label htmlFor="admin-password-confirm">비밀번호 확인</Label>
                    <Input
                      id="admin-password-confirm"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? '회원가입 중...' : '관리자 회원가입'}
                  </Button>
                  <p className="text-xs text-center text-slate-500">
                    이미 계정이 있으신가요?{' '}
                    <button
                      type="button"
                      className="text-blue-600 hover:underline"
                      onClick={() => {
                        setMode('login');
                        resetErrors();
                      }}
                    >
                      로그인
                    </button>
                  </p>
                </form>
              )}
            </TabsContent>
            <TabsContent value="team">
              {mode === 'login' ? (
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
                    <button
                      type="button"
                      className="text-blue-600 hover:underline"
                      onClick={() => {
                        setMode('signup');
                        resetErrors();
                      }}
                    >
                      회원가입
                    </button>
                  </p>
                </form>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await handleSignup('team');
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="team-name">이름</Label>
                    <Input
                      id="team-name"
                      type="text"
                      placeholder="이름을 입력하세요"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
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
                    <Label>부서</Label>
                    <Select
                      value={departmentId}
                      onValueChange={(value) => setDepartmentId(value)}
                      disabled={isLoading}
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
                  <div className="space-y-2">
                    <Label htmlFor="team-password-confirm">비밀번호 확인</Label>
                    <Input
                      id="team-password-confirm"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? '회원가입 중...' : '팀원 회원가입'}
                  </Button>
                  <p className="text-xs text-center text-slate-500">
                    이미 계정이 있으신가요?{' '}
                    <button
                      type="button"
                      className="text-blue-600 hover:underline"
                      onClick={() => {
                        setMode('login');
                        resetErrors();
                      }}
                    >
                      로그인
                    </button>
                  </p>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
