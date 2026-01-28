import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import logo from '@/assets/logo.png';
import { validatePasswordClient, PasswordValidation } from '@/lib/password-validator';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation | null>(null);

  // 비밀번호 실시간 검증
  useEffect(() => {
    if (newPassword) {
      const validation = validatePasswordClient(newPassword);
      setPasswordValidation(validation);
    } else {
      setPasswordValidation(null);
    }
  }, [newPassword]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast({
        title: '입력 오류',
        description: '모든 필드를 입력해주세요',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: '비밀번호 불일치',
        description: '비밀번호가 일치하지 않습니다',
        variant: 'destructive',
      });
      return;
    }

    // 비밀번호 검증
    if (passwordValidation && !passwordValidation.isValid) {
      toast({
        title: '비밀번호 오류',
        description: passwordValidation.errors.join(', '),
        variant: 'destructive',
      });
      return;
    }

    setIsResetting(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: '비밀번호 재설정 완료',
        description: '새 비밀번호로 로그인해주세요',
      });

      // 로그인 페이지로 이동
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 1500);
    } catch (error: any) {
      console.error('비밀번호 재설정 오류:', error);
      toast({
        title: '재설정 실패',
        description: error?.message || '다시 시도해주세요',
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex flex-row justify-center items-center gap-2">
            <img
              src={logo}
              alt="문서 관리 시스템 로고"
              className="h-14 sm:h-16 w-auto object-contain"
            />
          </CardTitle>
          <CardDescription className="mt-4">
            새로운 비밀번호를 입력해주세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">새 비밀번호</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="8자 이상, 대/소문자, 숫자, 특수문자 포함"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isResetting}
                required
              />
              {passwordValidation && !passwordValidation.isValid && newPassword && (
                <p className="text-[11px] text-red-500 mt-1">
                  ⚠️ {passwordValidation.errors.join(' / ')}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">비밀번호 확인</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="비밀번호 재입력"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isResetting}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isResetting}>
              {isResetting ? '재설정 중...' : '비밀번호 재설정'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-4 text-center absolute bottom-4">
        <p className="text-xs text-black">
          COPYRIGHT © TRAYSTORAGE CONNECT. ALL RIGHTS RESERVED.
        </p>
      </div>
    </div>
  );
}
