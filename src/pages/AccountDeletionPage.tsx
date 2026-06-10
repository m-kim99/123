import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, AlertTriangle, AlertCircle, ArrowLeft, Mail, Lock, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/hooks/use-toast';

export function AccountDeletionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [step, setStep] = useState<'info' | 'login' | 'confirm'>('info');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [confirmText, setConfirmText] = useState('');
  const [agreements, setAgreements] = useState({
    dataLoss: false,
    noRecovery: false,
    gracePeriod: false,
  });
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestComplete, setRequestComplete] = useState(false);

  useEffect(() => {
    if (user) {
      setStep('confirm');
    }
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setLoginError(t('login.invalidCredentials', { defaultValue: '이메일 또는 비밀번호가 올바르지 않습니다.' }));
        return;
      }

      setStep('confirm');
    } catch (error) {
      setLoginError(t('common.error', { defaultValue: '오류가 발생했습니다.' }));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRequestDeletion = async () => {
    if (!user) return;

    if (confirmText !== t('profile.deleteKeyword', { defaultValue: '탈퇴' })) {
      toast({
        title: t('profile.deleteKeywordError', { defaultValue: '확인 문구 오류' }),
        description: t('profile.deleteKeywordErrorDesc', { defaultValue: '"탈퇴"를 정확히 입력해주세요.' }),
        variant: 'destructive',
      });
      return;
    }

    if (!agreements.dataLoss || !agreements.noRecovery || !agreements.gracePeriod) {
      toast({
        title: t('profile.agreementRequired', { defaultValue: '동의 필요' }),
        description: t('profile.agreementRequiredDesc', { defaultValue: '모든 항목에 동의해주세요.' }),
        variant: 'destructive',
      });
      return;
    }

    setIsRequesting(true);

    try {
      const { data: existingRequest } = await supabase
        .from('account_deletion_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingRequest) {
        toast({
          title: t('profile.alreadyRequested', { defaultValue: '이미 신청됨' }),
          description: t('profile.alreadyRequestedDesc', { defaultValue: '이미 탈퇴 신청이 접수되어 있습니다.' }),
          variant: 'destructive',
        });
        setIsRequesting(false);
        return;
      }

      const { error: insertError } = await supabase
        .from('account_deletion_requests')
        .insert({
          user_id: user.id,
        });

      if (insertError) throw insertError;

      setRequestComplete(true);

      setTimeout(async () => {
        await logout();
        navigate('/');
      }, 3000);
    } catch (error) {
      console.error('탈퇴 신청 실패:', error);
      toast({
        title: t('profile.deleteRequestError', { defaultValue: '탈퇴 신청 실패' }),
        description: t('common.tryAgain', { defaultValue: '다시 시도해주세요.' }),
        variant: 'destructive',
      });
    } finally {
      setIsRequesting(false);
    }
  };

  const scheduledDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('ko-KR');

  if (requestComplete) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-[#f8f9fa] dark:bg-[#0b1220] p-4">
        <div className="w-full max-w-[420px]">
          <div className="bg-white dark:bg-[#111827] rounded-[16px] border border-[#e5e7eb] dark:border-white/[0.08] shadow-sm p-6 sm:p-8 text-center">
            <div className="w-14 h-14 rounded-[14px] bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
              <svg className="h-7 w-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-[22px] font-bold tracking-tight text-slate-900 dark:text-[#f1f5f9]">
              {t('profile.deleteRequestComplete', { defaultValue: '탈퇴 신청 완료' })}
            </h1>
            <p className="text-[13px] text-slate-500 dark:text-[#94a3b8] mt-2.5 mb-6">
              {t('profile.deleteRequestDesc', { defaultValue: '14일 후에 계정이 영구 삭제됩니다.' })}
            </p>
            <div className="bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-white/[0.08] rounded-lg p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-[#94a3b8]">{t('profile.scheduledDeleteDate', { defaultValue: '예정 삭제일' })}</span>
                <strong className="text-slate-900 dark:text-[#f1f5f9] font-mono">{scheduledDate}</strong>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4">
              {t('profile.redirecting', { defaultValue: '잠시 후 로그인 페이지로 이동합니다...' })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen flex flex-col bg-[#f8f9fa] dark:bg-[#0b1220] p-4">
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-[480px]">
          {/* Back button */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-[#94a3b8] hover:text-slate-700 dark:hover:text-[#cbd5e1] mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('common.back', { defaultValue: '돌아가기' })}
          </button>

          <div className="bg-white dark:bg-[#111827] rounded-[16px] border border-[#e5e7eb] dark:border-white/[0.08] shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-[12px] bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900 dark:text-[#f1f5f9]">
                    {t('profile.deleteAccountTitle', { defaultValue: '계정 삭제' })}
                  </h1>
                  <p className="text-[13px] text-slate-500 dark:text-[#94a3b8]">
                    {t('profile.deleteAccountDesc', { defaultValue: '탈퇴 신청 후 14일 이내 철회 가능' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Step: Info */}
            {step === 'info' && (
              <div className="p-6">
                <div className="space-y-4 mb-6">
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-sm text-amber-900 dark:text-amber-200 flex gap-2.5">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <strong className="block mb-1">{t('profile.deleteDataWarning', { defaultValue: '탈퇴 시 삭제되는 데이터' })}</strong>
                      <ul className="list-disc pl-4 space-y-0.5 text-[13px]">
                        <li>{t('profile.deleteWarning1', { defaultValue: '업로드한 모든 문서' })}</li>
                        <li>{t('profile.deleteWarning2', { defaultValue: '카테고리 및 폴더 구조' })}</li>
                        <li>{t('profile.deleteWarning3', { defaultValue: '공유 설정 및 권한' })}</li>
                      </ul>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-white/[0.08] text-sm">
                    <div className="flex justify-between mb-2">
                      <span className="text-slate-500 dark:text-[#94a3b8]">{t('profile.gracePeriod', { defaultValue: '유예 기간' })}</span>
                      <strong className="text-slate-900 dark:text-[#f1f5f9]">14{t('common.days', { defaultValue: '일' })}</strong>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-[#94a3b8]">
                      {t('profile.gracePeriodDesc', { defaultValue: '탈퇴 신청 후 14일 동안 로그인하면 탈퇴가 자동 철회됩니다.' })}
                    </p>
                  </div>
                </div>

                <Button
                  className="w-full h-[42px] rounded-[10px] font-semibold"
                  onClick={() => setStep(user ? 'confirm' : 'login')}
                >
                  {user ? t('common.continue', { defaultValue: '계속하기' }) : t('common.loginToContinue', { defaultValue: '로그인하여 계속' })}
                </Button>
              </div>
            )}

            {/* Step: Login */}
            {step === 'login' && (
              <form onSubmit={handleLogin} className="p-6 space-y-4">
                <p className="text-sm text-slate-600 dark:text-[#94a3b8] mb-4">
                  {t('profile.loginToDelete', { defaultValue: '계정 삭제를 위해 로그인해주세요.' })}
                </p>

                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium text-slate-900 dark:text-[#f1f5f9]">
                    {t('login.email', { defaultValue: '이메일' })}
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="email"
                      className="h-[42px] pl-10 rounded-[10px]"
                      placeholder={t('login.emailPlaceholder', { defaultValue: 'example@email.com' })}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium text-slate-900 dark:text-[#f1f5f9]">
                    {t('login.password', { defaultValue: '비밀번호' })}
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="password"
                      className="h-[42px] pl-10 rounded-[10px]"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {loginError && (
                  <p className="text-sm text-red-500">{loginError}</p>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-[42px] rounded-[10px]"
                    onClick={() => setStep('info')}
                  >
                    {t('common.back', { defaultValue: '뒤로' })}
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-[42px] rounded-[10px] font-semibold"
                    disabled={isLoggingIn}
                  >
                    {isLoggingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : t('login.login', { defaultValue: '로그인' })}
                  </Button>
                </div>
              </form>
            )}

            {/* Step: Confirm */}
            {step === 'confirm' && user && (
              <div className="p-6 space-y-4">
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-900 dark:text-red-200 flex gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                  <div>
                    <strong className="block mb-1">{t('profile.deleteWarning', { defaultValue: '주의사항' })}</strong>
                    <p className="text-[13px]">{t('profile.deleteIrreversible', { defaultValue: '삭제된 데이터는 복구할 수 없습니다.' })}</p>
                  </div>
                </div>

                <div className="space-y-3 border-t border-slate-100 dark:border-white/[0.06] pt-4">
                  <p className="text-xs font-semibold text-slate-500 dark:text-[#94a3b8]">
                    {t('profile.agreementSection', { defaultValue: '동의 항목' })}
                  </p>
                  
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <Checkbox
                      checked={agreements.dataLoss}
                      onCheckedChange={(checked) => setAgreements(prev => ({ ...prev, dataLoss: !!checked }))}
                      className="mt-0.5"
                    />
                    <span className="text-sm text-slate-700 dark:text-[#cbd5e1]">
                      {t('profile.agreeDataLoss', { defaultValue: '모든 문서와 데이터가 삭제됨을 이해합니다.' })}
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <Checkbox
                      checked={agreements.noRecovery}
                      onCheckedChange={(checked) => setAgreements(prev => ({ ...prev, noRecovery: !!checked }))}
                      className="mt-0.5"
                    />
                    <span className="text-sm text-slate-700 dark:text-[#cbd5e1]">
                      {t('profile.agreeNoRecovery', { defaultValue: '삭제 후 복구가 불가능함을 이해합니다.' })}
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <Checkbox
                      checked={agreements.gracePeriod}
                      onCheckedChange={(checked) => setAgreements(prev => ({ ...prev, gracePeriod: !!checked }))}
                      className="mt-0.5"
                    />
                    <span className="text-sm text-slate-700 dark:text-[#cbd5e1]">
                      {t('profile.agreeGracePeriod', { defaultValue: '14일 유예 기간에 대해 이해합니다.' })}
                    </span>
                  </label>
                </div>

                <div className="space-y-1.5 border-t border-slate-100 dark:border-white/[0.06] pt-4">
                  <Label className="text-[13px] font-medium text-slate-900 dark:text-[#f1f5f9]">
                    {t('profile.deleteConfirmLabel', { defaultValue: '확인을 위해 "탈퇴"를 입력하세요' })}
                  </Label>
                  <Input
                    type="text"
                    className="h-[42px] rounded-[10px]"
                    placeholder={t('profile.deleteKeyword', { defaultValue: '탈퇴' })}
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                  />
                </div>

                <div className="bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-white/[0.08] rounded-lg p-3 text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-500 dark:text-[#94a3b8]">{t('profile.account', { defaultValue: '계정' })}</span>
                    <strong className="text-slate-900 dark:text-[#f1f5f9]">{user.email}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-[#94a3b8]">{t('profile.scheduledDeleteDate', { defaultValue: '예정 삭제일' })}</span>
                    <strong className="text-slate-900 dark:text-[#f1f5f9] font-mono">{scheduledDate}</strong>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-[42px] rounded-[10px]"
                    onClick={() => {
                      logout();
                      setStep('info');
                    }}
                    disabled={isRequesting}
                  >
                    {t('common.cancel', { defaultValue: '취소' })}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="flex-1 h-[42px] rounded-[10px] font-semibold"
                    onClick={handleRequestDeletion}
                    disabled={isRequesting || confirmText !== t('profile.deleteKeyword', { defaultValue: '탈퇴' }) || !agreements.dataLoss || !agreements.noRecovery || !agreements.gracePeriod}
                  >
                    {isRequesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {t('profile.requestDeletion', { defaultValue: '탈퇴 신청' })}
                  </Button>
                </div>
              </div>
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
