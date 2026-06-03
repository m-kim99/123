import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOperatorStore } from '@/store/operatorStore';
import { useToast } from '@/hooks/use-toast';

export function OperatorLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { operatorLogin, isLoading } = useOperatorStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: '입력 오류',
        description: '이메일과 비밀번호를 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    const result = await operatorLogin(email, password);

    if (result.success) {
      toast({
        title: '로그인 성공',
        description: '운영자 페이지에 접속했습니다.',
      });
      navigate('/operator');
    } else {
      toast({
        title: '로그인 실패',
        description: result.error || '이메일 또는 비밀번호를 확인해주세요.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/20 mb-4">
            <Shield className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">운영자 로그인</h1>
          <p className="text-slate-400 mt-2">TrayStorage 관리 시스템</p>
        </div>

        {/* Login Form */}
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200">
                이메일
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@traystorage.com"
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200">
                비밀번호
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-6">
          운영자 계정 문제는 시스템 관리자에게 문의하세요.
        </p>
      </div>
    </div>
  );
}
