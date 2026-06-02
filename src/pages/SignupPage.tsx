import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthShell } from '@/components/AuthShell';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { validatePasswordClient, PasswordValidation } from '@/lib/password-validator';
import { TermsOfServiceContent } from '@/components/terms/TermsOfService';
import { PrivacyPolicyContent } from '@/components/terms/PrivacyPolicy';

export function SignupPage() {
  const { t, i18n } = useTranslation();
  const isKorean = i18n.language === 'ko';
  const navigate = useNavigate();
  const { signup, isLoading, error, clearError } = useAuthStore();

  const [signupRole, setSignupRole] = useState<'admin' | 'team'>('team');
  const [signupForm, setSignupForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    departmentId: '',
    companyCode: '',
    companyName: '',
  });

  const [termsPopupType, setTermsPopupType] = useState<'tos' | 'privacy' | null>(null);
  const [agreeAll, setAgreeAll] = useState(false);
  const [agreeAge, setAgreeAge] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation | null>(null);

  const [adminPhone, setAdminPhone] = useState('');
  const [adminOtp, setAdminOtp] = useState('');
  const [adminOtpSent, setAdminOtpSent] = useState(false);
  const [adminOtpVerified, setAdminOtpVerified] = useState(false);
  const [isSendingAdminOtp, setIsSendingAdminOtp] = useState(false);
  const [isVerifyingAdminOtp, setIsVerifyingAdminOtp] = useState(false);
  const [emailChecked, setEmailChecked] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailCheckResult, setEmailCheckResult] = useState<string | null>(null);
  const [companyCodeChecked, setCompanyCodeChecked] = useState(false);
  const [isCheckingCompanyCode, setIsCheckingCompanyCode] = useState(false);
  const [companyCodeCheckResult, setCompanyCodeCheckResult] = useState<string | null>(null);

  // 비밀번호 실시간 검증
  useEffect(() => {
    if (signupForm.password) {
      const validation = validatePasswordClient(signupForm.password);
      setPasswordValidation(validation);
    } else {
      setPasswordValidation(null);
    }
  }, [signupForm.password]);

  const allAgreed = agreeAge && agreeTerms && agreePrivacy;

  const handleAgreeAll = (checked: boolean) => {
    setAgreeAll(checked);
    setAgreeAge(checked);
    setAgreeTerms(checked);
    setAgreePrivacy(checked);
  };

  useEffect(() => {
    setAgreeAll(agreeAge && agreeTerms && agreePrivacy);
  }, [agreeAge, agreeTerms, agreePrivacy]);

  const handleEmailCheck = async () => {
    const emailToCheck = signupForm.email.trim();
    if (!emailToCheck) return;

    setIsCheckingEmail(true);
    setEmailCheckResult(null);
    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', emailToCheck)
        .maybeSingle();

      if (existingUser) {
        setEmailChecked(false);
        setEmailCheckResult(t('signup.emailAlreadyExists'));
      } else {
        setEmailChecked(true);
        setEmailCheckResult(t('signup.emailAvailable'));
      }
    } catch {
      setEmailCheckResult(t('signup.emailCheckFailed'));
      setEmailChecked(false);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const normalizePhone = (raw: string) => (raw || '').replace(/\D/g, '');

  const validateCompanyCode = (code: string): boolean => {
    const regex = /^[A-Za-z0-9]{12}$/;
    return regex.test(code);
  };

  const handleCompanyCodeCheck = async () => {
    const codeToCheck = signupForm.companyCode.trim().toUpperCase();
    if (!codeToCheck) return;

    if (!validateCompanyCode(codeToCheck)) {
      setCompanyCodeChecked(false);
      setCompanyCodeCheckResult(t('signup.companyCodeInvalidFormat'));
      return;
    }

    setIsCheckingCompanyCode(true);
    setCompanyCodeCheckResult(null);
    try {
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('code', codeToCheck)
        .maybeSingle();

      if (existingCompany) {
        setCompanyCodeChecked(false);
        setCompanyCodeCheckResult(t('signup.companyCodeAlreadyExists'));
      } else {
        setCompanyCodeChecked(true);
        setCompanyCodeCheckResult(t('signup.companyCodeAvailable'));
        setSignupForm(prev => ({ ...prev, companyCode: codeToCheck }));
      }
    } catch {
      setCompanyCodeCheckResult(t('signup.companyCodeCheckFailed'));
      setCompanyCodeChecked(false);
    } finally {
      setIsCheckingCompanyCode(false);
    }
  };

  const handleSendAdminOtp = async () => {
    const phone = normalizePhone(adminPhone);

    if (!phone || phone.length < 10 || phone.length > 11) {
      toast({
        title: t('signup.phoneInput'),
        description: t('signup.phoneInputDesc'),
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
        let errMsg = fnError.message || t('signup.smsSendFailed');
        try {
          const errBody = await fnError.context?.json();
          if (errBody?.error) errMsg = errBody.error;
        } catch {}
        throw new Error(errMsg);
      }

      if (!data?.success) {
        throw new Error(data?.error || data?.message || t('signup.smsSendFailed'));
      }

      setAdminOtpSent(true);
      setAdminOtpVerified(false);
      setAdminOtp('');

      toast({
        title: t('signup.otpSent'),
        description: t('signup.otpSentDesc'),
      });
    } catch (err: any) {
      toast({
        title: t('signup.otpSendFailed'),
        description: err?.message || t('signup.otpSendFailedDesc'),
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
        title: t('signup.phoneInput'),
        description: t('signup.phoneCheckDesc'),
        variant: 'destructive',
      });
      return;
    }

    if (!adminOtpSent) {
      toast({
        title: t('signup.sendOtpFirst'),
        description: t('signup.sendOtpFirstDesc'),
        variant: 'destructive',
      });
      return;
    }

    if (!code) {
      toast({
        title: t('signup.enterOtp'),
        description: t('signup.enterOtpDesc'),
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
        throw new Error(fnError.message || t('signup.verifyFailed'));
      }

      if (!data?.success) {
        throw new Error(data?.error || t('signup.verifyFailed'));
      }

      setAdminOtpVerified(true);

      toast({
        title: t('signup.phoneVerifyComplete'),
        description: t('signup.phoneVerifyCompleteDesc'),
      });
    } catch (err: any) {
      toast({
        title: t('signup.verifyFailed'),
        description: err?.message || t('signup.verifyFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsVerifyingAdminOtp(false);
    }
  };

  const handleSignup = async () => {
    clearError();

    if (!signupForm.name || !signupForm.email || !signupForm.password) {
      toast({
        title: t('signup.inputError'),
        description: t('signup.fillAllFields'),
        variant: 'destructive',
      });
      return;
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      toast({
        title: t('signup.passwordMismatch'),
        description: t('signup.passwordMismatchDesc'),
        variant: 'destructive',
      });
      return;
    }

    if (signupForm.password.length < 6) {
      toast({
        title: t('signup.passwordError'),
        description: t('signup.passwordMinLength'),
        variant: 'destructive',
      });
      return;
    }

    if (signupRole === 'admin' && !signupForm.companyName.trim()) {
      toast({
        title: t('signup.enterCompanyName'),
        description: t('signup.enterCompanyNameDesc'),
        variant: 'destructive',
      });
      return;
    }

    if (signupRole === 'admin' && !signupForm.companyCode.trim()) {
      toast({
        title: t('signup.enterCompanyCode'),
        description: t('signup.enterCompanyCodeDesc'),
        variant: 'destructive',
      });
      return;
    }

    if (signupRole === 'admin' && !companyCodeChecked) {
      toast({
        title: t('signup.companyCodeCheckNeeded'),
        description: t('signup.companyCodeCheckNeededDesc'),
        variant: 'destructive',
      });
      return;
    }

    // 한국어 사용자만 휴대폰 인증 필수
    if (isKorean) {
      const phone = normalizePhone(adminPhone);
      if (!phone) {
        toast({
          title: t('signup.enterPhone'),
          description: signupRole === 'admin' ? t('signup.enterPhoneForAdmin') : t('signup.enterPhoneForTeam'),
          variant: 'destructive',
        });
        return;
      }

      if (!adminOtpVerified) {
        toast({
          title: t('signup.phoneVerifyNeeded'),
          description: t('signup.phoneVerifyNeededDesc'),
          variant: 'destructive',
        });
        return;
      }
    }

    const companyCodeToUse = signupForm.companyCode.trim();
    const companyNameToUse = signupRole === 'admin' ? signupForm.companyName.trim() : '';

    const result = await signup(
      signupForm.email,
      signupForm.password,
      signupForm.name,
      signupRole,
      companyCodeToUse,
      companyNameToUse,
      undefined
    );

    if (result.success) {
      toast({
        title: t('signup.signupComplete'),
        description: t('signup.signupCompleteDesc'),
      });
      navigate('/');
    } else {
      toast({
        title: t('signup.signupFailed'),
        description: result.error || t('common.tryAgain'),
        variant: 'destructive',
      });
    }
  };

  const isFormValid =
    signupForm.email &&
    signupForm.password &&
    signupForm.name &&
    emailChecked &&
    allAgreed &&
    // 한국어 사용자만 휴대폰 인증 필수
    (!isKorean || (adminPhone.trim() && adminOtpVerified)) &&
    (signupRole !== 'admin' || (signupForm.companyName.trim() && signupForm.companyCode.trim() && companyCodeChecked));

  return (
    <>
      <AuthShell
        heroHeadline={t('login.heroHeadline')}
        heroDescription={t('signup.heroDescription')}
      >
        <div className="mb-6">
          <h2 className="text-[24px] font-bold tracking-tight text-slate-900 dark:text-[#f1f5f9]">{t('signup.title')}</h2>
          <p className="text-sm text-slate-500 dark:text-[#94a3b8] mt-1">{t('signup.description')}</p>
        </div>

        <div className="space-y-4">
          <Tabs value={signupRole} onValueChange={(v) => setSignupRole(v as 'admin' | 'team')}>
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-slate-100 p-1 rounded-xl h-auto">
              <TabsTrigger
                value="admin"
                className="rounded-lg py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500 transition-all"
              >
                {t('signup.adminTab')}
              </TabsTrigger>
              <TabsTrigger
                value="team"
                className="rounded-lg py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500 transition-all"
              >
                {t('signup.teamTab')}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* 관리자: 회사명 + 회사 코드 직접 입력 */}
          {signupRole === 'admin' && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-900 dark:text-[#f1f5f9]">{t('signup.companyName')}</label>
                <Input
                  className="h-[42px] rounded-[10px]"
                  placeholder={t('signup.companyNamePlaceholder')}
                  value={signupForm.companyName}
                  onChange={(e) => setSignupForm((prev) => ({ ...prev, companyName: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-900 dark:text-[#f1f5f9]">{t('signup.companyCode')}</label>
                <div className="flex gap-2">
                  <Input
                    className="h-[42px] rounded-[10px] flex-1 uppercase"
                    placeholder={t('signup.companyCodePlaceholder')}
                    value={signupForm.companyCode}
                    maxLength={12}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                      setSignupForm((prev) => ({ ...prev, companyCode: value }));
                      setCompanyCodeChecked(false);
                      setCompanyCodeCheckResult(null);
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCompanyCodeCheck}
                    disabled={isCheckingCompanyCode || !signupForm.companyCode.trim() || signupForm.companyCode.length !== 12}
                    className="h-[42px] px-3 rounded-[10px] text-[12px] font-medium border border-[#e5e7eb] bg-white text-slate-900 hover:bg-slate-50 shrink-0 disabled:opacity-50"
                  >
                    {isCheckingCompanyCode ? t('common.checking') : t('signup.checkDuplicate')}
                  </button>
                </div>
                {companyCodeCheckResult && (
                  <p className={`text-[11.5px] ${companyCodeChecked ? 'text-emerald-600' : 'text-red-500'}`}>
                    {companyCodeCheckResult}
                  </p>
                )}
                <p className="text-[11.5px] text-slate-500 dark:text-[#94a3b8]">{t('signup.companyCodeFormatHint')}</p>
              </div>
            </>
          )}

          {/* 팀원: 기존 회사 코드로 가입 (선택) */}
          {signupRole === 'team' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-slate-900 dark:text-[#f1f5f9]">{t('signup.companyCodeOptional')}</label>
              <Input
                className="h-[42px] rounded-[10px]"
                placeholder={t('signup.companyCodeOptionalPlaceholder')}
                value={signupForm.companyCode}
                onChange={(e) => setSignupForm((prev) => ({ ...prev, companyCode: e.target.value }))}
              />
              <p className="text-[11.5px] text-slate-500 dark:text-[#94a3b8]">{t('signup.companyCodeOptionalHint')}</p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-slate-900 dark:text-[#f1f5f9]">{t('signup.name')}</label>
            <Input
              className="h-[42px] rounded-[10px]"
              placeholder={t('signup.namePlaceholder')}
              value={signupForm.name}
              onChange={(e) => setSignupForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-slate-900 dark:text-[#f1f5f9]">{t('signup.email')}</label>
            <div className="flex gap-2">
              <Input
                className="h-[42px] rounded-[10px] flex-1"
                type="email"
                placeholder={t('signup.emailPlaceholder')}
                value={signupForm.email}
                onChange={(e) => {
                  setSignupForm((prev) => ({ ...prev, email: e.target.value }));
                  setEmailChecked(false);
                  setEmailCheckResult(null);
                }}
              />
              <button
                type="button"
                onClick={handleEmailCheck}
                disabled={isCheckingEmail || !signupForm.email.trim()}
                className="h-[42px] px-3 rounded-[10px] text-[12px] font-medium border border-[#e5e7eb] bg-white text-slate-900 hover:bg-slate-50 shrink-0 disabled:opacity-50"
              >
                {isCheckingEmail ? t('common.checking') : t('signup.checkDuplicate')}
              </button>
            </div>
            {emailCheckResult && (
              <p className={`text-[11.5px] ${emailChecked ? 'text-emerald-600' : 'text-red-500'}`}>
                {emailCheckResult}
              </p>
            )}
          </div>

          {/* 한국어 사용자만 휴대폰 인증 표시 */}
          {isKorean && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-slate-900 dark:text-[#f1f5f9]">{t('signup.phoneVerification')}</label>
              <div className="flex gap-2">
                <Input
                  className="h-[42px] rounded-[10px] flex-1"
                  placeholder={t('signup.phonePlaceholder')}
                  value={adminPhone}
                  onChange={(e) => {
                    setAdminPhone(e.target.value);
                    setAdminOtpVerified(false);
                  }}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={handleSendAdminOtp}
                  disabled={isLoading || isSendingAdminOtp || !adminPhone.trim()}
                  className="h-[42px] px-3 rounded-[10px] text-[12px] font-medium border border-[#e5e7eb] bg-white text-slate-900 hover:bg-slate-50 shrink-0 disabled:opacity-50"
                >
                  {isSendingAdminOtp ? t('common.sending') : adminOtpSent ? t('signup.resend') : t('signup.sendOtp')}
                </button>
              </div>
              <div className="flex gap-2">
                <Input
                  className="h-[42px] rounded-[10px] flex-1"
                  placeholder={t('signup.otpPlaceholder')}
                  value={adminOtp}
                  onChange={(e) => setAdminOtp(e.target.value)}
                  disabled={isLoading || !adminOtpSent || adminOtpVerified}
                />
                <button
                  type="button"
                  onClick={handleVerifyAdminOtp}
                  disabled={isLoading || !adminOtpSent || adminOtpVerified || isVerifyingAdminOtp || !adminOtp.trim()}
                  className={`h-[42px] px-3 rounded-[10px] text-[12px] font-semibold shrink-0 flex items-center gap-1 disabled:opacity-50 ${
                    adminOtpVerified
                      ? 'bg-[#10b981] text-white border-none'
                      : 'border border-[#e5e7eb] bg-white text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {adminOtpVerified ? t('signup.otpVerified') : isVerifyingAdminOtp ? t('signup.verifyingOtp') : t('signup.verifyOtp')}
                </button>
              </div>
              {adminOtpVerified ? (
                <p className="text-[11.5px] text-[#10b981] font-medium">{t('signup.phoneVerified')}</p>
              ) : (
                <p className="text-[11.5px] text-slate-400 dark:text-[#64748b]">{t('signup.phoneVerifyRequired')}</p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-slate-900 dark:text-[#f1f5f9]">{t('signup.password')}</label>
            <Input
              className="h-[42px] rounded-[10px]"
              type="password"
              placeholder={t('signup.passwordPlaceholder')}
              value={signupForm.password}
              onChange={(e) => setSignupForm((prev) => ({ ...prev, password: e.target.value }))}
            />
            {passwordValidation && !passwordValidation.isValid && signupForm.password && (
              <p className="text-[11.5px] text-red-500">⚠ {passwordValidation.errors.join(' / ')}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-slate-900 dark:text-[#f1f5f9]">{t('signup.confirmPassword')}</label>
            <Input
              className="h-[42px] rounded-[10px]"
              type="password"
              placeholder={t('signup.confirmPasswordPlaceholder')}
              value={signupForm.confirmPassword}
              onChange={(e) => setSignupForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            />
          </div>

          <div className="p-3.5 bg-[#f8fafc] dark:bg-[#0f172a] rounded-lg border border-[#e5e7eb] dark:border-white/[0.08]">
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={agreeAll}
                onChange={(e) => handleAgreeAll(e.target.checked)}
                className="w-[15px] h-[15px] accent-[#2563eb] m-0"
              />
              <span className="text-[13px] font-semibold text-slate-900 dark:text-[#f1f5f9]">{t('terms.agreeAll')}</span>
            </label>
            <div className="pt-2 border-t border-[#e5e7eb] dark:border-white/[0.08] flex flex-col gap-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeAge}
                  onChange={(e) => setAgreeAge(e.target.checked)}
                  className="w-[14px] h-[14px] accent-[#2563eb] m-0"
                />
                <span className="text-[12px] text-slate-500 dark:text-[#94a3b8]">
                  <span>{t('terms.required')}</span> <span className="text-slate-900 dark:text-[#f1f5f9]">{t('terms.ageConfirm')}</span>
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-[14px] h-[14px] accent-[#2563eb] m-0"
                />
                <span className="text-[12px] text-slate-500 dark:text-[#94a3b8]">
                  {t('terms.required')}{' '}
                  <button type="button" className="text-[#2563eb] underline hover:text-[#1d4ed8]" onClick={() => setTermsPopupType('tos')}>
                    {t('terms.tos')}
                  </button>
                  <span className="text-slate-900 dark:text-[#f1f5f9]">{t('terms.agreeSuffix')}</span>
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreePrivacy}
                  onChange={(e) => setAgreePrivacy(e.target.checked)}
                  className="w-[14px] h-[14px] accent-[#2563eb] m-0"
                />
                <span className="text-[12px] text-slate-500 dark:text-[#94a3b8]">
                  {t('terms.required')}{' '}
                  <button type="button" className="text-[#2563eb] underline hover:text-[#1d4ed8]" onClick={() => setTermsPopupType('privacy')}>
                    {t('terms.privacy')}
                  </button>
                  <span className="text-slate-900 dark:text-[#f1f5f9]">{t('terms.agreeSuffix')}</span>
                </span>
              </label>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              disabled={isLoading}
              className="flex-1 h-11 rounded-[11px] text-[13px] font-semibold border border-[#e5e7eb] bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSignup}
              disabled={isLoading || !isFormValid}
              className="flex-[2] h-11 rounded-[11px] text-[14px] font-semibold bg-[#2563eb] text-white hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_1px_3px_rgba(37,99,235,0.3)]"
            >
              {isLoading ? t('signup.signingUp') : t('signup.signupButton')}
            </button>
          </div>

          <p className="text-xs text-center text-slate-500 dark:text-[#94a3b8] mt-2">
            {t('signup.alreadyHaveAccount')}{' '}
            <button type="button" className="text-[#2563eb] hover:text-[#1d4ed8] font-medium" onClick={() => navigate('/')}>
              {t('signup.goToLogin')}
            </button>
          </p>
        </div>
      </AuthShell>

      {/* Terms Popup */}
      <Dialog open={termsPopupType !== null} onOpenChange={(open) => { if (!open) setTermsPopupType(null); }}>
        <DialogContent variant="v1" className="max-w-4xl max-h-[80vh] flex flex-col overflow-hidden" hideClose>
          <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
            <div className="w-10 h-10 rounded-[10px] bg-[#eff6ff] flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[17px] font-semibold text-slate-900 tracking-[-0.01em]">
                {termsPopupType === 'tos' ? t('terms.tos') : t('terms.privacy')}
              </h2>
              <p className="text-[13px] text-slate-500 mt-0.5">{t('terms.reviewContent')}</p>
            </div>
            <button
              type="button"
              onClick={() => setTermsPopupType(null)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
            <div className="text-[13px] text-slate-700 leading-relaxed space-y-4">
              {termsPopupType === 'tos' ? <TermsOfServiceContent /> : <PrivacyPolicyContent />}
            </div>
          </div>
          <div className="flex justify-end px-6 py-3.5 border-t border-[#f1f5f9] bg-[#fafbfc] rounded-b-[16px] shrink-0">
            <button
              type="button"
              onClick={() => setTermsPopupType(null)}
              className="h-9 px-5 rounded-[10px] text-[13px] font-semibold bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
            >
              {t('common.confirm')}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
