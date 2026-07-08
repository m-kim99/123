import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Info, AlertTriangle, Wrench, Pin } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

import { DashboardLayout } from '@/components/DashboardLayout';
import { v1Card, V1PageHeader, V1Chip } from '@/components/ui/v1-components';
import { useAuthStore } from '@/store/authStore';
import { fetchSystemNotices } from '@/lib/support';
import type { SystemNotice, SystemNoticeType } from '@/types/operator';
import { BackButton } from '@/components/BackButton';

type ChipVariant = 'blue' | 'emerald' | 'amber' | 'red' | 'violet' | 'neutral';

export function Updates() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);

  const [notices, setNotices] = useState<SystemNotice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const typeConfig: Record<SystemNoticeType, { label: string; icon: typeof Info; variant: ChipVariant }> = {
    info: { label: t('updates.typeInfo'), icon: Info, variant: 'blue' },
    warning: { label: t('updates.typeWarning'), icon: AlertTriangle, variant: 'amber' },
    maintenance: { label: t('updates.typeMaintenance'), icon: Wrench, variant: 'amber' },
    update: { label: t('updates.typeUpdate'), icon: Sparkles, variant: 'violet' },
  };

  useEffect(() => {
    void loadNotices();
  }, [user?.role]);

  const loadNotices = async () => {
    setIsLoading(true);
    try {
      const data = await fetchSystemNotices('all', user?.role === 'admin' ? 'admin' : 'team');
      setNotices(data);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton className="mb-4" />

        <V1PageHeader title={t('updates.title')} sub={t('updates.subtitle')} />

        <div className={v1Card}>
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Sparkles className="h-[18px] w-[18px] text-[#2563eb]" />
            <h2 className="text-base font-semibold text-slate-900">{t('updates.title')}</h2>
            <span className="text-xs font-semibold text-[#2563eb] bg-[#eff6ff] px-2 py-0.5 rounded-full">
              {notices.length}
            </span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center"><p className="text-slate-500">{t('common.loading')}</p></div>
          ) : notices.length === 0 ? (
            <div className="p-12 text-center"><p className="text-slate-500">{t('updates.noUpdates')}</p></div>
          ) : (
            <div>
              {notices.map((notice, idx) => {
                const type = typeConfig[notice.type];
                return (
                  <article
                    key={notice.id}
                    className={`px-5 sm:px-6 py-5 flex flex-col gap-2 ${
                      idx < notices.length - 1 ? 'border-b border-slate-100' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      {notice.isPinned && (
                        <span title={t('updates.pinned')}>
                          <Pin className="w-4 h-4 text-amber-500 shrink-0" />
                        </span>
                      )}
                      <h3 className="text-base font-semibold text-slate-900 tracking-tight flex-1 min-w-0 truncate">
                        {notice.title}
                      </h3>
                      <V1Chip variant={type.variant} icon={type.icon}>
                        {type.label}
                      </V1Chip>
                    </div>
                    <p className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {notice.content}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                      <span className="font-mono">
                        {format(new Date(notice.publishedAt), 'yyyy-MM-dd', { locale: ko })}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
