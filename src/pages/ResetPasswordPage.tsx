import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { validatePasswordClient, PasswordValidation } from '@/lib/password-validator';

export function ResetPasswordPage() {
  const { t } = useTranslation();
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
        title: t('resetPw.invalidAccess'),
        description: t('resetPw.useEmailLink'),
        variant: 'destructive',
      });
      return;
    }

    if (!newPassword || !confirmPassword) {
      toast({
        title: t('announcements.inputError'),
        description: t('onboarding.fillAllFields'),
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: t('resetPw.passwordMismatch'),
        description: t('resetPw.passwordMismatchDesc'),
        variant: 'destructive',
      });
      return;
    }

    // 비밀번호 검증
    if (passwordValidation && !passwordValidation.isValid) {
      toast({
        title: t('resetPw.passwordError'),
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
        title: t('resetPw.resetComplete'),
        description: t('resetPw.resetCompleteDesc'),
      });

      // 재설정 완료 후 세션 종료 및 로그인 페이지로 이동
      await supabase.auth.signOut();
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 1500);
    } catch (error: any) {
      console.error('비밀번호 재설정 오류:', error);
      toast({
        title: t('resetPw.resetFailed'),
        description: error?.message || t('common.tryAgain'),
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  };

  // 세션 확인 중 로딩 표시
  if (isCheckingSession) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-[#f8f9fa] dark:bg-[#0b1220]">
        <p className="text-slate-500 dark:text-[#94a3b8]">{t('resetPw.checking')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen flex flex-col bg-[#f8f9fa] dark:bg-[#0b1220] p-4">
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-[420px]">
          <div className="bg-white dark:bg-[#111827] rounded-[16px] border border-[#e5e7eb] dark:border-white/[0.08] shadow-sm p-6 sm:p-8">
            {/* Lock icon header */}
            <div className="flex justify-center mb-5">
              <div className="w-14 h-14 rounded-[14px] bg-[#eff6ff] dark:bg-[rgba(59,130,246,0.16)] flex items-center justify-center">
                <Lock className="h-7 w-7 text-[#2563eb] dark:text-[#60a5fa]" />
              </div>
            </div>

            <h1 className="text-[22px] font-bold tracking-tight text-center text-slate-900 dark:text-[#f1f5f9]">
              {isRecoverySession ? t('resetPw.newPassword') : t('resetPw.invalidAccess')}
            </h1>
            <p className="text-[13px] text-slate-500 dark:text-[#94a3b8] text-center mt-2.5 mb-6">
              {isRecoverySession ? t('resetPw.enterNewPassword') : t('resetPw.invalidAccessDesc')}
            </p>

            {!isRecoverySession ? (
              <Button
                className="w-full h-[42px] rounded-[10px]"
                variant="outline"
                onClick={() => navigate('/', { replace: true })}
              >
                {t('resetPw.goToLogin')}
              </Button>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-password" className="text-[13px] font-medium text-slate-900 dark:text-[#f1f5f9]">
                    {t('resetPw.newPassword')}
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    className="h-[42px] rounded-[10px]"
                    placeholder={t('signup.passwordPlaceholder')}
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

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password" className="text-[13px] font-medium text-slate-900 dark:text-[#f1f5f9]">
                    {t('signup.confirmPassword')}
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    className="h-[42px] rounded-[10px]"
                    placeholder={t('signup.confirmPasswordPlaceholder')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isResetting}
                    required
                  />
                </div>

                <Button type="submit" className="w-full h-[42px] rounded-[10px] font-semibold" disabled={isResetting}>
                  {isResetting ? t('resetPw.resetting') : t('resetPw.resetButton')}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="text-center py-4">
        <p className="text-xs text-slate-500 dark:text-[#64748b]">
          COPYRIGHT © TRAYSTORAGE CONNECT. ALL RIGHTS RESERVED.
        </p>
      </div>
    </div>
  );
}
