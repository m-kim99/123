import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle } from 'lucide-react';

// ============================================================
// 토스페이먼츠 빌링 카드 등록 결과 페이지
// success: authKey 수신 — 빌링키 발급/결제 승인은 시크릿 키 발급 후 서버 연동 예정
// ============================================================

export function BillingSuccessPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const members = searchParams.get('members');
  const amount = searchParams.get('amount');

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
          <CardTitle>{t('billing.successTitle')}</CardTitle>
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
          </div>
          <p className="text-sm text-slate-600 text-center">{t('billing.successDesc')}</p>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 text-center">
            🚧 {t('billing.approvalPending')}
          </div>
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
