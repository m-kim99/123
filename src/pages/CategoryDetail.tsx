import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, MapPin, Upload } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
import { useAuthStore } from '@/store/authStore';
import { createDocumentNotification } from '@/lib/notifications';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { supabase } from '@/lib/supabase';
import { extractText } from '@/lib/ocr';
import { toast } from '@/hooks/use-toast';
import { formatDateTimeSimple } from '@/lib/utils';
import { PdfViewer } from '@/components/PdfViewer';

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
        reject(new Error('이미지 데이터를 읽을 수 없습니다.'));
      }
    };
    reader.onerror = () => {
      reject(reader.error || new Error('이미지 파일을 읽는 중 오류가 발생했습니다.'));
    };
    reader.readAsDataURL(file);
  });
}

export function CategoryDetail() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  
  // Selector 최적화: 상태값은 개별 selector로
  const categories = useDocumentStore((state) => state.categories);
  const documents = useDocumentStore((state) => state.documents);
  const departments = useDocumentStore((state) => state.departments);
  const subcategories = useDocumentStore((state) => state.subcategories);
  // 함수는 한 번에 가져오기 (참조 안정적)
  const { fetchDocuments, uploadDocument } = useDocumentStore();
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
      }
    | null
  >(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [imageZoom, setImageZoom] = useState(100); // 확대/축소 %
  const [imageRotation, setImageRotation] = useState(0); // 회전 각도

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
          <p className="text-slate-500">카테고리를 찾을 수 없습니다</p>
          <Button
            className="mt-4"
            onClick={() => navigate(-1)}
            style={{ backgroundColor: primaryColor }}
          >
            돌아가기
          </Button>
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
        title: '문서를 불러오지 못했습니다.',
        description: '문서 미리보기를 여는 중 오류가 발생했습니다.',
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
      setUploadError('PDF, JPG, PNG 파일만 업로드 가능합니다.');
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
        status: '대기 중',
        error: null,
      }))
    );

    if (imageFiles.length > 0 && pdfFiles.length === 0 && imageFiles.length > 1) {
      setUploadStatus(`${imageFiles.length}개 이미지를 하나의 문서로 업로드합니다.`);
    } else if (imageFiles.length > 0 && pdfFiles.length > 0) {
      setUploadStatus(`PDF ${pdfFiles.length}개와 이미지 묶음 1개가 업로드됩니다.`);
    } else {
      setUploadStatus(`${validFiles.length}개 파일 선택됨`);
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
        setUploadError('PDF, JPG, PNG 파일만 업로드 가능합니다.');
      } else {
        setUploadError('파일 업로드에 실패했습니다.');
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
        '이 카테고리에 연결된 세부 카테고리가 없어 업로드할 수 없습니다.',
      );
      return;
    }

    const parentCategoryId = targetSubcategory.parentCategoryId;
    const departmentId = targetSubcategory.departmentId;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('파일 처리 준비 중...');
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
          status: '대기 중',
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
        return '문서';
      };

      // PDF 파일 병렬 처리 (Promise.allSettled 사용)
      const pdfUploadPromises = pdfFiles.map(async (file) => {
        const index = uploadFiles.indexOf(file);

        try {
          setFileStatuses((prev) => {
            const next = [...prev];
            if (next[index]) {
              next[index] = { ...next[index], status: '처리 중...' };
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
              next[index] = { ...next[index], status: '완료', error: null };
            }
            return next;
          });

          return { success: true, fileName: file.name };
        } catch (fileError) {
          console.error('업로드 오류:', file.name, fileError);

          setFileStatuses((prev) => {
            const next = [...prev];
            if (next[index]) {
              next[index] = {
                ...next[index],
                status: '실패',
                error:
                  fileError instanceof Error
                    ? fileError.message
                    : '문서 업로드 중 오류가 발생했습니다.',
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

      setUploadStatus(`PDF 파일 ${pdfFiles.length}개 업로드 완료`);

      // 이미지 파일들을 하나의 문서로 묶어서 처리 (OCR 병렬 처리)
      if (imageFiles.length > 1) {
        setUploadStatus(`${imageFiles.length}개 이미지 OCR 병렬 처리 중...`);

        // 병렬 OCR 처리 (Promise.all 사용)
        const ocrPromises = imageFiles.map(async (file, i) => {
          const index = uploadFiles.indexOf(file);

          try {
            setFileStatuses((prev) => {
              const next = [...prev];
              if (next[index]) {
                next[index] = { ...next[index], status: 'OCR 처리 중...' };
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
                next[index] = { ...next[index], status: 'OCR 완료' };
              }
              return next;
            });

            // 인덱스와 함께 반환하여 순서 보장
            return {
              index: i,
              text: ocrText && ocrText.trim()
                ? `--- 페이지 ${i + 1} ---\n${ocrText.trim()}\n`
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
                  status: '실패',
                  error: fileError instanceof Error
                    ? fileError.message
                    : 'OCR 처리 실패',
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
          setUploadStatus('PDF 생성 중...');

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

          setUploadStatus('업로드 중...');

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
          setUploadStatus(`완료: ${imageFiles.length}장을 하나의 문서로 업로드했습니다!`);
        } catch (groupError) {
          console.error('이미지 묶음 업로드 오류:', groupError);
          failureCount += 1;
          setUploadError(
            groupError instanceof Error
              ? groupError.message
              : '이미지 문서 업로드 중 오류가 발생했습니다.',
          );
        }
      } else if (imageFiles.length === 1) {
        const file = imageFiles[0];
        const index = uploadFiles.indexOf(file);
        try {
          setFileStatuses((prev) => {
            const next = [...prev];
            if (next[index]) {
              next[index] = { ...next[index], status: '처리 중...' };
            }
            return next;
          });

          setUploadStatus('이미지 1/1 OCR 처리 중...');

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
              next[index] = { ...next[index], status: '완료', error: null };
            }
            return next;
          });
        } catch (fileError) {
          console.error('업로드 오류:', file.name, fileError);
          failureCount += 1;

          setFileStatuses((prev) => {
            const next = [...prev];
            if (next[index]) {
              next[index] = {
                ...next[index],
                status: '실패',
                error:
                  fileError instanceof Error
                    ? fileError.message
                    : '문서 업로드 중 오류가 발생했습니다.',
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
          title: '업로드 완료',
          description: `${successCount}개 문서가 업로드되었습니다.`,
        });
      }

      if (failureCount > 0) {
        setUploadError(
          failureCount === totalFiles
            ? '모든 파일 업로드에 실패했습니다.'
            : `${failureCount}개 파일 업로드에 실패했습니다.`,
        );
      }

      setUploadStatus('업로드 완료');

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
        error instanceof Error ? error.message : '문서 업로드 중 오류가 발생했습니다.'
      );
      setUploadStatus('');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadDocument = async (documentId: string) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('file_path, title')
        .eq('id', documentId)
        .single();

      if (error || !data) {
        throw error || new Error('문서를 찾을 수 없습니다.');
      }

      const { data: fileData, error: downloadError } = await supabase.storage
        .from('123')
        .download(data.file_path);

      if (downloadError || !fileData) {
        throw downloadError || new Error('파일을 다운로드할 수 없습니다.');
      }

      const blob = fileData as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.title || 'document';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('문서 다운로드 실패:', error);
      toast({
        title: '다운로드 실패',
        description: '문서를 다운로드하는 중 오류가 발생했습니다.',
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
        title: '삭제 완료',
        description: '문서가 삭제되었습니다.',
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
          parentCategoryName: category.name,
          subcategoryId: targetDoc.subcategoryId,
          subcategoryName: subcategoryForDoc?.name ?? null,
        });
      }

      handleCloseDeleteDialog();
    } catch (error) {
      console.error('문서 삭제 실패:', error);
      toast({
        title: '삭제 실패',
        description: '문서를 삭제하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsDeletingDocument(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <Button
            variant="ghost"
            className="mb-4 text-white"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {category.name}
              </h1>
              <p className="text-slate-500 mt-1">{category.description}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">부서 코드</p>
              <p className="text-2xl font-bold mt-2">{department?.code}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">문서 수</p>
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
                  <p className="text-sm font-medium text-slate-500">보관 위치</p>
                  <p className="text-sm font-bold mt-1">
                    {category.storageLocation || '미지정'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>문서 목록</CardTitle>
            <Button onClick={handleUploadClick} disabled={isUploading}>
              <Upload className="h-4 w-4 mr-2" />
              문서 업로드
            </Button>
          </CardHeader>
          <CardContent>
            {categoryDocuments.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                이 카테고리에 문서가 없습니다
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
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{doc.name}</p>
                          {doc.classified && (
                            <Badge variant="destructive" className="text-xs">
                              기밀
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">
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
                        size="sm"
                        onClick={() => handleOpenPreviewDocument(doc.id)}
                      >
                        미리 보기
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDownloadDocument(doc.id)}
                      >
                        ⬇️
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleOpenDeleteDialog(doc.id)}
                      >
                        🗑️
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
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>문서 삭제</AlertDialogTitle>
                  <AlertDialogDescription>
                    정말 삭제하시겠습니까?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeletingDocument}>
                    취소
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleConfirmDeleteDocument}
                    className="bg-red-600 hover:bg-red-700 text-white"
                    disabled={isDeletingDocument}
                  >
                    {isDeletingDocument ? '삭제 중...' : '삭제'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>문서 업로드</DialogTitle>
              <DialogDescription>
                이 카테고리에 새 문서를 업로드합니다. PDF, JPG, PNG 형식을 지원합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div
                {...getRootProps({
                  className:
                    'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-slate-50 transition-colors',
                })}
              >
                <input {...getInputProps()} />
                <Upload className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                {isDragActive ? (
                  <p className="text-sm text-slate-600">여기로 파일을 드롭하세요...</p>
                ) : (
                  <p className="text-sm text-slate-600">
                    클릭하거나 파일을 드래그해서 업로드할 문서를 선택하세요 (여러 파일 선택 가능)
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-400">PDF, JPG, PNG · 여러 파일 선택 가능</p>
                {uploadFiles.length > 0 && (
                  <p className="mt-2 text-xs text-slate-600">
                    선택된 파일: {uploadFiles.length === 1 ? uploadFiles[0].name : `${uploadFiles.length}개 파일`}
                  </p>
                )}
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-slate-600">카테고리: {category.name}</p>
                {uploadStatus && (
                  <p className="text-slate-500">상태: {uploadStatus}</p>
                )}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <p className="text-slate-500">진행률: {uploadProgress}%</p>
                )}
                {uploadError && (
                  <p className="text-red-500 text-xs mt-1">{uploadError}</p>
                )}
                {uploadSuccess && (
                  <p className="text-emerald-600 text-xs mt-1">업로드가 완료되었습니다.</p>
                )}
                {fileStatuses.length > 0 && (
                  <div className="mt-1 space-y-0.5 text-xs text-left">
                    {fileStatuses.map(
                      (
                        file: { name: string; status: string; error?: string | null }
                      ) => (
                        <div
                          key={file.name}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="truncate max-w-[60%]">{file.name}</span>
                          <span
                            className={
                              file.error
                                ? 'text-red-500'
                                : file.status === '완료'
                                ? 'text-emerald-600'
                                : 'text-slate-600'
                            }
                          >
                            {file.error ? '실패' : file.status}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                )}
                {canEditTitle && uploadFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <Label>문서 제목</Label>
                    <Input
                      value={documentTitle}
                      onChange={(e) => setDocumentTitle(e.target.value)}
                      placeholder="문서 제목을 입력하세요"
                    />
                    <p className="text-xs text-slate-500">
                      {selectedImageFiles.length > 1
                        ? `${selectedImageFiles.length}개 이미지를 하나의 문서로 묶어 업로드합니다.`
                        : '원본 파일명을 기본 제목으로 사용합니다. 필요하면 수정하세요.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setUploadDialogOpen(false)}
                disabled={isUploading}
              >
                취소
              </Button>
              <Button
                type="button"
                onClick={handleUpload}
                style={{ backgroundColor: primaryColor }}
                disabled={uploadFiles.length === 0 || isUploading}
              >
                {isUploading ? '업로드 중...' : '업로드'}
              </Button>
            </DialogFooter>
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
          {/* PDF 미리보기: 기존 브라우저 뷰어 유지 */}
          {previewDoc?.type === 'pdf' && (
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col overflow-hidden">
              <DialogHeader>
                <DialogTitle>{previewDoc?.title || '문서 미리보기'}</DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-auto min-h-0">
                {previewLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-slate-500">문서를 불러오는 중입니다...</p>
                  </div>
                ) : (
                  previewDoc && <PdfViewer url={previewDoc.url} />
                )}
              </div>

              <DialogFooter className="border-t pt-3">
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm text-slate-500">PDF 문서</span>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPreviewOpen(false);
                      setImageZoom(100);
                      setImageRotation(0);
                    }}
                  >
                    닫기
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          )}

          {/* 이미지 미리보기: 전문 뷰어 레이아웃 */}
          {previewDoc?.type === 'image' && (
            <DialogContent className="max-w-6xl h-[90vh] flex flex-col overflow-hidden">
              <DialogHeader>
                <DialogTitle>{previewDoc?.title || '이미지 미리보기'}</DialogTitle>
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
                  title="90도 회전"
                >
                  🔄
                </Button>

                {previewDoc && (
                  <>
                    <div className="w-px h-6 bg-slate-300 mx-2" />

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadDocument(previewDoc.id)}
                      title="다운로드"
                    >
                      ⬇️
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
                      title="인쇄"
                    >
                      🖨️
                    </Button>
                  </>
                )}
              </div>

              {/* 메인 이미지 영역 (스크롤 가능) */}
              <div
                className="image-viewer flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-8"
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
                  <p className="text-slate-500">이미지를 불러오는 중입니다...</p>
                ) : (
                  previewDoc && (
                    <img
                      src={previewDoc.url}
                      alt={previewDoc.title}
                      style={{
                        transform: `scale(${imageZoom / 100}) rotate(${imageRotation}deg)` ,
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
                  <span className="text-sm text-slate-500">이미지 문서</span>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPreviewOpen(false);
                      setImageZoom(100);
                      setImageRotation(0);
                    }}
                  >
                    닫기
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
