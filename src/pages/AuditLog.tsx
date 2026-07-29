import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { History, Search, ShieldAlert, Trash2, FileX } from 'lucide-react';
import { format } from 'date-fns';

import { DashboardLayout } from '@/components/DashboardLayout';
import { v1Card, V1PageHeader } from '@/components/ui/v1-components';
import { Input } from '@/components/ui/input';
import { BackButton } from '@/components/BackButton';
import { fetchDeletionAuditLog, type DeletionAuditEvent } from '@/lib/storageEvents';

const EVENT_ICON: Record<DeletionAuditEvent['eventType'], typeof Trash2> = {
  disposed: ShieldAlert,
  deleted: Trash2,
  document_deleted: FileX,
};

export function AuditLog() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<DeletionAuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDeletionAuditLog()
      .then(setEvents)
      .finally(() => setIsLoading(false));
  }, []);

  const eventTypeLabel = (type: DeletionAuditEvent['eventType']) => {
    switch (type) {
      case 'disposed':
        return t('auditLog.eventTypeDisposed');
      case 'deleted':
        return t('auditLog.eventTypeDeleted');
      case 'document_deleted':
        return t('auditLog.eventTypeDocumentDeleted');
    }
  };

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const query = searchQuery.trim().toLowerCase();
    return events.filter((event) =>
      [event.targetName, event.actorName, event.departmentName]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query))
    );
  }, [events, searchQuery]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton className="mb-4" />

        <V1PageHeader
          title={t('auditLog.title')}
          sub={t('auditLog.subtitle')}
          right={
            <div className="relative w-48 sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={t('auditLog.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 rounded-[10px] border-[#e5e7eb] text-[13px]"
              />
            </div>
          }
        />

        <div className={v1Card}>
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <History className="h-[18px] w-[18px] text-[#2563eb]" />
            <h2 className="text-base font-semibold text-slate-900">{t('auditLog.title')}</h2>
            <span className="text-xs font-semibold text-[#2563eb] bg-[#eff6ff] px-2 py-0.5 rounded-full">
              {t('auditLog.totalCount', { count: filteredEvents.length })}
            </span>
          </div>

          {isLoading ? (
            <div className="text-center py-12"><p className="text-slate-500">{t('common.loading')}</p></div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">{searchQuery ? t('auditLog.noSearchResults') : t('auditLog.empty')}</p>
            </div>
          ) : (
            <div>
              <div className="hidden md:grid grid-cols-[110px_1.5fr_1fr_1fr_1fr_140px] gap-3 px-5 sm:px-6 py-2.5 border-b border-slate-100 bg-slate-50/60">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('auditLog.eventType')}</span>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('auditLog.target')}</span>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('auditLog.department')}</span>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('auditLog.actor')}</span>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('auditLog.detail')}</span>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">{t('auditLog.occurredAt')}</span>
              </div>

              {filteredEvents.map((event, idx) => {
                const Icon = EVENT_ICON[event.eventType];
                return (
                  <div
                    key={event.id}
                    className={`grid grid-cols-1 md:grid-cols-[110px_1.5fr_1fr_1fr_1fr_140px] gap-2 md:gap-3 px-5 sm:px-6 py-3 items-center ${
                      idx < filteredEvents.length - 1 ? 'border-b border-slate-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="text-[12px] font-semibold text-slate-700">{eventTypeLabel(event.eventType)}</span>
                    </div>
                    <span className="text-[13px] text-slate-900 truncate">{event.targetName || '-'}</span>
                    <span className="text-[13px] text-slate-500 truncate">{event.departmentName || '-'}</span>
                    <span className="text-[13px] text-slate-500 truncate">{event.actorName || '-'}</span>
                    <span className="text-[12px] text-slate-400 truncate">{event.detail || '-'}</span>
                    <div className="text-[11px] text-slate-400 font-mono md:text-right">
                      {format(new Date(event.createdAt), 'yyyy-MM-dd HH:mm')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
