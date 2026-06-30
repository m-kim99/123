import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import {
  confirmPayAppBilling,
  confirmInnopayPayment,
  getInnopayPaymentContext,
  clearInnopayPaymentContext,
  type ConfirmBillingResult,
} from '@/lib/payments';

// ============================================================
// [토스 주석 처리] 토스페이먼츠 승인 대기 중 — 사용 불가
// ============================================================

export function BillingSuccessPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <XCircle className="h-12 w-12 text-amber-500 mx-auto mb-2" />
          <CardTitle>토스페이먼츠 승인 대기 중</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600 text-center">
            현재 토스페이먼츠 승인 대기 중입니다. PayApp 결제를 이용해주세요.
          </p>
          <Button className="w-full rounded-[10px]" onClick={() => navigate('/admin/users')}>
            {t('billing.backToApp')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function BillingFailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const message = searchParams.get('message');
  const code = searchParams.get('code');

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
          <CardTitle>{t('billing.failTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600 text-center">
            {message || t('billing.failDesc')}
            {code && <span className="block mt-1 text-xs text-slate-400">({code})</span>}
          </p>
          <Button className="w-full rounded-[10px]" onClick={() => navigate('/admin/users')}>
            {t('billing.backToApp')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// PayApp 결제 결과 페이지
// ============================================================

export function PayAppBillingSuccessPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const customerKey = searchParams.get('customerKey');
  const rebillNo = searchParams.get('rebill_no');
  const mulNo = searchParams.get('mul_no');
  const members = searchParams.get('members');
  const amount = searchParams.get('amount');

  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [result, setResult] = useState<ConfirmBillingResult | null>(null);
  const confirmStarted = useRef(false);

  useEffect(() => {
    if (confirmStarted.current) return;
    confirmStarted.current = true;

    if (!customerKey || !rebillNo || !members || !amount) {
      setStatus('error');
      return;
    }

    (async () => {
      const res = await confirmPayAppBilling({
        rebillNo,
        mul_no: mulNo || '',
        customerKey,
        memberCount: Number(members),
        amount: Number(amount),
      });
      setResult(res);
      setStatus(res.success ? 'success' : 'error');
    })();
  }, [customerKey, rebillNo, mulNo, members, amount]);

  if (status === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Loader2 className="h-12 w-12 text-[#2563eb] mx-auto mb-2 animate-spin" />
            <CardTitle>{t('billing.processingTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 text-center">{t('billing.processingDesc')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
            <CardTitle>{t('billing.approvalFailTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600 text-center">
              {result?.message || t('billing.approvalFailDesc')}
              {result?.code && (
                <span className="block mt-1 text-xs text-slate-400">({result.code})</span>
              )}
            </p>
            <Button className="w-full rounded-[10px]" onClick={() => navigate('/admin/users')}>
              {t('billing.backToApp')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
          <CardTitle>{t('billing.approvedTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-lg border space-y-2 text-sm">
            {members && (
              <div className="flex justify-between">
                <span className="text-slate-600">{t('subscription.memberCountLabel')}</span>
                <span className="font-medium">{members}{t('subscription.personUnit')}</span>
              </div>
            )}
            {amount && (
              <div className="flex justify-between">
                <span className="text-slate-600">{t('subscription.monthlyTotal')}</span>
                <span className="font-bold text-[#2563eb]">
                  ₩{Number(amount).toLocaleString()}{t('subscription.perMonth')}
                </span>
              </div>
            )}
            {result?.nextBillingDate && (
              <div className="flex justify-between">
                <span className="text-slate-600">{t('billing.nextBillingDate')}</span>
                <span className="font-medium">
                  {new Date(result.nextBillingDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
          <p className="text-sm text-slate-600 text-center">{t('billing.approvedDesc')}</p>
          <Button className="w-full rounded-[10px]" onClick={() => navigate('/admin/users')}>
            {t('billing.backToApp')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// 이노페이(INNOPAY) 결제 결과 페이지
// 결제창(goPay) 인증 성공 후 returnUrl(/billing/innopay/return)로 복귀.
// tid/paymentToken을 받아 승인 API(엣지함수)를 호출하고 구독을 활성화한다.
// ============================================================

export function InnopayReturnPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 이노페이 결제창은 인증 결과를 returnUrl로 전달한다(tid, paymentToken).
  const tid = searchParams.get('tid');
  const paymentToken = searchParams.get('paymentToken') || searchParams.get('Payment-Token');
  const moidParam = searchParams.get('moid');

  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [result, setResult] = useState<ConfirmBillingResult | null>(null);
  const [members, setMembers] = useState<number | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const confirmStarted = useRef(false);

  useEffect(() => {
    if (confirmStarted.current) return;
    confirmStarted.current = true;

    const ctx = getInnopayPaymentContext();

    if (!tid || !paymentToken || !ctx) {
      setStatus('error');
      return;
    }

    setMembers(ctx.memberCount);
    setAmount(ctx.amount);

    (async () => {
      const res = await confirmInnopayPayment({
        tid,
        paymentToken,
        moid: moidParam || ctx.moid,
        customerKey: ctx.customerKey,
        memberCount: ctx.memberCount,
        amount: ctx.amount,
      });
      setResult(res);
      setStatus(res.success ? 'success' : 'error');
      if (res.success) clearInnopayPaymentContext();
    })();
  }, [tid, paymentToken, moidParam]);

  if (status === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Loader2 className="h-12 w-12 text-[#2563eb] mx-auto mb-2 animate-spin" />
            <CardTitle>{t('billing.processingTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 text-center">{t('billing.processingDesc')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
            <CardTitle>{t('billing.approvalFailTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600 text-center">
              {result?.message || t('billing.approvalFailDesc')}
              {result?.code && (
                <span className="block mt-1 text-xs text-slate-400">({result.code})</span>
              )}
            </p>
            <Button className="w-full rounded-[10px]" onClick={() => navigate('/admin/users')}>
              {t('billing.backToApp')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
          <CardTitle>{t('billing.approvedTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-lg border space-y-2 text-sm">
            {members != null && (
              <div className="flex justify-between">
                <span className="text-slate-600">{t('subscription.memberCountLabel')}</span>
                <span className="font-medium">{members}{t('subscription.personUnit')}</span>
              </div>
            )}
            {amount != null && (
              <div className="flex justify-between">
                <span className="text-slate-600">{t('subscription.monthlyTotal')}</span>
                <span className="font-bold text-[#2563eb]">
                  ₩{Number(amount).toLocaleString()}{t('subscription.perMonth')}
                </span>
              </div>
            )}
            {result?.cardCompany && (
              <div className="flex justify-between">
                <span className="text-slate-600">{t('subscription.paymentMethod')}</span>
                <span className="font-medium">{result.cardCompany}</span>
              </div>
            )}
          </div>
          <p className="text-sm text-slate-600 text-center">{t('billing.approvedDesc')}</p>
          <Button className="w-full rounded-[10px]" onClick={() => navigate('/admin/users')}>
            {t('billing.backToApp')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
