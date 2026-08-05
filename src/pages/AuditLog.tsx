import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { History, Search, ShieldAlert, Trash2, FileX, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

import { v1Card, V1PageHeader } from '@/components/ui/v1-components';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  fetchDeletionAuditLog,
  fetchStorageEventsByRef,
  type DeletionAuditEvent,
  type StorageEvent,
  type StorageEventType,
} from '@/lib/storageEvents';

const EVENT_ICON: Record<DeletionAuditEvent['eventType'], typeof Trash2> = {
  disposed: ShieldAlert,
  deleted: Trash2,
  document_deleted: FileX,
};

/**
 * 삭제 로그 화면 — 휴지통 페이지의 '삭제 로그' 탭에서 렌더된다.
 * (단독 페이지였다가 탭으로 편입되어 DashboardLayout/BackButton 껍데기를 갖지 않는다)
 */
export function DeletionLogPanel() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<DeletionAuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  // 클릭한 삭제 건의 보존된 반출입 이력
  const [selectedEvent, setSelectedEvent] = useState<DeletionAuditEvent | null>(null);
  const [history, setHistory] = useState<StorageEvent[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  useEffect(() => {
    fetchDeletionAuditLog()
      .then(setEvents)
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const ref = selectedEvent?.subcategoryRef;
    if (!ref) return;
    let cancelled = false;
    setIsHistoryLoading(true);
    setHistory([]);
    fetchStorageEventsByRef(ref)
      .then((rows) => {
        if (!cancelled) setHistory(rows);
      })
      .finally(() => {
        if (!cancelled) setIsHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedEvent]);

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

  // 반출입 이력 라벨·색 — 세부 스토리지 상세 화면과 동일한 키를 재사용한다
  const historyLabel: Record<StorageEventType, string> = {
    registered: t('subcategoryDetail.eventRegistered'),
    checked_out: t('subcategoryDetail.eventCheckedOut'),
    returned: t('subcategoryDetail.eventReturned'),
    disposed: t('subcategoryDetail.eventDisposed'),
    location_changed: t('subcategoryDetail.eventLocationChanged'),
    deleted: t('subcategoryDetail.eventDeleted'),
    document_deleted: t('subcategoryDetail.eventDocumentDeleted'),
  };
  const historyColor: Record<StorageEventType, string> = {
    registered: '#10b981',
    checked_out: '#f59e0b',
    returned: '#10b981',
    disposed: '#ef4444',
    location_changed: '#94a3b8',
    deleted: '#ef4444',
    document_deleted: '#ef4444',
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
    <div className="space-y-6">
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
              // 세부 스토리지 삭제/폐기 건은 보존된 반출입 이력을 열어볼 수 있다
              // (문서 삭제 건은 묶을 스토리지가 없어 클릭 대상이 아니다)
              const hasHistory = !!event.subcategoryRef;
              return (
                <div
                  key={event.id}
                  role={hasHistory ? 'button' : undefined}
                  tabIndex={hasHistory ? 0 : undefined}
                  onClick={hasHistory ? () => setSelectedEvent(event) : undefined}
                  onKeyDown={
                    hasHistory
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedEvent(event);
                          }
                        }
                      : undefined
                  }
                  className={`grid grid-cols-1 md:grid-cols-[110px_1.5fr_1fr_1fr_1fr_140px] gap-2 md:gap-3 px-5 sm:px-6 py-3 items-center ${
                    idx < filteredEvents.length - 1 ? 'border-b border-slate-50' : ''
                  } ${hasHistory ? 'cursor-pointer hover:bg-slate-50 transition-colors' : ''}`}
                >
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="text-[12px] font-semibold text-slate-700">{eventTypeLabel(event.eventType)}</span>
                  </div>
                  <span className="text-[13px] text-slate-900 truncate flex items-center gap-1.5">
                    {event.targetName || '-'}
                    {hasHistory && <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
                  </span>
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

      {/* 삭제된 세부 스토리지의 보존된 반출입 이력 — 스토리지 행은 지워졌지만
          storage_events 는 subcategory_ref 로 남아 있어 여기서 다시 볼 수 있다 */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-[18px] w-[18px] text-[#2563eb]" />
              {selectedEvent?.targetName || t('auditLog.title')}
            </DialogTitle>
            <DialogDescription>{t('auditLog.historyDialogDesc')}</DialogDescription>
          </DialogHeader>

          {isHistoryLoading ? (
            <p className="text-sm text-slate-500 text-center py-8">{t('common.loading')}</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">{t('auditLog.historyEmpty')}</p>
          ) : (
            <div className="space-y-3 py-1">
              {history.map((row) => (
                <div key={row.id} className="flex items-start gap-3">
                  <span
                    className="mt-1.5 h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: historyColor[row.eventType] }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-slate-800">
                      {historyLabel[row.eventType]}
                    </p>
                    {(row.actorName || row.detail) && (
                      <p className="text-xs text-slate-500 mt-0.5 break-words">
                        {[row.actorName, row.detail].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono shrink-0">
                    {format(new Date(row.createdAt), 'yyyy-MM-dd HH:mm')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
