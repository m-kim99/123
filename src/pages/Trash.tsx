import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, RotateCcw, AlertTriangle, FileText, Search, Bell } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { v1Card, V1PageHeader } from '@/components/ui/v1-components';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDocumentStore } from '@/store/documentStore';
import { BackButton } from '@/components/BackButton';
import binIcon from '@/assets/bin.svg';

export function Trash() {
  const { t } = useTranslation();
  const {
    trashedDocuments,
    fetchTrashedDocuments,
    restoreDocument,
    permanentlyDeleteDocument,
    emptyTrash,
    isLoading,
  } = useDocumentStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [emptyTrashDialogOpen, setEmptyTrashDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEmptying, setIsEmptying] = useState(false);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);

  useEffect(() => {
    fetchTrashedDocuments();
  }, [fetchTrashedDocuments]);

  const filteredDocuments = trashedDocuments.filter((doc) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return doc.name.toLowerCase().includes(query);
  });

  const handleRestore = async (id: string) => {
    setIsRestoring(id);
    try {
      await restoreDocument(id);
    } finally {
      setIsRestoring(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!deletingDocId) return;
    setIsDeleting(true);
    try {
      await permanentlyDeleteDocument(deletingDocId);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setDeletingDocId(null);
    }
  };

  const handleEmptyTrash = async () => {
    setIsEmptying(true);
    try {
      await emptyTrash();
    } finally {
      setIsEmptying(false);
      setEmptyTrashDialogOpen(false);
    }
  };

  const getDaysLeft = (deletedAt: string | null | undefined) => {
    if (!deletedAt) return 30;
    return Math.max(0, 30 - differenceInDays(new Date(), new Date(deletedAt)));
  };

  const urgentCount = useMemo(() =>
    trashedDocuments.filter(doc => doc.deletedAt && getDaysLeft(doc.deletedAt) <= 7).length
  , [trashedDocuments]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton className="mb-4" />

        <V1PageHeader
          title={t('trash.title')}
          sub={t('trash.subtitle')}
          right={
            <div className="flex gap-2">
              <div className="relative w-48 sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={t('trash.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9 rounded-[10px] border-[#e5e7eb] text-[13px]"
                />
              </div>
              {trashedDocuments.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-[10px] border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 text-[13px] font-semibold"
                  onClick={() => setEmptyTrashDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  {t('trash.emptyTrash')}
                </Button>
              )}
            </div>
          }
        />

        {/* V1 Warning Banner */}
        {urgentCount > 0 && (
          <div className="flex items-start gap-3 px-4 sm:px-[18px] py-3.5 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <Bell className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-amber-900">
                {t('trash.urgentWarning', { count: urgentCount, defaultValue: `${urgentCount}건의 문서가 7일 이내 영구 삭제 예정입니다.` })}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                {t('trash.urgentWarningDesc', { defaultValue: '복구가 필요한 문서가 있다면 지금 복구해주세요.' })}
              </p>
            </div>
          </div>
        )}

        {/* V1 Table Card */}
        <div className={v1Card}>
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trash2 className="h-[18px] w-[18px] text-[#2563eb]" />
              <h2 className="text-base font-semibold text-slate-900">{t('trash.deletedDocuments')}</h2>
              <span className="text-xs font-semibold text-[#1e40af] bg-[#eff6ff] px-2 py-0.5 rounded-full">
                {t('trash.totalCount', { count: filteredDocuments.length })}
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12"><p className="text-slate-500">{t('common.loading')}</p></div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <Trash2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">{searchQuery ? t('trash.noSearchResults') : t('trash.empty')}</p>
            </div>
          ) : (
            <div>
              {/* Table Header (hidden on mobile) */}
              <div className="hidden md:grid grid-cols-[1.5fr_1fr_90px_140px] gap-3 px-5 sm:px-6 py-2.5 border-b border-slate-100 bg-slate-50/60">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('trash.documentName')}</span>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('trash.deletedAt')}</span>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('trash.daysLeft', { defaultValue: '잔여' })}</span>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">{t('trash.actions')}</span>
              </div>

              {filteredDocuments.map((doc, idx) => {
                const daysLeft = getDaysLeft(doc.deletedAt);
                return (
                  <div
                    key={doc.id}
                    className={`grid grid-cols-1 md:grid-cols-[1.5fr_1fr_90px_140px] gap-2 md:gap-3 px-5 sm:px-6 py-3 md:py-3 items-center ${
                      idx < filteredDocuments.length - 1 ? 'border-b border-slate-50' : ''
                    }`}
                  >
                    {/* Document Title */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                        <FileText className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                      <span className="text-[13px] text-slate-500 line-through truncate">{doc.name}</span>
                    </div>

                    {/* Deleted At */}
                    <div className="text-[11px] text-slate-400 font-mono">
                      {doc.deletedAt ? format(new Date(doc.deletedAt), 'yyyy-MM-dd HH:mm') : '-'}
                    </div>

                    {/* D-day countdown */}
                    <div>
                      <span className={`text-[11px] font-semibold font-mono ${
                        daysLeft <= 7 ? 'text-red-700' : daysLeft <= 14 ? 'text-amber-700' : 'text-slate-500'
                      }`}>
                        D−{daysLeft}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-xs rounded-md text-[#2563eb] border-[#e5e7eb]"
                        onClick={() => handleRestore(doc.id)}
                        disabled={isRestoring === doc.id}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        {isRestoring === doc.id ? t('common.processing') : t('trash.restore')}
                      </Button>
                      <button
                        className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-red-50 transition-colors"
                        onClick={() => { setDeletingDocId(doc.id); setDeleteDialogOpen(true); }}
                        title={t('trash.permanentDelete')}
                      >
                        <img src={binIcon} alt={t('trash.permanentDelete')} className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 영구 삭제 확인 다이얼로그 */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                {t('trash.permanentDeleteTitle')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('trash.permanentDeleteDesc')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                {t('common.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handlePermanentDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? t('common.processing') : t('trash.permanentDelete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 휴지통 비우기 확인 다이얼로그 */}
        <AlertDialog open={emptyTrashDialogOpen} onOpenChange={setEmptyTrashDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                {t('trash.emptyTrashTitle')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('trash.emptyTrashDesc', { count: trashedDocuments.length })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isEmptying}>
                {t('common.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleEmptyTrash}
                disabled={isEmptying}
                className="bg-red-600 hover:bg-red-700"
              >
                {isEmptying ? t('common.processing') : t('trash.emptyTrashConfirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
