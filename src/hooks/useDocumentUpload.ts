import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { Capacitor } from '@capacitor/core';
import { useDocumentStore } from '@/store/documentStore';
import { useAuthStore } from '@/store/authStore';
import { extractText } from '@/lib/ocr';
import { splitFilesByType, getBaseNameWithoutExt, readFileAsDataURL } from '@/lib/uploadFiles';

/**
 * 문서 업로드 · OCR 흐름 (DocumentManagement 전용).
 *
 * 3700줄짜리 페이지에서 업로드 상태 18개와 파일 드롭·업로드·OCR 편집 로직을 분리했다.
 * 페이지는 화면 구성과 배선만 담당하고, 여기서 파일 처리·OCR·업로드를 담당한다.
 *
 * 호출부 JSX 를 그대로 두기 위해 상태와 핸들러를 기존 이름으로 반환한다.
 */
export function useDocumentUpload() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const { uploadDocument, fetchDocuments, updateDocumentOcrText } = useDocumentStore();
  const subcategories = useDocumentStore((state) => state.subcategories);
  const storageStatus = useDocumentStore((state) => state.storageStatus);
  const isStorageFull = storageStatus !== null && !storageStatus.allowed;

  const [uploadSuccessDialogOpen, setUploadSuccessDialogOpen] = useState(false);
  const [uploadSuccessCount, setUploadSuccessCount] = useState(0);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  // PII 마스킹된 파일 맵 (원본 파일 인덱스 → 마스킹된 파일)
  const [maskedFiles, setMaskedFiles] = useState<Map<number, File>>(new Map());
  // PII 가 감지됐는데 마스킹에 실패한 파일 인덱스 — 원본을 올리면 개인정보가 그대로 노출되므로 업로드를 막는다
  const [maskFailedIndexes, setMaskFailedIndexes] = useState<Set<number>>(new Set());
  const [uploadSelection, setUploadSelection] = useState({
    departmentId: '',
    parentCategoryId: '',
    subcategoryId: '',
  });
  const [documentTitle, setDocumentTitle] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [ocrTextPreview, setOcrTextPreview] = useState('');
  const [isEditingOcr, setIsEditingOcr] = useState(false);
  const [editedOcrText, setEditedOcrText] = useState('');
  const [isSavingOcr, setIsSavingOcr] = useState(false);
  const [lastUploadedDocId, setLastUploadedDocId] = useState<string | null>(null);
  const [isExtractingOcr, setIsExtractingOcr] = useState(false);
  const [extractedOcrText, setExtractedOcrText] = useState('');
  const [ocrPageProgress, setOcrPageProgress] = useState<{ page: number; totalPages: number; percent: number } | null>(null);
  const [fileStatuses, setFileStatuses] = useState<
    { name: string; status: string; error?: string | null }[]
  >([]);

  const handleFileDrop = useCallback(async (acceptedFiles: File[]) => {
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
    setOcrTextPreview('');
    setExtractedOcrText('');
    setIsEditingOcr(false);
    setEditedOcrText('');

    const { pdfFiles, imageFiles } = splitFilesByType(validFiles);

    // 문서 제목 기본값 설정 (단일 문서인 경우에만 사용)
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
        status: 'OCR 대기 중',
        error: null,
      })),
    );

    // OCR 추출 시작
    setIsExtractingOcr(true);
    setOcrPageProgress(null);
    setUploadStatus('OCR 텍스트 추출 중...');

    try {
      let allOcrText = '';
      const newMaskedFiles = new Map<number, File>();
      const newMaskFailedIndexes = new Set<number>();

      // PDF 파일 OCR 추출
      for (let i = 0; i < pdfFiles.length; i++) {
        const file = pdfFiles[i];
        const index = validFiles.indexOf(file);

        setFileStatuses((prev) => {
          const next = [...prev];
          if (next[index]) {
            next[index] = { ...next[index], status: 'OCR 추출 중...' };
          }
          return next;
        });

        try {
          const { text: ocrText, maskedFile, maskFailed } = await extractText(file, (progress) => {
            setOcrPageProgress({
              page: progress.page ?? 0,
              totalPages: progress.totalPages ?? 0,
              percent: progress.percent,
            });
          });
          if (maskedFile) {
            newMaskedFiles.set(index, maskedFile);
          }
          if (maskFailed) {
            newMaskFailedIndexes.add(index);
          }
          if (pdfFiles.length === 1 && imageFiles.length === 0) {
            allOcrText = ocrText;
          } else if (ocrText && ocrText.trim()) {
            allOcrText += `--- ${file.name} ---\n${ocrText.trim()}\n\n`;
          }

          setFileStatuses((prev) => {
            const next = [...prev];
            if (next[index]) {
              next[index] = { ...next[index], status: 'OCR 완료' };
            }
            return next;
          });
        } catch (ocrError) {
          console.error('OCR 처리 오류:', file.name, ocrError);
          setFileStatuses((prev) => {
            const next = [...prev];
            if (next[index]) {
              next[index] = { ...next[index], status: 'OCR 실패', error: 'OCR 추출 실패' };
            }
            return next;
          });
        }
      }

      // 이미지 파일 OCR 추출
      if (imageFiles.length > 0) {
        const ocrParts: { index: number; text: string }[] = [];

        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          const index = validFiles.indexOf(file);

          setFileStatuses((prev) => {
            const next = [...prev];
            if (next[index]) {
              next[index] = { ...next[index], status: 'OCR 추출 중...' };
            }
            return next;
          });

          try {
            const { text: ocrText, maskedFile, maskFailed } = await extractText(file, (progress) => {
              setOcrPageProgress({
                page: i + 1,
                totalPages: imageFiles.length,
                percent: Math.round(((i + progress.percent / 100) / imageFiles.length) * 100),
              });
            });
            if (maskedFile) {
              newMaskedFiles.set(index, maskedFile);
            }
            if (maskFailed) {
              newMaskFailedIndexes.add(index);
            }
            if (ocrText && ocrText.trim()) {
              ocrParts.push({
                index: i,
                text: imageFiles.length > 1
                  ? `--- 페이지 ${i + 1} ---\n${ocrText.trim()}\n`
                  : ocrText.trim(),
              });
            }

            setFileStatuses((prev) => {
              const next = [...prev];
              if (next[index]) {
                next[index] = { ...next[index], status: 'OCR 완료' };
              }
              return next;
            });
          } catch (ocrError) {
            console.error('OCR 처리 오류:', file.name, ocrError);
            setFileStatuses((prev) => {
              const next = [...prev];
              if (next[index]) {
                next[index] = { ...next[index], status: 'OCR 실패', error: 'OCR 추출 실패' };
              }
              return next;
            });
          }
        }

        // 이미지 OCR 결과 결합
        const imageOcrText = ocrParts
          .sort((a, b) => a.index - b.index)
          .map((result) => result.text)
          .join('\n');

        if (pdfFiles.length === 0) {
          allOcrText = imageOcrText;
        } else if (imageOcrText) {
          allOcrText += `\n--- 이미지 문서 ---\n${imageOcrText}`;
        }
      }

      // 마스킹된 파일 맵 저장
      setMaskedFiles(newMaskedFiles);
      setMaskFailedIndexes(newMaskFailedIndexes);
      setExtractedOcrText(allOcrText);
      setOcrTextPreview(allOcrText);
      setUploadStatus('OCR 추출 완료. 업로드 버튼을 눌러 업로드하세요.');
    } catch (error) {
      console.error('OCR 추출 오류:', error);
      setUploadError('OCR 추출 중 오류가 발생했습니다.');
      setUploadStatus('');
    } finally {
      setIsExtractingOcr(false);
      setOcrPageProgress(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileDrop,
    disabled: isStorageFull,
    ...(Capacitor.isNativePlatform() ? {} : {
      accept: {
        'image/*': ['.jpg', '.jpeg', '.png'],
        'application/pdf': ['.pdf'],
      },
    }),
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

  /**
   * 업로드할 실제 파일을 고른다.
   * PII 가 감지됐는데 마스킹에 실패한 파일은 원본에 개인정보가 그대로 남아 있으므로
   * 폴백하지 않고 throw 한다 — 호출부의 try/catch 가 해당 파일을 실패 처리한다.
   */
  const resolveFileToUpload = (index: number, file: File): File => {
    if (maskFailedIndexes.has(index)) {
      throw new Error(t('documentMgmt.maskFailedBlocked'));
    }
    return maskedFiles.get(index) || file;
  };

  const handleUpload = async () => {
    if (!uploadFiles.length || !uploadSelection.subcategoryId || !user) {
      return;
    }

    if (isExtractingOcr) {
      setUploadError(t('documentMgmt.waitForOcr'));
      return;
    }

    const subcategory = subcategories.find(
      (s) => s.id === uploadSelection.subcategoryId,
    );
    if (!subcategory) {
      setUploadError(t('documentMgmt.subcategoryNotFound'));
      return;
    }

    const parentCategoryId = subcategory.parentCategoryId;
    const departmentId = subcategory.departmentId;

    // 편집된 OCR 텍스트가 있으면 그것을 사용, 아니면 추출된 텍스트 사용
    const finalOcrText = isEditingOcr ? editedOcrText : extractedOcrText;

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
        })),
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

      // PDF 파일 병렬 업로드
      const pdfUploadPromises = pdfFiles.map(async (file) => {
        const index = uploadFiles.indexOf(file);

        try {
          setFileStatuses((prev) => {
            const next = [...prev];
            if (next[index]) {
              next[index] = { ...next[index], status: t('documentMgmt.uploading') };
            }
            return next;
          });

          const baseName = getBaseNameWithoutExt(file.name);
          const title =
            pdfFiles.length === 1 && imageFiles.length === 0
              ? getSingleDocTitle()
              : baseName;

          // 단일 PDF인 경우 전체 OCR 텍스트 사용
          const ocrTextForFile = (pdfFiles.length === 1 && imageFiles.length === 0) 
            ? finalOcrText 
            : '';

          // 마스킹된 파일이 있으면 그것을 업로드
          const fileToUpload = resolveFileToUpload(index, file);

          await uploadDocument({
            name: title,
            originalFileName: file.name,
            categoryId: parentCategoryId,
            parentCategoryId,
            subcategoryId: subcategory.id,
            departmentId,
            uploader: user.name || user.email || 'Unknown',
            classified: false,
            file: fileToUpload,
            ocrText: ocrTextForFile,
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

      if (pdfFiles.length > 0) {
        setUploadStatus(t('documentMgmt.pdfUploadComplete', { count: pdfFiles.length }));
      }

      // 이미지 파일들을 하나의 문서로 묶어서 업로드
      if (imageFiles.length > 1) {
        setUploadStatus(t('documentMgmt.convertingToPdf', { count: imageFiles.length }));

        try {
          const { jsPDF } = await import('jspdf');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();

          for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            const index = uploadFiles.indexOf(file);
            // 마스킹된 파일이 있으면 그것을 사용 (마스킹 실패 시 throw → 묶음 전체 실패)
            const fileForPdf = resolveFileToUpload(index, file);
            const imgData = await readFileAsDataURL(fileForPdf);

            if (i > 0) {
              pdf.addPage();
            }

            const lowerName = fileForPdf.name.toLowerCase();
            const isPng =
              fileForPdf.type === 'image/png' ||
              lowerName.endsWith('.png');

            pdf.addImage(
              imgData,
              isPng ? 'PNG' : 'JPEG',
              0,
              0,
              pageWidth,
              pageHeight,
            );

            // 파일 상태 업데이트
            setFileStatuses((prev) => {
              const next = [...prev];
              if (next[index]) {
                next[index] = { ...next[index], status: t('documentMgmt.pdfConvertDone') };
              }
              return next;
            });
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
            categoryId: parentCategoryId,
            parentCategoryId,
            subcategoryId: subcategory.id,
            departmentId,
            uploader: user.name || user.email || 'Unknown',
            classified: false,
            file: pdfFile,
            ocrText: finalOcrText,
          });

          successCount += 1;
          setUploadStatus(t('documentMgmt.imageBundleComplete', { count: imageFiles.length }));
        } catch (groupError) {
          console.error('Image bundle upload error:', groupError);
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
              next[index] = { ...next[index], status: t('documentMgmt.uploading') };
            }
            return next;
          });

          const imageTitle =
            pdfFiles.length === 0
              ? getSingleDocTitle()
              : getBaseNameWithoutExt(file.name);

          // 마스킹된 파일이 있으면 그것을 업로드
          const fileToUpload = resolveFileToUpload(index, file);

          await uploadDocument({
            name: imageTitle,
            originalFileName: file.name,
            categoryId: parentCategoryId,
            parentCategoryId,
            subcategoryId: subcategory.id,
            departmentId,
            uploader: user.name || user.email || 'Unknown',
            classified: false,
            file: fileToUpload,
            ocrText: finalOcrText,
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
        }
      }

      if (failureCount > 0) {
        setUploadError(
          failureCount === totalFiles
            ? t('documentMgmt.allUploadsFailed')
            : t('documentMgmt.someUploadsFailed', { count: failureCount }),
        );
      }

      setUploadStatus(t('documentMgmt.uploadComplete'));

      await fetchDocuments();
      
      // 업로드 성공 시 최신 문서 ID 저장 (OCR 편집용)
      if (successCount > 0) {
        const latestDocs = useDocumentStore.getState().documents;
        if (latestDocs.length > 0) {
          setLastUploadedDocId(latestDocs[0].id);
        }
        // 업로드 성공 팝업 표시
        setUploadSuccessCount(successCount);
        setUploadSuccessDialogOpen(true);
      }

      // 즉시 폼 초기화
      setUploadFiles([]);
      setMaskedFiles(new Map());
      setDocumentTitle('');
      setUploadProgress(0);
      setUploadStatus('');
      setUploadSuccess(false);
      setFileStatuses([]);
      const fileInput = document.getElementById('file-upload') as HTMLInputElement | null;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(
        error instanceof Error
          ? error.message
          : t('documentMgmt.uploadErrorGeneric'),
      );
      setUploadStatus('');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyOcrText = async () => {
    if (!ocrTextPreview) return;
    try {
      await navigator.clipboard.writeText(isEditingOcr ? editedOcrText : ocrTextPreview);
      setUploadStatus(t('documentMgmt.ocrCopied'));
    } catch (error) {
      console.error('Copy error:', error);
      setUploadError(t('documentMgmt.copyError'));
    }
  };

  const handleEditOcrText = () => {
    setEditedOcrText(ocrTextPreview);
    setIsEditingOcr(true);
  };

  const handleCancelEditOcr = () => {
    setIsEditingOcr(false);
    setEditedOcrText('');
  };

  const handleApplyOcrEdit = () => {
    // 업로드 전 편집 적용 - extractedOcrText와 ocrTextPreview 업데이트
    setExtractedOcrText(editedOcrText);
    setOcrTextPreview(editedOcrText);
    setIsEditingOcr(false);
    setEditedOcrText('');
  };

  const handleSaveOcrText = async () => {
    if (!lastUploadedDocId) {
      setUploadError(t('documentMgmt.docNotFound'));
      return;
    }
    
    setIsSavingOcr(true);
    try {
      await updateDocumentOcrText(lastUploadedDocId, editedOcrText);
      setExtractedOcrText(editedOcrText);
      setOcrTextPreview(editedOcrText);
      setIsEditingOcr(false);
      setEditedOcrText('');
    } catch (error) {
      console.error('OCR 텍스트 저장 오류:', error);
    } finally {
      setIsSavingOcr(false);
    }
  };

  return {
    uploadSuccessDialogOpen,
    setUploadSuccessDialogOpen,
    uploadSuccessCount,
    uploadFiles,
    setUploadFiles,
    maskedFiles,
    setMaskedFiles,
    uploadSelection,
    setUploadSelection,
    documentTitle,
    setDocumentTitle,
    uploadProgress,
    uploadStatus,
    isUploading,
    uploadError,
    setUploadError,
    uploadSuccess,
    setUploadSuccess,
    ocrTextPreview,
    setOcrTextPreview,
    isEditingOcr,
    editedOcrText,
    setEditedOcrText,
    isSavingOcr,
    lastUploadedDocId,
    setLastUploadedDocId,
    isExtractingOcr,
    extractedOcrText,
    setExtractedOcrText,
    ocrPageProgress,
    fileStatuses,
    setFileStatuses,
    isStorageFull,
    getRootProps,
    getInputProps,
    isDragActive,
    handleFileDrop,
    handleUpload,
    handleCopyOcrText,
    handleEditOcrText,
    handleCancelEditOcr,
    handleApplyOcrEdit,
    handleSaveOcrText,
  };
}
