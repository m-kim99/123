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

  /**
   * PASSWORD_RECOVERY 이벤트 수신 여부를 추적
   * - 이메일 재설정 링크를 통해 진입한 경우에만 true
   * - 일반 로그인 세션으로 직접 /reset-password 접근 시 false → 폼 비활성화
   */
  const [isRecoverySession, setIsRecoverySession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    // Supabase는 이메일 재설정 링크의 URL 해시(#access_token=...&type=recovery)를 파싱해
    // PASSWORD_RECOVERY 이벤트를 발화함. 이 이벤트가 없으면 유효한 재설정 세션이 아님.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoverySession(true);
      }
      setIsCheckingSession(false);
    });

    // 초기 세션 확인: 이미 PASSWORD_RECOVERY 세션이 활성화된 경우 처리
    supabase.auth.getSession().then(({ data: { session } }) => {
      // 세션이 없으면 복구 세션도 없음
      if (!session) {
        setIsCheckingSession(false);
      }
      // 세션이 있어도 PASSWORD_RECOVERY 이벤트를 기다림 (onAuthStateChange가 처리)
    });

    return () => subscription.unsubscribe();
  }, []);

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

    if (!isRecoverySession) {
      toast({
        title: '유효하지 않은 접근',
        description: '비밀번호 재설정 이메일 링크를 통해 접근해주세요.',
        variant: 'destructive',
      });
      return;
    }

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

      // 재설정 완료 후 세션 종료 및 로그인 페이지로 이동
      await supabase.auth.signOut();
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

  // 세션 확인 중 로딩 표시
  if (isCheckingSession) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <p className="text-slate-500">확인 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="flex-1 flex items-center justify-center">
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
              {isRecoverySession
                ? '새로운 비밀번호를 입력해주세요'
                : '유효하지 않은 접근입니다. 비밀번호 재설정 이메일 링크를 사용해주세요.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isRecoverySession ? (
              <Button
                className="w-full"
                variant="outline"
                onClick={() => navigate('/', { replace: true })}
              >
                로그인 페이지로 이동
              </Button>
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>

      <div className="text-center py-4">
        <p className="text-xs text-black">
          COPYRIGHT © TRAYSTORAGE CONNECT. ALL RIGHTS RESERVED.
        </p>
      </div>
    </div>
  );
}
