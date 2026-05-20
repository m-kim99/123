import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, RotateCcw, AlertTriangle, FileText, Search } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { v1Card, V1CardHeader } from '@/components/ui/v1-components';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  const { t, i18n } = useTranslation();
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton className="mb-4" />
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-[28px] sm:text-[30px] font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Trash2 className="h-7 w-7 shrink-0" />
              {t('trash.title')}
            </h1>
            <p className="text-sm text-slate-500 mt-1.5">{t('trash.subtitle')}</p>
          </div>
          {trashedDocuments.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setEmptyTrashDialogOpen(true)}
              className="hidden md:flex h-9 rounded-[10px] text-[13px] font-semibold"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('trash.emptyTrash')}
            </Button>
          )}
        </div>

        {trashedDocuments.length > 0 && (
          <Button
            variant="destructive"
            onClick={() => setEmptyTrashDialogOpen(true)}
            className="md:hidden w-full h-9 rounded-[10px] text-[13px] font-semibold"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('trash.emptyTrash')}
          </Button>
        )}

        {/* V1 Warning Banner */}
        {trashedDocuments.length > 0 && (
          <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-[10px]">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">{t('trash.subtitle')}</p>
          </div>
        )}

        <div className={v1Card}>
          <V1CardHeader
            title={t('trash.deletedDocuments')}
            sub={t('trash.totalCount', { count: filteredDocuments.length })}
            icon={Trash2}
            iconColor="#ef4444"
            action={
              <div className="w-48 sm:w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder={t('trash.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 rounded-[10px]"
                  />
                </div>
              </div>
            }
          />
          <div className="p-5 sm:p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-slate-500">{t('common.loading')}</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <Trash2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">
                  {searchQuery ? t('trash.noSearchResults') : t('trash.empty')}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('trash.documentName')}</TableHead>
                    <TableHead>{t('trash.deletedAt')}</TableHead>
                    <TableHead className="text-right">{t('trash.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-400" />
                          <span className="font-medium">{doc.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{doc.deletedAt ? format(new Date(doc.deletedAt), 'yyyy-MM-dd HH:mm', { locale: ko }) : '-'}</p>
                          <p className="text-xs text-slate-500">
                            {doc.deletedAt && formatDistanceToNow(new Date(doc.deletedAt), {
                              locale: i18n.language === 'ko' ? ko : undefined,
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestore(doc.id)}
                            disabled={isRestoring === doc.id}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            {isRestoring === doc.id ? t('common.processing') : t('trash.restore')}
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="text-red-500 hover:text-red-600 border-gray-200 hover:border-red-500"
                            onClick={() => {
                              setDeletingDocId(doc.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <img src={binIcon} alt={t('trash.permanentDelete')} className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
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
