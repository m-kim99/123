import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { FileText, MapPin, Upload, Loader2, CheckCircle2, Share2, Trash2, Download, X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import binIcon from '@/assets/bin.svg';
import downloadIcon from '@/assets/download.svg';
import shareIcon from '@/assets/share.svg';
import previewIcon from '@/assets/preview.svg';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/lib/i18n';
import { createDocumentNotification } from '@/lib/notifications';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase';
import { downloadFile } from '@/lib/appBridge';
import { extractText } from '@/lib/ocr';
import { toast } from '@/hooks/use-toast';
import { formatDateTimeSimple } from '@/lib/utils';
import { PdfViewer } from '@/components/PdfViewer';
import { trackEvent } from '@/lib/analytics';
import { BackButton } from '@/components/BackButton';
import { V1ModalHeader, V1ModalBody, V1ModalFooter } from '@/components/ui/v1-components';

function splitFilesByType(files: File[]) {
  const pdfFiles: File[] = [];
  const imageFiles: File[] = [];

  files.forEach((file) => {
    const lowerName = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
    const isImage =
      file.type.startsWith('image/') ||
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg') ||
      lowerName.endsWith('.png');

    if (isPdf) {
      pdfFiles.push(file);
    } else if (isImage) {
      imageFiles.push(file);
    }
  });

  return { pdfFiles, imageFiles };
}

function getBaseNameWithoutExt(fileName: string) {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return fileName;
  return fileName.slice(0, lastDot);
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error(i18n.t('categoryDetail.imageDataReadError')));
      }
    };
    reader.onerror = () => {
      reject(reader.error || new Error(i18n.t('categoryDetail.imageReadError')));
    };
    reader.readAsDataURL(file);
  });
}

export function CategoryDetail() {
  const { t } = useTranslation();
  const { categoryId } = useParams<{ categoryId: string }>();
  
  // Selector 최적화: 상태값은 개별 selector로
  const categories = useDocumentStore((state) => state.categories);
  const documents = useDocumentStore((state) => state.documents);
  const departments = useDocumentStore((state) => state.departments);
  const subcategories = useDocumentStore((state) => state.subcategories);
  // 함수는 한 번에 가져오기 (참조 안정적)
  const { fetchDocuments, uploadDocument, shareDocument, unshareDocument } = useDocumentStore();
  const user = useAuthStore((state) => state.user);
  const primaryColor = '#2563eb';

  const category = categories.find((c) => c.id === categoryId);
  const categoryDocuments = documents.filter(
    (d) => d.parentCategoryId === categoryId,
  );
  const department = departments.find((d) => d.id === category?.departmentId);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [isDeletingDocument, setIsDeletingDocument] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<
    | {
        id: string;
        title: string;
        url: string;
        type: 'image' | 'pdf' | 'other';
        ocrText?: string | null;
        uploader?: string;
        uploadDate?: string;
        fileSize?: string;
      }
    | null
  >(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [imageZoom, setImageZoom] = useState(100); // 확대/축소 %
  const [imageRotation, setImageRotation] = useState(0); // 회전 각도

  // 공유 다이얼로그 상태
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharingDocumentId, setSharingDocumentId] = useState<string | null>(null);
  const [companyUsers, setCompanyUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSendingShare, setIsSendingShare] = useState(false);
  const [sendEmailNotification, setSendEmailNotification] = useState(false);
  const [activeShareTab, setActiveShareTab] = useState<'new' | 'existing'>('new');
  const [existingShares, setExistingShares] = useState<any[]>([]);
  const [isLoadingShares, setIsLoadingShares] = useState(false);

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [fileStatuses, setFileStatuses] = useState<
    { name: string; status: string; error?: string | null }[]
  >([]);

  const [documentTitle, setDocumentTitle] = useState('');

  if (!category) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <BackButton className="mb-4" />
          <p className="text-slate-500">{t('categoryDetail.categoryNotFound')}</p>
        </div>
      </DashboardLayout>
    );
  }

  const handleUploadClick = () => {
    setUploadDialogOpen(true);
    setUploadFiles([]);
    setUploadProgress(0);
    setUploadStatus('');
    setUploadError(null);
    setUploadSuccess(false);
    setFileStatuses([]);
    setDocumentTitle('');
  };

  const handleOpenPreviewDocument = async (documentId: string) => {
    try {
      trackEvent('document_preview_open', {
        document_id: documentId,
        preview_context: 'category_detail',
      });

      setPreviewLoading(true);

      const { data, error } = await supabase
        .from('documents')
        .select('file_path, title, ocr_text, uploaded_by, uploaded_at, file_size')
        .eq('id', documentId)
        .single();

      if (error || !data) {
        throw error || new Error('Document not found');
      }

      const { data: publicData } = supabase.storage
        .from('123')
        .getPublicUrl(data.file_path);

      const publicUrl = publicData?.publicUrl;

      if (!publicUrl) {
        throw new Error('Could not generate file URL');
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

      const fileSizeRaw = (data as any).file_size;
      let fileSizeStr: string | undefined;
      if (fileSizeRaw) {
        const bytes = Number(fileSizeRaw);
        if (bytes >= 1048576) fileSizeStr = `${(bytes / 1048576).toFixed(1)}MB`;
        else if (bytes >= 1024) fileSizeStr = `${Math.round(bytes / 1024)}KB`;
        else fileSizeStr = `${bytes}B`;
      }

      setPreviewDoc({
        id: documentId,
        title: data.title,
        url: publicUrl,
        type,
        ocrText: (data as any).ocr_text ?? null,
        uploader: (data as any).uploaded_by ?? undefined,
        uploadDate: (data as any).uploaded_at ? new Date((data as any).uploaded_at).toLocaleDateString() : undefined,
        fileSize: fileSizeStr,
      });
      setPreviewOpen(true);
    } catch (error) {
      console.error('문서 미리보기 로드 실패:', error);


      toast({
        title: t('subcategoryDetail.previewFailed'),
        description: t('subcategoryDetail.previewFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleFileDrop = useCallback((acceptedFiles: File[]) => {
    if (!acceptedFiles || acceptedFiles.length === 0) {
      return;
    }

    const validFiles = acceptedFiles.filter((file) => {
      const lowerName = file.name.toLowerCase();
      const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
      const isImage =
        file.type.startsWith('image/') ||
        lowerName.endsWith('.jpg') ||
        lowerName.endsWith('.jpeg') ||
        lowerName.endsWith('.png');

      return isPdf || isImage;
    });

    if (validFiles.length === 0) {
      setUploadError(t('documentMgmt.onlyPdfJpgPng'));
      setUploadFiles([]);
      setFileStatuses([]);
      return;
    }

    setUploadFiles(validFiles);
    setUploadError(null);
    setUploadSuccess(false);

    const { pdfFiles, imageFiles } = splitFilesByType(validFiles);

    if (imageFiles.length > 0 && pdfFiles.length === 0) {
      setDocumentTitle(getBaseNameWithoutExt(imageFiles[0].name));
    } else if (pdfFiles.length === 1 && imageFiles.length === 0) {
      setDocumentTitle(getBaseNameWithoutExt(pdfFiles[0].name));
    } else {
      setDocumentTitle('');
    }

    setFileStatuses(
      validFiles.map((file) => ({
        name: file.name,
        status: t('documentMgmt.waitingUpload'),
        error: null,
      }))
    );

    if (imageFiles.length > 0 && pdfFiles.length === 0 && imageFiles.length > 1) {
      setUploadStatus(t('categoryDetail.imagesAsOneDoc', { count: imageFiles.length }));
    } else if (imageFiles.length > 0 && pdfFiles.length > 0) {
      setUploadStatus(t('categoryDetail.pdfAndImageBundle', { pdfCount: pdfFiles.length }));
    } else {
      setUploadStatus(t('documentMgmt.filesSelected', { count: validFiles.length }));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png'],
      'application/pdf': ['.pdf'],
    },
    multiple: true,
    onDropRejected: (fileRejections) => {
      const rejection = fileRejections[0];
      if (rejection?.errors[0]?.code === 'file-invalid-type') {
        setUploadError(t('documentMgmt.onlyPdfJpgPng'));
      } else {
        setUploadError(t('documentMgmt.uploadFailedGeneric'));
      }
    },
  });

  const { pdfFiles: selectedPdfFiles, imageFiles: selectedImageFiles } =
    splitFilesByType(uploadFiles);
  const hasSelectedImageGroup = selectedImageFiles.length > 0;
  const totalDocsToCreate =
    selectedPdfFiles.length + (hasSelectedImageGroup ? 1 : 0);
  const canEditTitle = totalDocsToCreate === 1;

  const handleUpload = async () => {
    if (!uploadFiles.length || !category || !user) {
      return;
    }

    const targetSubcategory = subcategories.find(
      (s) => s.parentCategoryId === category.id,
    );

    if (!targetSubcategory) {
      setUploadError(
        t('categoryDetail.noSubcategoryForUpload'),
      );
      return;
    }

    const parentCategoryId = targetSubcategory.parentCategoryId;
    const departmentId = targetSubcategory.departmentId;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus(t('documentMgmt.preparingUpload'));
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const { pdfFiles, imageFiles } = splitFilesByType(uploadFiles);
      const totalFiles = uploadFiles.length;
      let completedCount = 0;
      let successCount = 0;
      let failureCount = 0;

      setFileStatuses(
        uploadFiles.map((file) => ({
          name: file.name,
          status: t('documentMgmt.waitingUpload'),
          error: null,
        }))
      );

      const getSingleDocTitle = () => {
        const trimmed = documentTitle.trim();
        if (trimmed) return trimmed;
        if (imageFiles.length > 0) {
          return getBaseNameWithoutExt(imageFiles[0].name);
        }
        if (pdfFiles.length === 1) {
          return getBaseNameWithoutExt(pdfFiles[0].name);
        }
        return t('documentMgmt.document');
      };

      // PDF 파일 병렬 처리 (Promise.allSettled 사용)
      const pdfUploadPromises = pdfFiles.map(async (file) => {
        const index = uploadFiles.indexOf(file);

        try {
          setFileStatuses((prev) => {
            const next = [...prev];
            if (next[index]) {
              next[index] = { ...next[index], status: t('documentMgmt.processing') };
            }
            return next;
          });

          let ocrText = '';

          try {
            ocrText = await extractText(file);
          } catch (ocrError) {
            console.error('OCR 처리 오류:', file.name, ocrError);
          }

          const baseName = getBaseNameWithoutExt(file.name);
          const title =
            pdfFiles.length === 1 && imageFiles.length === 0
              ? getSingleDocTitle()
              : baseName;

          await uploadDocument({
            name: title,
            originalFileName: file.name,
            categoryId: category.id,
            parentCategoryId,
            subcategoryId: targetSubcategory.id,
            departmentId,
            uploader: user.name || user.email || 'Unknown',
            classified: false,
            file,
            ocrText,
          });

          setFileStatuses((prev) => {
            const next = [...prev];
            if (next[index]) {
              next[index] = { ...next[index], status: t('documentMgmt.completed'), error: null };
            }
            return next;
          });

          return { success: true, fileName: file.name };
        } catch (fileError) {
          console.error('Upload error:', file.name, fileError);

          setFileStatuses((prev) => {
            const next = [...prev];
            if (next[index]) {
              next[index] = {
                ...next[index],
                status: t('documentMgmt.failed'),
                error:
                  fileError instanceof Error
                    ? fileError.message
                    : t('documentMgmt.uploadErrorGeneric'),
              };
            }
            return next;
          });

          return { success: false, fileName: file.name, error: fileError };
        }
      });

      // 모든 PDF 파일 동시 업로드
      const pdfResults = await Promise.allSettled(pdfUploadPromises);

      // 결과 집계
      pdfResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.success) {
          successCount += 1;
        } else {
          failureCount += 1;
        }
        completedCount += 1;
        setUploadProgress(Math.round((completedCount / totalFiles) * 100));
      });

      setUploadStatus(t('documentMgmt.pdfUploadComplete', { count: pdfFiles.length }));

      // 이미지 파일들을 하나의 문서로 묶어서 처리 (OCR 병렬 처리)
      if (imageFiles.length > 1) {
        setUploadStatus(t('categoryDetail.parallelOcr', { count: imageFiles.length }));

        // 병렬 OCR 처리 (Promise.all 사용)
        const ocrPromises = imageFiles.map(async (file, i) => {
          const index = uploadFiles.indexOf(file);

          try {
            setFileStatuses((prev) => {
              const next = [...prev];
              if (next[index]) {
                next[index] = { ...next[index], status: t('documentMgmt.ocrProcessing') };
              }
              return next;
            });

            let ocrText = '';
            try {
              ocrText = await extractText(file);
            } catch (ocrError) {
              console.error('OCR 처리 오류:', file.name, ocrError);
            }

            setFileStatuses((prev) => {
              const next = [...prev];
              if (next[index]) {
                next[index] = { ...next[index], status: t('documentMgmt.ocrComplete') };
              }
              return next;
            });

            // 인덱스와 함께 반환하여 순서 보장
            return {
              index: i,
              text: ocrText && ocrText.trim()
                ? `--- ${t('categoryDetail.page')} ${i + 1} ---\n${ocrText.trim()}\n`
                : '',
            };
          } catch (fileError) {
            console.error('이미지 OCR 오류:', file.name, fileError);
            failureCount += 1;

            setFileStatuses((prev) => {
              const next = [...prev];
              if (next[index]) {
                next[index] = {
                  ...next[index],
                  status: t('documentMgmt.failed'),
                  error: fileError instanceof Error
                    ? fileError.message
                    : t('categoryDetail.ocrProcessFailed'),
                };
              }
              return next;
            });

            return { index: i, text: '' };
          } finally {
            completedCount += 1;
            setUploadProgress(Math.round((completedCount / totalFiles) * 100));
          }
        });

        // 모든 OCR 작업 완료 대기
        const ocrResults = await Promise.all(ocrPromises);

        // 원래 순서대로 정렬하여 텍스트 결합
        const ocrParts = ocrResults
          .sort((a, b) => a.index - b.index)
          .map(result => result.text)
          .filter(text => text.length > 0);

        const allOcrText = ocrParts.join('\n');

        try {
          setUploadStatus(t('categoryDetail.generatingPdf'));

          const { jsPDF } = await import('jspdf');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();

          for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            const imgData = await readFileAsDataURL(file);

            if (i > 0) {
              pdf.addPage();
            }

            const lowerName = file.name.toLowerCase();
            const isPng =
              file.type === 'image/png' ||
              lowerName.endsWith('.png');

            pdf.addImage(
              imgData,
              isPng ? 'PNG' : 'JPEG',
              0,
              0,
              pageWidth,
              pageHeight
            );
          }

          const pdfBlob = pdf.output('blob');

          const firstImage = imageFiles[0];
          const imageTitle =
            pdfFiles.length === 0 && imageFiles.length > 0
              ? getSingleDocTitle()
              : getBaseNameWithoutExt(firstImage.name);

          const pdfFileNameBase = imageTitle || getBaseNameWithoutExt(firstImage.name);
          const pdfFileName = `${pdfFileNameBase || 'document'}.pdf`;
          const pdfFile = new File([pdfBlob], pdfFileName, {
            type: 'application/pdf',
          });

          setUploadStatus(t('documentMgmt.uploading'));

          await uploadDocument({
            name: imageTitle,
            originalFileName: pdfFileName,
            categoryId: category.id,
            parentCategoryId,
            subcategoryId: targetSubcategory.id,
            departmentId,
            uploader: user.name || user.email || 'Unknown',
            classified: false,
            file: pdfFile,
            ocrText: allOcrText,
          });

          successCount += 1;
          setUploadStatus(t('documentMgmt.imageBundleComplete', { count: imageFiles.length }));
        } catch (groupError) {
          console.error('이미지 묶음 업로드 오류:', groupError);
          failureCount += 1;
          setUploadError(
            groupError instanceof Error
              ? groupError.message
              : t('documentMgmt.imageUploadError'),
          );
        }
      } else if (imageFiles.length === 1) {
        const file = imageFiles[0];
        const index = uploadFiles.indexOf(file);
        try {
          setFileStatuses((prev) => {
            const next = [...prev];
            if (next[index]) {
              next[index] = { ...next[index], status: t('documentMgmt.processing') };
            }
            return next;
          });

          setUploadStatus(t('categoryDetail.singleImageOcr'));

          let ocrText = '';
          try {
            ocrText = await extractText(file);
          } catch (ocrError) {
            console.error('OCR 처리 오류:', file.name, ocrError);
          }

          const imageTitle =
            pdfFiles.length === 0
              ? getSingleDocTitle()
              : getBaseNameWithoutExt(file.name);

          await uploadDocument({
            name: imageTitle,
            originalFileName: file.name,
            categoryId: category.id,
            parentCategoryId,
            subcategoryId: targetSubcategory.id,
            departmentId,
            uploader: user.name || user.email || 'Unknown',
            classified: false,
            file,
            ocrText,
          });

          successCount += 1;

          setFileStatuses((prev) => {
            const next = [...prev];
            if (next[index]) {
              next[index] = { ...next[index], status: t('documentMgmt.completed'), error: null };
            }
            return next;
          });
        } catch (fileError) {
          console.error('Upload error:', file.name, fileError);
          failureCount += 1;

          setFileStatuses((prev) => {
            const next = [...prev];
            if (next[index]) {
              next[index] = {
                ...next[index],
                status: t('documentMgmt.failed'),
                error:
                  fileError instanceof Error
                    ? fileError.message
                    : t('documentMgmt.uploadErrorGeneric'),
              };
            }
            return next;
          });
        } finally {
          completedCount += 1;
          setUploadProgress(Math.round((completedCount / totalFiles) * 100));
        }
      }

      await fetchDocuments();

      if (successCount > 0) {
        setUploadSuccess(true);
        toast({
          title: t('documentMgmt.uploadComplete'),
          description: t('categoryDetail.docsUploaded', { count: successCount }),
        });
      }

      if (failureCount > 0) {
        setUploadError(
          failureCount === totalFiles
            ? t('documentMgmt.allUploadsFailed')
            : t('documentMgmt.someUploadsFailed', { count: failureCount }),
        );
      }

      setUploadStatus(t('documentMgmt.uploadComplete'));

      setTimeout(() => {
        setUploadFiles([]);
        setUploadProgress(0);
        setUploadStatus('');
        setUploadSuccess(false);
        setFileStatuses([]);
        setUploadDialogOpen(false);
        setDocumentTitle('');
      }, 1000);
    } catch (error) {
      console.error('업로드 오류:', error);
      setUploadError(
        error instanceof Error ? error.message : t('documentMgmt.uploadErrorGeneric')
      );
      setUploadStatus('');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadDocument = async (documentId: string) => {
    try {
      trackEvent('document_download', {
        document_id: documentId,
        download_context: 'category_detail',
      });

      const { data, error } = await supabase
        .from('documents')
        .select('file_path, title')
        .eq('id', documentId)
        .single();

      if (error || !data) {
        throw error || new Error('Document not found');
      }

      const { data: publicData } = supabase.storage
        .from('123')
        .getPublicUrl(data.file_path);

      if (!publicData?.publicUrl) {
        throw new Error('Could not generate file URL');
      }

      await downloadFile(publicData.publicUrl, data.title || 'document');
    } catch (error) {
      console.error('Document download failed:', error);


      toast({
        title: t('documentMgmt.downloadFailed'),
        description: t('documentMgmt.downloadFailedDesc'),
        variant: 'destructive',
      });
    }
  };

  const handleOpenDeleteDialog = (documentId: string) => {
    setDeletingDocumentId(documentId);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeletingDocumentId(null);
    setIsDeletingDocument(false);
  };

  const handleConfirmDeleteDocument = async () => {
    if (!deletingDocumentId) {
      return;
    }

    setIsDeletingDocument(true);

    const targetDoc = categoryDocuments.find((d) => d.id === deletingDocumentId);

    try {
      trackEvent('document_delete', {
        document_id: deletingDocumentId,
        delete_context: 'category_detail',
      });

      const { data, error } = await supabase
        .from('documents')
        .select('file_path')
        .eq('id', deletingDocumentId)
        .single();

      if (error) {
        throw error;
      }

      const filePath = data?.file_path as string | undefined;
      console.log('삭제할 파일 경로:', filePath);
      console.log('타입:', typeof filePath);

      if (!filePath) {
        console.error('파일 경로가 없습니다');
      } else {
        const { error: storageError } = await supabase.storage
          .from('123')
          .remove([filePath]);

        if (storageError) {
          console.error('Storage 삭제 실패:', storageError);
        }
      }

      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', deletingDocumentId);

      if (dbError) {
        throw dbError;
      }

      await fetchDocuments();

      toast({
        title: t('documentMgmt.deleteComplete'),
        description: t('documentMgmt.deleteCompleteDesc'),
      });

      if (user?.companyId && targetDoc) {
        const subcategoryForDoc = subcategories.find(
          (s) => s.id === targetDoc.subcategoryId,
        );

        await createDocumentNotification({
          type: 'document_deleted',
          documentId: deletingDocumentId,
          title: targetDoc.name,
          companyId: user.companyId,
          departmentId: targetDoc.departmentId,
          departmentName: department?.name ?? null,
          parentCategoryId: targetDoc.parentCategoryId,
          parentCategoryName: category?.name ?? null,
          subcategoryId: targetDoc.subcategoryId,
          subcategoryName: subcategoryForDoc?.name ?? null,
        });
      }

      handleCloseDeleteDialog();
    } catch (error) {
      console.error('문서 삭제 실패:', error);


      toast({
        title: t('documentMgmt.deleteFailed'),
        description: t('documentMgmt.deleteFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsDeletingDocument(false);
    }
  };

  // 공유 다이얼로그 열기
  const handleOpenShareDialog = async (documentId: string) => {
    trackEvent('share_dialog_open', {
      document_id: documentId,
      share_context: 'category_detail',
    });

    setSharingDocumentId(documentId);
    setSelectedUserIds([]);
    setActiveShareTab('new');
    setShareDialogOpen(true);
    setIsLoadingUsers(true);
    setIsLoadingShares(true);

    try {
      if (!user?.companyId) {
        throw new Error('Company info not found');
      }

      // 1. 공유 가능한 사용자 목록
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('company_id', user.companyId)
        .neq('id', user.id)
        .order('name');

      if (usersError) throw usersError;
      setCompanyUsers(usersData || []);

      // 2. 현재 공유 현황 (FK JOIN 대신 별도 쿼리)
      const { data: sharesData, error: sharesError } = await supabase
        .from('shared_documents')
        .select('id, shared_to_user_id, shared_at, permission')
        .eq('document_id', documentId)
        .eq('shared_by_user_id', user.id)
        .eq('is_active', true)
        .order('shared_at', { ascending: false });

      if (sharesError) throw sharesError;

      // 3. 공유받은 사용자 정보 조회
      if (sharesData && sharesData.length > 0) {
        const sharedToUserIds = [...new Set(sharesData.map((s: any) => s.shared_to_user_id))];
        const { data: sharedUsersData } = await supabase
          .from('users')
          .select('id, name, email')
          .in('id', sharedToUserIds);

        const usersMap = new Map((sharedUsersData || []).map((u: any) => [u.id, u]));

        const sharesWithUsers = sharesData.map((share: any) => ({
          ...share,
          users: usersMap.get(share.shared_to_user_id) || null,
        }));

        setExistingShares(sharesWithUsers);
      } else {
        setExistingShares([]);
      }

    } catch (error) {
      console.error('공유 정보 로드 실패:', error);
      toast({
        title: t('documentMgmt.shareLoadFailed'),
        description: t('documentMgmt.shareLoadFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsLoadingUsers(false);
      setIsLoadingShares(false);
    }
  };

  // 공유 취소
  const handleUnshare = async (shareId: string) => {
    if (!confirm(t('documentMgmt.confirmUnshare'))) return;

    try {
      await unshareDocument(shareId);
      
      // 목록에서 제거
      setExistingShares((prev) => prev.filter((s) => s.id !== shareId));
      
      toast({
        title: t('documentMgmt.unshareComplete'),
        description: t('documentMgmt.unshareCompleteDesc'),
      });
    } catch (error) {
      console.error('공유 취소 실패:', error);
      toast({
        title: t('documentMgmt.unshareFailed'),
        description: t('documentMgmt.unshareFailedDesc'),
        variant: 'destructive',
      });
    }
  };

  // 사용자 선택 토글
  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // 전체 선택/해제
  const handleSelectAllUsers = () => {
    if (selectedUserIds.length === companyUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(companyUsers.map((u) => u.id));
    }
  };

  // 공유 이메일 전송
  const handleSendShare = async () => {
    if (!sharingDocumentId || selectedUserIds.length === 0) {
      toast({
        title: t('documentMgmt.selectionError'),
        description: t('documentMgmt.selectUsersToShare'),
        variant: 'destructive',
      });
      return;
    }

    trackEvent('document_share_send', {
      document_id: sharingDocumentId,
      recipient_count: selectedUserIds.length,
      send_email_notification: sendEmailNotification,
      share_context: 'category_detail',
    });

    setIsSendingShare(true);

    try {
      const doc = categoryDocuments.find((d) => d.id === sharingDocumentId);
      if (!doc) {
        throw new Error('Document not found');
      }

      // 1. DB에 공유 정보 저장 (필수)
      for (const userId of selectedUserIds) {
        await shareDocument(sharingDocumentId, userId, 'download', undefined);
      }

      // 2. 이메일 전송 (선택사항)
      if (sendEmailNotification) {
        const { data: docData, error: docError } = await supabase
          .from('documents')
          .select('file_path, title')
          .eq('id', sharingDocumentId)
          .single();

        if (!docError && docData) {
          const { data: publicData } = supabase.storage
            .from('123')
            .getPublicUrl(docData.file_path);

          const documentUrl = publicData?.publicUrl || '';
          const selectedUsers = companyUsers.filter((u) => selectedUserIds.includes(u.id));
          const recipientEmails = selectedUsers.map((u) => u.email);

          // 이메일 전송 시도 (실패해도 공유는 성공으로 처리)
          try {
            await supabase.functions.invoke('send-share-email', {
              body: {
                recipientEmails,
                documentTitle: doc.name,
                documentUrl,
                senderName: user?.name || t('common.unknown'),
                senderEmail: user?.email || '',
              },
            });
          } catch (emailError) {
            console.warn('이메일 전송 실패 (공유는 완료됨):', emailError);
          }
        }
      }

      toast({
        title: t('documentMgmt.shareComplete'),
        description: t('documentMgmt.shareCompleteDesc', { count: selectedUserIds.length }) + (sendEmailNotification ? ' ' + t('documentMgmt.emailSentToo') : ''),
      });

      setShareDialogOpen(false);
      setSharingDocumentId(null);
      setSelectedUserIds([]);
      setSendEmailNotification(false);
    } catch (error) {
      console.error('문서 공유 실패:', error);
      toast({
        title: t('documentMgmt.shareFailed'),
        description: t('documentMgmt.shareFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsSendingShare(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <BackButton className="mb-4" />

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-[28px] sm:text-[30px] font-bold tracking-tight text-slate-900">
                {category.name}
              </h1>
              <p className="text-slate-500 mt-1">{category.description}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">{t('categoryDetail.deptCode')}</p>
              <p className="text-2xl font-bold mt-2">{department?.code}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">{t('subcategoryDetail.docCount')}</p>
              <p className="text-2xl font-bold mt-2">
                {categoryDocuments.length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-slate-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-500">{t('subcategoryDetail.storageLocation')}</p>
                  <p className="text-sm font-bold mt-1">
                    {category.storageLocation || t('subcategoryDetail.unassigned')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('subcategoryDetail.documentList')}</CardTitle>
            <Button onClick={handleUploadClick} disabled={isUploading}>
              <Upload className="h-4 w-4 mr-2" />
              {t('subcategoryDetail.uploadDocument')}
            </Button>
          </CardHeader>
          <CardContent>
            {categoryDocuments.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                {t('categoryDetail.noDocuments')}
              </div>
            ) : (
              <div className="space-y-3">
                {categoryDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${primaryColor}20` }}
                      >
                        <FileText
                          className="h-5 w-5"
                          style={{ color: primaryColor }}
                        />
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <p className="font-medium truncate flex-1 min-w-0">{doc.name}</p>
                          {doc.classified && (
                            <Badge variant="destructive" className="text-xs">
                              {t('documentMgmt.confidential')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 truncate">
                          {[
                            formatDateTimeSimple(doc.uploadDate),
                            doc.uploader || null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleOpenPreviewDocument(doc.id)}
                        title={t('subcategoryDetail.preview')}
                      >
                        <img src={previewIcon} alt={t('subcategoryDetail.preview')} className="w-full h-full p-1.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDownloadDocument(doc.id)}
                      >
                        <img src={downloadIcon} alt={t('documentMgmt.download')} className="w-full h-full p-1.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleOpenShareDialog(doc.id)}
                      >
                        <img src={shareIcon} alt={t('documentMgmt.shared')} className="w-full h-full p-1.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleOpenDeleteDialog(doc.id)}
                      >
                        <img src={binIcon} alt={t('common.delete')} className="w-full h-full p-1.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <AlertDialog
              open={deleteDialogOpen}
              onOpenChange={(open) => {
                if (!open) {
                  handleCloseDeleteDialog();
                }
              }}
            >
              <AlertDialogContent className="max-w-[440px] gap-0 p-0 rounded-[16px]">
                <div className="flex items-start gap-3 px-6 pt-5 pb-4 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: '#ef444415' }}>
                    <Trash2 className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <AlertDialogTitle className="text-[17px] font-semibold tracking-[-0.01em]">{t('documentMgmt.deleteDoc')}</AlertDialogTitle>
                    <AlertDialogDescription className="text-[13px] text-slate-500 mt-1">
                      {t('subcategoryDetail.confirmDelete')}
                    </AlertDialogDescription>
                  </div>
                </div>
                <AlertDialogFooter className="flex gap-2 justify-end px-6 py-3.5 border-t border-slate-100 bg-[#fafbfc] rounded-b-[16px]">
                  <AlertDialogCancel disabled={isDeletingDocument} className="h-9 rounded-[10px] text-[13px] font-semibold border-[#e5e7eb]">
                    {t('common.cancel')}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleConfirmDeleteDocument}
                    className="h-9 rounded-[10px] text-[13px] font-semibold bg-red-100 text-red-800 hover:bg-red-200 border-none"
                    disabled={isDeletingDocument}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    {isDeletingDocument ? t('documentMgmt.deleting') : t('common.delete')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent variant="v1" className="max-w-[560px]">
            <V1ModalHeader icon={Upload} title={t('subcategoryDetail.uploadDocument')} sub={t('categoryDetail.uploadDialogDesc')} />
            <V1ModalBody>
              {/* V1 Dropzone */}
              <div
                {...getRootProps({
                  className: `border-2 border-dashed rounded-[12px] p-7 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? 'border-[#2563eb] bg-[#eff6ff]'
                      : uploadFiles.length > 0
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-[#2563eb] bg-[#eff6ff]'
                  }`,
                })}
              >
                <input {...getInputProps()} />
                {uploadFiles.length > 0 ? (
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="w-11 h-11 rounded-[10px] bg-white flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                    </div>
                    <p className="text-[13px] font-medium text-emerald-700">
                      {uploadFiles.length === 1 ? uploadFiles[0].name : t('documentMgmt.filesSelected', { count: uploadFiles.length })}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="w-11 h-11 rounded-[10px] bg-white flex items-center justify-center">
                      <Upload className="h-[22px] w-[22px] text-[#2563eb]" />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-slate-900">{isDragActive ? t('documentMgmt.dropHere') : t('documentMgmt.clickOrDrag')}</p>
                      <p className="text-[12px] text-slate-500 mt-1">{t('documentMgmt.supportedFormats')}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Upload progress / status */}
              <div className="flex flex-col gap-2 text-[13px]">
                <p className="text-slate-600">{t('categoryDetail.category')}: <strong>{category.name}</strong></p>
                {uploadStatus && (
                  <p className="text-slate-500">{t('categoryDetail.status')}: {uploadStatus}</p>
                )}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                      <span>{t('categoryDetail.progress')}</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className="bg-[#2563eb] h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}
                {uploadError && <p className="text-red-500 text-[12px]">{uploadError}</p>}
                {uploadSuccess && <p className="text-emerald-600 text-[12px] font-medium">{t('categoryDetail.uploadDone')}</p>}
                {fileStatuses.length > 0 && (
                  <div className="flex flex-col gap-0.5 text-[12px] border border-slate-100 rounded-lg p-2">
                    {fileStatuses.map(
                      (file: { name: string; status: string; error?: string | null }) => (
                        <div key={file.name} className="flex items-center justify-between gap-2">
                          <span className="truncate max-w-[60%] text-slate-700">{file.name}</span>
                          <span className={file.error ? 'text-red-500' : file.status === t('documentMgmt.completed') ? 'text-emerald-600 font-medium' : 'text-slate-500'}>
                            {file.error ? t('documentMgmt.failed') : file.status}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                )}
                {canEditTitle && uploadFiles.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-1">
                    <Label className="text-[13px] font-medium">{t('documentMgmt.docTitle')}</Label>
                    <Input
                      value={documentTitle}
                      onChange={(e) => setDocumentTitle(e.target.value)}
                      placeholder={t('categoryDetail.enterDocTitle')}
                      className="h-[38px] rounded-lg"
                    />
                    <p className="text-[11px] text-slate-500">
                      {selectedImageFiles.length > 1
                        ? t('categoryDetail.imagesAsOneDoc', { count: selectedImageFiles.length })
                        : t('categoryDetail.defaultTitleNote')}
                    </p>
                  </div>
                )}
              </div>
            </V1ModalBody>
            <V1ModalFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setUploadDialogOpen(false)}
                disabled={isUploading}
                className="h-9 rounded-[10px] text-[13px] font-semibold border-[#e5e7eb]"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                onClick={handleUpload}
                disabled={uploadFiles.length === 0 || isUploading}
                className="h-9 rounded-[10px] text-[13px] font-semibold "
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                {isUploading ? t('documentMgmt.uploading') : t('documentMgmt.upload')}
              </Button>
            </V1ModalFooter>
          </DialogContent>
        </Dialog>
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
          <DialogContent className="max-w-[840px] h-[90vh] flex flex-col overflow-hidden gap-0 p-0 rounded-[16px]" hideClose>
            {/* V1 M4 Compact Header */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 shrink-0">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[#eff6ff]">
                <FileText className="h-4 w-4 text-[#1e40af]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-slate-900 truncate">{previewDoc?.title || t('documentMgmt.docPreview')}</div>
                <div className="text-[11.5px] text-slate-500 font-mono truncate">
                  {[previewDoc?.uploader, previewDoc?.uploadDate, previewDoc?.fileSize].filter(Boolean).join(' · ') || (previewDoc?.type === 'pdf' ? 'PDF' : 'Image')}
                </div>
              </div>
              {previewDoc && (
                <button
                  onClick={() => handleDownloadDocument(previewDoc.id)}
                  className="h-8 px-2.5 rounded-lg border border-[#e5e7eb] bg-white text-[12px] font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  {t('documentMgmt.download')}
                </button>
              )}
              <button
                onClick={() => { setPreviewOpen(false); setImageZoom(100); setImageRotation(0); }}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* V1 M4 Two-panel layout */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left: Viewer */}
              <div className="flex-1 bg-[#f1f5f9] flex flex-col overflow-hidden relative">
                {previewDoc?.type === 'image' && (
                  <div className="flex items-center justify-center gap-1.5 px-3 py-2 border-b border-slate-200 bg-white/80 backdrop-blur-sm shrink-0">
                    <button onClick={() => setImageZoom(Math.max(25, imageZoom - 25))} className="w-8 h-8 rounded-lg border border-[#e5e7eb] bg-white flex items-center justify-center hover:bg-slate-50">
                      <ZoomOut className="h-3.5 w-3.5 text-slate-600" />
                    </button>
                    <span className="text-[12px] font-medium text-slate-700 min-w-[48px] text-center font-mono">{imageZoom}%</span>
                    <button onClick={() => setImageZoom(Math.min(200, imageZoom + 25))} className="w-8 h-8 rounded-lg border border-[#e5e7eb] bg-white flex items-center justify-center hover:bg-slate-50">
                      <ZoomIn className="h-3.5 w-3.5 text-slate-600" />
                    </button>
                    <div className="w-px h-5 bg-slate-200 mx-1" />
                    <button onClick={() => setImageRotation((imageRotation + 90) % 360)} className="w-8 h-8 rounded-lg border border-[#e5e7eb] bg-white flex items-center justify-center hover:bg-slate-50" title={t('documentMgmt.rotate90')}>
                      <RotateCw className="h-3.5 w-3.5 text-slate-600" />
                    </button>
                  </div>
                )}
                <div
                  className="flex-1 overflow-auto flex items-center justify-center p-8"
                  onWheel={(e) => {
                    if (previewDoc?.type === 'image' && e.ctrlKey) {
                      e.preventDefault();
                      const delta = e.deltaY > 0 ? -10 : 10;
                      setImageZoom((prev) => Math.max(25, Math.min(200, prev + delta)));
                    }
                  }}
                >
                  {previewLoading ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-[#2563eb]" />
                      <p className="text-[13px] text-slate-500">{t('documentMgmt.loadingDoc')}</p>
                    </div>
                  ) : previewDoc?.type === 'pdf' ? (
                    <div className="w-full h-full"><PdfViewer url={previewDoc.url} /></div>
                  ) : previewDoc?.type === 'image' ? (
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
                      className="rounded shadow-[0_20px_40px_-12px_rgba(0,0,0,0.25)]"
                    />
                  ) : null}
                </div>
              </div>

              {/* Right: OCR + Meta sidebar */}
              <div className="w-[280px] border-l border-[#e5e7eb] bg-white flex flex-col overflow-hidden shrink-0 hidden md:flex">
                <div className="p-4 border-b border-slate-100 flex-1 overflow-auto">
                  <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-2">
                    OCR {t('documentMgmt.extractedText', { defaultValue: '추출 텍스트' })} · {previewDoc?.ocrText?.length?.toLocaleString() ?? 0}{t('documentMgmt.chars', { defaultValue: '자' })}
                  </div>
                  <div className="text-[11.5px] text-slate-500 leading-relaxed whitespace-pre-wrap">
                    {previewDoc?.ocrText || t('documentMgmt.noOcrText', { defaultValue: 'OCR 텍스트 없음' })}
                  </div>
                </div>
                <div className="p-4 border-b border-slate-100 shrink-0">
                  <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-2.5">
                    {t('documentMgmt.docInfo', { defaultValue: '문서 정보' })}
                  </div>
                  <div className="flex flex-col gap-2 text-[12px]">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">{t('categoryDetail.category')}</span>
                      <span className="text-slate-900 font-medium">{category?.name ?? '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 문서 공유 다이얼로그 */}
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent variant="v1" className="max-w-[560px] max-h-[80vh] overflow-hidden flex flex-col">
            <V1ModalHeader icon={Share2} title={t('documentMgmt.shareDoc')} sub={t('documentMgmt.shareDocDesc')} />

            {/* V1 탭 */}
            <div className="flex px-6 border-b border-slate-100">
              {[
                { key: 'new' as const, label: t('documentMgmt.newShare') },
                { key: 'existing' as const, label: `${t('documentMgmt.shareStatus')} (${existingShares.length})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  className={`py-2.5 px-3.5 text-[13px] font-medium bg-transparent border-none cursor-pointer ${
                    activeShareTab === tab.key
                      ? 'text-slate-900 font-semibold border-b-2 border-[#2563eb] -mb-px'
                      : 'text-slate-500 border-b-2 border-transparent -mb-px'
                  }`}
                  onClick={() => setActiveShareTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3.5">
              {activeShareTab === 'new' ? (
                <>
                  <div className="flex justify-between items-center text-[12px] text-slate-500">
                    <span>{companyUsers.length}{t('documentMgmt.people', { defaultValue: '명' })} — <strong className="text-slate-900">{selectedUserIds.length}</strong> {t('documentMgmt.selected', { defaultValue: '선택됨' })}</span>
                    {companyUsers.length > 0 && (
                      <button onClick={handleSelectAllUsers} className="bg-transparent border-none text-[#2563eb] text-[12px] font-medium cursor-pointer p-0">
                        {selectedUserIds.length === companyUsers.length ? t('documentMgmt.deselectAll') : t('documentMgmt.selectAll')}
                      </button>
                    )}
                  </div>

                  {isLoadingUsers ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                      <span className="ml-2 text-slate-500">{t('documentMgmt.loadingUsers')}</span>
                    </div>
                  ) : companyUsers.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-[13px]">{t('documentMgmt.noUsersToShare')}</div>
                  ) : (
                    <div className="flex flex-col gap-1 border border-slate-100 rounded-[10px] p-1 max-h-[240px] overflow-auto">
                      {companyUsers.map((companyUser) => (
                        <label
                          key={companyUser.id}
                          className={`flex items-center gap-2.5 py-2 px-2.5 rounded-lg cursor-pointer ${
                            selectedUserIds.includes(companyUser.id) ? 'bg-[#eff6ff]' : 'hover:bg-slate-50'
                          }`}
                          onClick={() => handleToggleUser(companyUser.id)}
                        >
                          <input type="checkbox" checked={selectedUserIds.includes(companyUser.id)} readOnly className="w-[15px] h-[15px] accent-[#2563eb] m-0" />
                          <div className="w-[30px] h-[30px] rounded-full bg-[#2563eb] text-white flex items-center justify-center font-bold text-[12px] shrink-0">
                            {companyUser.name?.[0] || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium text-slate-900 truncate">{companyUser.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono truncate">{companyUser.email}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  <label className="flex items-center gap-2 py-1">
                    <input type="checkbox" checked={sendEmailNotification} onChange={(e) => setSendEmailNotification(e.target.checked)} className="w-[15px] h-[15px] accent-[#2563eb] m-0" />
                    <span className="text-[13px] text-slate-900">{t('documentMgmt.emailNotification')}</span>
                  </label>
                </>
              ) : (
                <>
                  {isLoadingShares ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                      <span className="ml-2 text-slate-500">{t('documentMgmt.loadingShares')}</span>
                    </div>
                  ) : existingShares.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-[13px]">{t('documentMgmt.noSharedUsers')}</div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {existingShares.map((share: any) => (
                        <div key={share.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium truncate">{share.users?.name || t('common.unknown')}</p>
                            <p className="text-[11px] text-slate-500 font-mono truncate">{share.users?.email || ''}</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleUnshare(share.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 text-[12px]">
                            {t('common.cancel')}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <V1ModalFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShareDialogOpen(false);
                  setSharingDocumentId(null);
                  setSelectedUserIds([]);
                  setSendEmailNotification(false);
                  setActiveShareTab('new');
                }}
                disabled={isSendingShare}
                className="h-9 rounded-[10px] text-[13px] font-semibold border-[#e5e7eb]"
              >
                {t('common.close')}
              </Button>
              {activeShareTab === 'new' && (
                <Button
                  onClick={handleSendShare}
                  disabled={isSendingShare || selectedUserIds.length === 0}
                  className="h-9 rounded-[10px] text-[13px] font-semibold "
                >
                  {isSendingShare ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      {t('documentMgmt.sharing')}
                    </>
                  ) : (
                    <><Share2 className="h-3.5 w-3.5 mr-1.5" />{t('documentMgmt.shareToCount', { count: selectedUserIds.length })}</>
                  )}
                </Button>
              )}
            </V1ModalFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
