import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Lock, Crown, Mail } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { registerInnopayBilling, PLAN_PRICING, hidePaymentUi, type PaidPlanName } from '@/lib/payments';
import { InnopayCardFields, emptyCardForm, cardFormToApi } from '@/components/InnopayCardFields';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const SUPPORT_EMAIL = 'support@traystorage.net';

/**
 * 구독 만료/미결제 차단 화면
 * - 무료체험 또는 구독이 만료된 회사의 사용자는 이 화면에 갇힘 (앱 이용 불가)
 * - 관리자(한국어): 플랜 선택 + 이노페이 결제 진행 가능
 * - 관리자(비한국어): 해외 결제 미지원 — 문의 안내 (운영자가 수동으로 기간 연장)
 * - 관리자(iOS 앱): 결제 UI 숨김(App Store 3.1.1) — 구매처 언급 없는 안내 + 문의 이메일만
 * - 팀원: 관리자에게 결제 요청 안내
 */
export function SubscriptionGate() {
  const { t, i18n } = useTranslation();
  const { user, logout, trialEndsAt } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  // 이노페이는 국내(원화) 결제 전용 — 비한국어 로케일에는 결제 대신 문의 안내 표시
  const isKorean = i18n.language === 'ko';

  const [plan, setPlan] = useState<PaidPlanName>('pro');
  const [members, setMembers] = useState('3');
  const [customerPhone, setCustomerPhone] = useState('');
  const [cardForm, setCardForm] = useState(emptyCardForm);
  const [agreed, setAgreed] = useState(false);
  const [isRequestingPayment, setIsRequestingPayment] = useState(false);
  const [actualMemberCount, setActualMemberCount] = useState(0);

  // 정산 원칙(true-up): 결제 인원은 현재 팀원 수 이상 — 실인원 조회 후 기본값 설정
  useEffect(() => {
    if (!user?.companyId) return;
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', user.companyId)
      .then(({ count }) => {
        if (count && count > 0) {
          setActualMemberCount(count);
          setMembers(String(count));
        }
      });
  }, [user?.companyId]);

  const pricing = PLAN_PRICING[plan];
  const parsedMembers = Math.max(0, parseInt(members, 10) || 0);
  const exceedsPlanLimit = pricing.maxMembers !== null && parsedMembers > pricing.maxMembers;
  const belowActualMembers = actualMemberCount > 0 && parsedMembers < actualMemberCount;
  const belowPlanMin = parsedMembers < pricing.minMembers;

  const handlePay = async () => {
    if (!user || belowPlanMin || exceedsPlanLimit || belowActualMembers || !agreed) return;
    if (!customerPhone) {
      toast({ title: t('subscription.phoneRequired'), variant: 'destructive' });
      return;
    }
    const card = cardFormToApi(cardForm);
    if (!card) {
      toast({ title: t('subscription.cardInfoInvalid'), variant: 'destructive' });
      return;
    }
    setIsRequestingPayment(true);
    try {
      const res = await registerInnopayBilling({
        plan,
        customerKey: user.id,
        customerEmail: user.email,
        customerName: user.name,
        customerPhone,
        memberCount: parsedMembers,
        amount: parsedMembers * pricing.pricePerMember,
        goodsName:
          plan === 'basic'
            ? t('subscription.productNameBasic')
            : t('subscription.productNamePro'),
        card,
      });
      if (res.success) {
        toast({ title: t('billing.approvedTitle') });
        // 구독 활성화 → 차단 상태 갱신 (게이트 해제)
        await useAuthStore.getState().refreshSubscriptionAccess();
      } else {
        toast({
          title: res.message || t('subscription.paymentRequestFailed'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('결제 요청 실패:', error);
      toast({ title: t('subscription.paymentRequestFailed'), variant: 'destructive' });
    } finally {
      setIsRequestingPayment(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0b1220] p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <Lock className="h-12 w-12 text-amber-500 mx-auto mb-2" />
          <CardTitle>{t('subscription.gateTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {trialEndsAt && (
            <p className="text-sm text-slate-600 dark:text-slate-300 text-center">
              {t('subscription.gateEndedOn', {
                date: new Date(trialEndsAt).toLocaleDateString(i18n.language),
              })}
            </p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            {t('subscription.gateDataSafe')}
          </p>
          {isAdmin && hidePaymentUi ? (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-300 text-center">
                {t('subscription.nativeGateNotice')}
              </p>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="flex items-center justify-center gap-2 p-3 rounded-lg border border-blue-200 bg-blue-50 text-sm font-medium text-[#2563eb] hover:bg-blue-100 transition-colors dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300"
              >
                <Mail className="h-4 w-4" />
                {SUPPORT_EMAIL}
              </a>
            </>
          ) : isAdmin && !isKorean ? (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-300 text-center">
                {t('subscription.overseasGateNotice')}
              </p>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="flex items-center justify-center gap-2 p-3 rounded-lg border border-blue-200 bg-blue-50 text-sm font-medium text-[#2563eb] hover:bg-blue-100 transition-colors dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300"
              >
                <Mail className="h-4 w-4" />
                {SUPPORT_EMAIL}
              </a>
            </>
          ) : isAdmin ? (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-300 text-center">
                {t('subscription.gateDesc')}
              </p>
              <div className="space-y-2">
                <Label>{t('subscription.planSelectLabel')}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['basic', 'pro'] as const).map((planName) => (
                    <button
                      key={planName}
                      type="button"
                      onClick={() => setPlan(planName)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        plan === planName
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/15'
                          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-transparent'
                      }`}
                    >
                      <p className="font-semibold text-sm flex items-center gap-1">
                        {planName === 'pro' && <Crown className="h-3.5 w-3.5 text-yellow-500" />}
                        {planName === 'basic' ? t('subscription.basic') : t('subscription.pro')}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        ₩{PLAN_PRICING[planName].pricePerMember.toLocaleString()}
                        {t('subscription.perPersonMonth')}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {planName === 'basic'
                          ? t('subscription.basicMemberLimit')
                          : t('subscription.customMemberCount')}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gate-members">{t('subscription.memberCountLabel')}</Label>
                <Input
                  id="gate-members"
                  type="number"
                  min={Math.max(pricing.minMembers, actualMemberCount || 1)}
                  max={pricing.maxMembers ?? undefined}
                  value={members}
                  onChange={(e) => setMembers(e.target.value)}
                />
                {exceedsPlanLimit && (
                  <p className="text-xs text-red-500">
                    {plan === 'basic'
                      ? t('subscription.basicMemberLimit')
                      : t('subscription.proMemberLimit')}
                  </p>
                )}
                {plan === 'pro' && belowPlanMin && !belowActualMembers && (
                  <p className="text-xs text-red-500">{t('subscription.proMemberMin')}</p>
                )}
                {belowActualMembers && !exceedsPlanLimit && (
                  <p className="text-xs text-red-500">
                    {t('subscription.memberCountBelowActual', { count: actualMemberCount })}
                  </p>
                )}
                <p className="text-xs text-slate-500">{t('subscription.trueUpNotice')}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gate-phone">{t('subscription.phoneLabel')}</Label>
                <Input
                  id="gate-phone"
                  type="tel"
                  placeholder="010-1234-5678"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
              <InnopayCardFields value={cardForm} onChange={setCardForm} idPrefix="gate" />
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('subscription.monthlyTotal')}
                </span>
                <span className="text-xl font-bold text-[#2563eb]">
                  ₩{(parsedMembers * pricing.pricePerMember).toLocaleString()}
                  <span className="text-sm font-normal text-slate-500">
                    {t('subscription.perMonth')}
                  </span>
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="gate-agree-terms"
                  checked={agreed}
                  onCheckedChange={(checked) => setAgreed(checked === true)}
                  className="mt-0.5"
                />
                <Label
                  htmlFor="gate-agree-terms"
                  className="text-sm text-slate-700 dark:text-slate-300 leading-snug cursor-pointer"
                >
                  {t('subscription.agreeTerms')}
                </Label>
              </div>
              <Button
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                disabled={belowPlanMin || exceedsPlanLimit || belowActualMembers || !agreed || !cardFormToApi(cardForm) || isRequestingPayment}
                onClick={handlePay}
              >
                {isRequestingPayment ? t('common.loading') : t('subscription.pay')}
              </Button>
            </>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300 text-center">
              {t('subscription.gateTeamDesc')}
            </p>
          )}
          <Button variant="outline" className="w-full" onClick={() => logout()}>
            {t('common.logout')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
