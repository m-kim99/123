import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleLogin = (role: 'admin' | 'team') => {
    if (login(email, password, role)) {
      navigate(role === 'admin' ? '/admin' : '/team');
    }
  };

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
          <CardDescription>계정으로 로그인하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="admin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="admin">관리자</TabsTrigger>
              <TabsTrigger value="team">팀원</TabsTrigger>
            </TabsList>
            <TabsContent value="admin">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleLogin('admin');
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
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-[#FF8C42] hover:bg-[#FF7A2E]">
                  관리자 로그인
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="team">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleLogin('team');
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
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-[#10B981] hover:bg-[#059669]">
                  팀원 로그인
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
