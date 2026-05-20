import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
import downloadIcon from '@/assets/download.svg';
import binIcon from '@/assets/bin.svg';
import { Button } from '@/components/ui/button';
import { v1Card, V1CardHeader, V1PageHeader, V1StatTile, V1Chip } from '@/components/ui/v1-components';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { FileText, Search, Loader2, Share2, Bell, Users, Clock, MessageCircle } from 'lucide-react';
import previewIcon from '@/assets/preview.svg';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { trackEvent } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { downloadFile } from '@/lib/appBridge';
import { toast } from '@/hooks/use-toast';
import { PdfViewer } from '@/components/PdfViewer';
import { BackButton } from '@/components/BackButton';

export function SharedDocuments() {
  const { t } = useTranslation();
  const { sharedDocuments, fetchSharedDocuments, unshareDocument } =
    useDocumentStore();
  const [searchQuery, setSearchQuery] = useState('');
  
  // 미리보기 상태
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{
    id: string;
    title: string;
    url: string;
    type: 'image' | 'pdf' | 'other';
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [imageZoom, setImageZoom] = useState(100);
  const [imageRotation, setImageRotation] = useState(0);
  
  // 삭제 확인 다이얼로그 상태
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingShareId, setDeletingShareId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchSharedDocuments();
  }, [fetchSharedDocuments]);

  const filteredShares = sharedDocuments.filter((share) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      share.documentName?.toLowerCase().includes(query) ||
      share.sharedByUserName?.toLowerCase().includes(query) ||
      share.departmentName?.toLowerCase().includes(query) ||
      share.categoryName?.toLowerCase().includes(query)
    );
  });

  const handleDownload = async (documentId: string) => {
    try {
      trackEvent('document_download', {
        document_id: documentId,
        download_context: 'shared_documents',
      });

      const { data, error } = await supabase
        .from('documents')
        .select('file_path, title')
        .eq('id', documentId)
        .single();

      if (error || !data) {
        throw error || new Error('문서를 찾을 수 없습니다.');
      }

      const { data: publicData } = supabase.storage
        .from('123')
        .getPublicUrl(data.file_path);

      if (!publicData?.publicUrl) {
        throw new Error('파일 URL을 생성할 수 없습니다.');
      }

      await downloadFile(publicData.publicUrl, data.title || 'document');
    } catch (error) {
      console.error('문서 다운로드 실패:', error);


      toast({
        title: t('sharedDocs.downloadFailed'),
        description: t('sharedDocs.downloadFailedDesc'),
        variant: 'destructive',
      });
    }
  };

  const handleView = async (documentId: string) => {
    try {
      trackEvent('document_preview_open', {
        document_id: documentId,
        preview_context: 'shared_documents',
      });

      setPreviewLoading(true);

      const { data, error } = await supabase
        .from('documents')
        .select('file_path, title')
        .eq('id', documentId)
        .single();

      if (error || !data) {
        throw error || new Error('문서를 찾을 수 없습니다.');
      }

      const { data: publicData } = supabase.storage
        .from('123')
        .getPublicUrl(data.file_path);

      const publicUrl = publicData?.publicUrl;

      if (!publicUrl) {
        throw new Error('파일 URL을 생성할 수 없습니다.');
      }

      const lowerPath = data.file_path.toLowerCase();
      let type: 'image' | 'pdf' | 'other' = 'other';

      if (lowerPath.endsWith('.pdf')) {
        type = 'pdf';
      } else if (
        lowerPath.endsWith('.jpg') ||
        lowerPath.endsWith('.jpeg') ||
        lowerPath.endsWith('.png')
      ) {
        type = 'image';
      }

      setPreviewDoc({
        id: documentId,
        title: data.title,
        url: publicUrl,
        type,
      });
      setPreviewOpen(true);
    } catch (error) {
      console.error('문서 미리보기 로드 실패:', error);


      toast({
        title: t('sharedDocs.previewFailed'),
        description: t('sharedDocs.previewFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const unreadCount = useMemo(() =>
    sharedDocuments.filter(s => {
      const sharedDate = new Date(s.sharedAt);
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      return sharedDate > twoDaysAgo;
    }).length
  , [sharedDocuments]);

  const uniqueSharers = useMemo(() =>
    new Set(sharedDocuments.map(s => s.sharedByUserId)).size
  , [sharedDocuments]);

  const thisWeekCount = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return sharedDocuments.filter(s => new Date(s.sharedAt) > weekAgo).length;
  }, [sharedDocuments]);

  const isNewShare = (sharedAt: string) => {
    const sharedDate = new Date(sharedAt);
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    return sharedDate > twoDaysAgo;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton className="mb-4" />

        <V1PageHeader
          title={t('sharedDocs.title')}
          sub={t('sharedDocs.subtitle')}
          right={
            <div className="flex gap-2">
              <div className="relative w-48 sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={t('sharedDocs.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9 rounded-[10px] border-[#e5e7eb] text-[13px]"
                />
              </div>
            </div>
          }
        />

        {/* ─── 4 KPI Stat Tiles ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <V1StatTile title={t('sharedDocs.receivedDocs', { defaultValue: '받은 문서' })} value={sharedDocuments.length} icon={Share2} color="#2563eb" delta={thisWeekCount > 0 ? `+${thisWeekCount}` : undefined} />
          <V1StatTile title={t('sharedDocs.unread', { defaultValue: '읽지 않음' })} value={unreadCount} icon={Bell} color="#8b5cf6" delta={unreadCount > 0 ? `+${unreadCount}` : undefined} />
          <V1StatTile title={t('sharedDocs.sharers', { defaultValue: '공유자' })} value={uniqueSharers} icon={Users} color="#10b981" />
          <V1StatTile title={t('sharedDocs.thisWeek', { defaultValue: '이번 주' })} value={thisWeekCount} icon={Clock} color="#f59e0b" delta={thisWeekCount > 0 ? `+${thisWeekCount}` : undefined} />
        </div>

        {/* ─── V1 Document List ─── */}
        <div className={v1Card}>
          <V1CardHeader
            title={t('sharedDocs.listTitle')}
            icon={Share2}
            iconColor="#2563eb"
            sub={t('sharedDocs.totalShared', { count: filteredShares.length })}
          />

          {filteredShares.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">{searchQuery ? t('sharedDocs.noSearchResults') : t('sharedDocs.noSharedDocs')}</p>
            </div>
          ) : (
            <div>
              {filteredShares.map((share, idx) => {
                const unread = isNewShare(share.sharedAt);
                return (
                  <div
                    key={share.id}
                    className={`grid grid-cols-1 sm:grid-cols-[auto_1fr_auto_auto] gap-3 sm:gap-4 px-5 sm:px-6 py-4 items-center relative ${
                      idx < filteredShares.length - 1 ? 'border-b border-slate-100' : ''
                    } ${unread ? 'bg-[#eff6ff]' : ''}`}
                  >
                    {unread && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#2563eb] rounded-r" />}

                    {/* Icon */}
                    <div className="w-10 h-10 rounded-[10px] bg-[#eff6ff] flex items-center justify-center shrink-0">
                      <FileText className="h-[18px] w-[18px] text-[#1e40af]" />
                    </div>

                    {/* Content */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-slate-900 truncate">{share.documentName}</span>
                        {unread && <V1Chip variant="blue">NEW</V1Chip>}
                      </div>
                      <div className="text-xs text-slate-500 mb-1">
                        <strong className="font-semibold text-slate-900">{share.sharedByUserName}</strong>
                        {share.departmentName ? ` (${share.departmentName})` : ''}
                        {t('sharedDocs.sharedSuffix', { defaultValue: '님이 공유' })}
                        {' · '}
                        <span className="font-mono">{format(new Date(share.sharedAt), 'yyyy-MM-dd')}</span>
                      </div>
                      {share.message && (
                        <div className="text-xs text-slate-500 italic flex items-center gap-1.5">
                          <MessageCircle className="h-3 w-3 text-slate-400 shrink-0" />
                          "{share.message}"
                        </div>
                      )}
                    </div>

                    {/* Preview button */}
                    <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs rounded-md border-[#e5e7eb]" onClick={() => handleView(share.documentId)}>
                      <img src={previewIcon} alt={t('sharedDocs.preview')} className="w-3.5 h-3.5 mr-1" />
                      {t('sharedDocs.preview', { defaultValue: '미리보기' })}
                    </Button>

                    {/* Download + Delete */}
                    <div className="flex gap-1.5">
                      {share.permission === 'download' && (
                        <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs rounded-md border-[#e5e7eb]" onClick={() => handleDownload(share.documentId)}>
                          <img src={downloadIcon} alt={t('sharedDocs.download')} className="w-3.5 h-3.5 mr-1" />
                          {t('sharedDocs.download', { defaultValue: '다운로드' })}
                        </Button>
                      )}
                      <button
                        className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-red-50 border border-[#e5e7eb] transition-colors"
                        onClick={() => { setDeletingShareId(share.id); setDeleteDialogOpen(true); }}
                      >
                        <img src={binIcon} alt={t('common.delete')} className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 문서 미리보기 다이얼로그 */}
        <Dialog
          open={previewOpen}
          onOpenChange={(open) => {
            setPreviewOpen(open);
            if (!open) {
              setImageZoom(100);
              setImageRotation(0);
            }
          }}
        >
          {/* PDF 미리보기 */}
          {previewDoc?.type === 'pdf' && (
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col overflow-hidden" closeClassName="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded p-1.5">
              <DialogHeader>
                <DialogTitle className="truncate pr-8">{previewDoc?.title || t('sharedDocs.docPreview')}</DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-auto min-h-0">
                {previewLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-slate-500">{t('sharedDocs.loadingDoc')}</p>
                  </div>
                ) : (
                  previewDoc && <PdfViewer url={previewDoc.url} />
                )}
              </div>

              <DialogFooter className="border-t pt-3">
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm text-slate-500">{t('sharedDocs.pdfDoc')}</span>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPreviewOpen(false);
                      setImageZoom(100);
                      setImageRotation(0);
                    }}
                  >
                    {t('common.close')}
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          )}

          {/* 이미지 미리보기 */}
          {previewDoc?.type === 'image' && (
            <DialogContent className="max-w-6xl h-[90vh] flex flex-col overflow-hidden" closeClassName="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded p-1.5">
              <DialogHeader>
                <DialogTitle className="truncate pr-8">{previewDoc?.title || t('sharedDocs.imagePreview')}</DialogTitle>
              </DialogHeader>

              {/* 상단 툴바 */}
              <div className="flex items-center justify-center gap-2 p-2 border-b bg-slate-50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setImageZoom(Math.max(25, imageZoom - 25))}
                >
                  ➖
                </Button>

                <span className="text-sm font-medium min-w-[60px] text-center">
                  {imageZoom}%
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setImageZoom(Math.min(200, imageZoom + 25))}
                >
                  ➕
                </Button>

                <div className="w-px h-6 bg-slate-300 mx-2" />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setImageRotation((imageRotation + 90) % 360)}
                  title={t('sharedDocs.rotate90')}
                >
                  🔄
                </Button>

                {previewDoc && (
                  <>
                    <div className="w-px h-6 bg-slate-300 mx-2" />

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(previewDoc.id)}
                      title={t('sharedDocs.download')}
                    >
                      <img src={downloadIcon} alt={t('sharedDocs.download')} className="w-5 h-5" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const printWindow = window.open(previewDoc.url);
                        if (printWindow) {
                          setTimeout(() => {
                            printWindow.print();
                          }, 500);
                        }
                      }}
                      title={t('sharedDocs.print')}
                    >
                      🖨️
                    </Button>
                  </>
                )}
              </div>

              {/* 메인 이미지 영역 */}
              <div
                className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-8"
                onWheel={(e) => {
                  if (e.ctrlKey) {
                    e.preventDefault();
                    const delta = e.deltaY > 0 ? -10 : 10;
                    setImageZoom((prev) =>
                      Math.max(25, Math.min(200, prev + delta)),
                    );
                  }
                }}
              >
                {previewLoading ? (
                  <p className="text-slate-500">{t('sharedDocs.loadingImage')}</p>
                ) : (
                  previewDoc && (
                    <img
                      src={previewDoc.url}
                      alt={previewDoc.title}
                      style={{
                        transform: `scale(${imageZoom / 100}) rotate(${imageRotation}deg)`,
                        transition: 'transform 0.2s ease',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                      }}
                      className="shadow-lg"
                    />
                  )
                )}
              </div>

              {/* 하단 푸터 */}
              <DialogFooter className="border-t pt-3">
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm text-slate-500">{t('sharedDocs.imageDoc')}</span>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPreviewOpen(false);
                      setImageZoom(100);
                      setImageRotation(0);
                    }}
                  >
                    {t('common.close')}
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>

        {/* 삭제 확인 다이얼로그 */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('sharedDocs.deleteTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('sharedDocs.deleteConfirm')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setDeletingShareId(null);
                }}
              >
                {t('common.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (!deletingShareId) return;
                  setIsDeleting(true);
                  try {
                    await unshareDocument(deletingShareId);
                    toast({
                      title: t('documentMgmt.deleteComplete'),
                      description: t('sharedDocs.deleteCompleteDesc'),
                    });
                  } catch (error) {
                    console.error('삭제 실패:', error);
                    toast({
                      title: t('documentMgmt.deleteFailed'),
                      description: t('sharedDocs.deleteFailedDesc'),
                      variant: 'destructive',
                    });
                  } finally {
                    setIsDeleting(false);
                    setDeleteDialogOpen(false);
                    setDeletingShareId(null);
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('documentMgmt.deleting')}
                  </>
                ) : (
                  t('common.delete')
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
