import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
import downloadIcon from '@/assets/download.svg';
import binIcon from '@/assets/bin.svg';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { FileText, Search, Loader2 } from 'lucide-react';
import previewIcon from '@/assets/preview.svg';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton className="mb-4" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('sharedDocs.title')}</h1>
          <p className="text-slate-500 mt-1">
            {t('sharedDocs.subtitle')}
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('sharedDocs.listTitle')}</CardTitle>
                <CardDescription className="mt-1">
                  {t('sharedDocs.totalShared', { count: filteredShares.length })}
                </CardDescription>
              </div>
              <div className="w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder={t('sharedDocs.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredShares.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">
                  {searchQuery
                    ? t('sharedDocs.noSearchResults')
                    : t('sharedDocs.noSharedDocs')}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('sharedDocs.docName')}</TableHead>
                    <TableHead>{t('sharedDocs.sharedBy')}</TableHead>
                    <TableHead>{t('common.department')}</TableHead>
                    <TableHead>{t('sharedDocs.category')}</TableHead>
                    <TableHead>{t('sharedDocs.sharedDate')}</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShares.map((share) => (
                    <TableRow key={share.id}>
                      <TableCell className="font-medium">
                        <div>
                          <p>{share.documentName}</p>
                          {share.message && (
                            <p className="text-xs text-slate-500 mt-1">
                              {t('sharedDocs.memo')}: {share.message}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{share.sharedByUserName}</TableCell>
                      <TableCell>{share.departmentName}</TableCell>
                      <TableCell>{share.categoryName}</TableCell>
                      <TableCell>
                        {format(
                          new Date(share.sharedAt),
                          'yyyy-MM-dd HH:mm',
                          { locale: ko }
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => handleView(share.documentId)}
                          >
                            <img src={previewIcon} alt={t('sharedDocs.preview')} className="w-4 h-4" />
                          </Button>
                          {share.permission === 'download' && (
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => handleDownload(share.documentId)}
                            >
                              <img src={downloadIcon} alt={t('sharedDocs.download')} className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => {
                              setDeletingShareId(share.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <img src={binIcon} alt={t('common.delete')} className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

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
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col overflow-hidden" closeClassName="bg-blue-600 hover:bg-blue-700 text-white rounded p-1.5">
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
            <DialogContent className="max-w-6xl h-[90vh] flex flex-col overflow-hidden" closeClassName="bg-blue-600 hover:bg-blue-700 text-white rounded p-1.5">
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
