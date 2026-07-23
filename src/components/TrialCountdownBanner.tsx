import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { hidePaymentUi } from '@/lib/payments';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 무료 체험 만료 카운트다운 배너 (D-14부터 모든 화면 상단에 표시)
 * - D-14~D-8 파랑(안내) → D-7~D-2 주황(경고) → D-1~당일 빨강(긴급, 닫기 불가)
 * - 닫기(X)는 해당 세션+단계에만 적용 — 단계가 올라가면 다시 표시
 * - 구독 버튼은 관리자에게만, iOS 앱에서는 미표시(App Store 3.1.1 — 외부 결제 유도 문구 금지)
 */
export function TrialCountdownBanner({ onSubscribeClick }: { onSubscribeClick: () => void }) {
  const { t, i18n } = useTranslation();
  const { user, subscriptionStatus, trialEndsAt } = useAuthStore();
  const [dismissed, setDismissed] = useState<string | null>(() =>
    sessionStorage.getItem('trial-banner-dismissed'),
  );

  if (subscriptionStatus !== 'trialing' || !trialEndsAt) return null;

  const daysLeft = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / DAY_MS);
  if (daysLeft < 0 || daysLeft > 14) return null;

  const stage = daysLeft <= 1 ? 'urgent' : daysLeft <= 7 ? 'warn' : 'info';
  if (stage !== 'urgent' && dismissed === stage) return null;

  const isAdmin = user?.role === 'admin';
  const endDate = new Date(trialEndsAt).toLocaleDateString(i18n.language);
  const mainText =
    daysLeft === 0
      ? t('trialBanner.today')
      : daysLeft === 1
        ? t('trialBanner.lastDay')
        : stage === 'warn'
          ? t('trialBanner.warn', { days: daysLeft })
          : t('trialBanner.remaining', { date: endDate, days: daysLeft });

  const stageClasses = {
    info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-500/30 dark:text-blue-200',
    warn: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950 dark:border-amber-500/30 dark:text-amber-200',
    urgent: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-500/30 dark:text-red-200',
  }[stage];

  const dismiss = () => {
    sessionStorage.setItem('trial-banner-dismissed', stage);
    setDismissed(stage);
  };

  return (
    <div className={`flex items-center gap-3 border-b px-4 py-2.5 text-sm ${stageClasses}`}>
      <Clock className="h-4 w-4 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="font-medium">{mainText}</span>
        {(!isAdmin || stage === 'urgent') && (
          <span className="ml-1 opacity-90">{t('trialBanner.memberHint')}</span>
        )}
      </div>
      {isAdmin && !hidePaymentUi && (
        <Button
          size="sm"
          className="shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
          onClick={onSubscribeClick}
        >
          {t('trialBanner.subscribe')}
        </Button>
      )}
      {stage !== 'urgent' && (
        <button
          type="button"
          onClick={dismiss}
          aria-label={t('trialBanner.dismiss')}
          className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
