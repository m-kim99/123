import { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { FileText, Smartphone, Upload, Star, Loader2, CheckCircle2, Edit, QrCode, MapPin, Hash, Clock, Activity, Share2, Download, X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { extractText } from '@/lib/ocr';
import binIcon from '@/assets/icons/bin.svg';
import downloadIcon from '@/assets/icons/download.svg';
import shareIcon from '@/assets/icons/share.svg';
import previewIcon from '@/assets/icons/preview.svg';
import changeIcon from '@/assets/icons/change.svg';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { v1Card, V1CardHeader, V1PageHeader, V1Chip, V1ModalHeader, V1ModalFooter, V1ModalBody, V1 } from '@/components/ui/v1-components';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { NFCRegistrationDialog } from '@/components/NFCRegistrationDialog';
import { formatDateTimeSimple } from '@/lib/utils';

import { useFavoriteStore } from '@/store/favoriteStore';
import { supabase } from '@/lib/supabase';
import { r2Storage } from '@/lib/r2';
import { downloadFile } from '@/lib/appBridge';
import { createDocumentNotification } from '@/lib/notifications';
import { PdfViewer } from '@/components/PdfViewer';
import { trackEvent } from '@/lib/analytics';
import { BackButton } from '@/components/BackButton';
import { checkUserAccess, hasPermission, type Role, type Action } from '@/lib/permissions';

export function SubcategoryDetail() {
  const { t } = useTranslation();
  const { parentCategoryId, subcategoryId } = useParams<{
    parentCategoryId: string;
    subcategoryId: string;
  }>();
  const user = useAuthStore((state) => state.user);
  
  // Selector 최적화: 상태값은 개별 selector로
  const departments = useDocumentStore((state) => state.departments);
  const parentCategories = useDocumentStore((state) => state.parentCategories);
  const subcategories = useDocumentStore((state) => state.subcategories);
  const documents = useDocumentStore((state) => state.documents);
  // 함수는 한 번에 가져오기 (참조 안정적)
  const {
    fetchSubcategories,
    fetchDocuments,
    uploadDocument,
    updateSubcategory,
    shareDocument,
    unshareDocument,
    updateDocumentFile,
    updateDocumentOcrText,
  } = useDocumentStore();

  const { addFavorite, removeFavorite, isFavorite, recordVisit } = useFavoriteStore();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isExtractingUploadOcr, setIsExtractingUploadOcr] = useState(false);
  const [uploadOcrText, setUploadOcrText] = useState('');
  const [uploadOcrPreview, setUploadOcrPreview] = useState('');
  const [isEditingUploadOcr, setIsEditingUploadOcr] = useState(false);
  const [editedUploadOcrText, setEditedUploadOcrText] = useState('');
  const [uploadOcrStatus, setUploadOcrStatus] = useState('');
  const [ocrPageProgress, setOcrPageProgress] = useState<{ page: number; totalPages: number; percent: number } | null>(null);
  const [lastUploadedDocId, setLastUploadedDocId] = useState<string | null>(null);
  const [isSavingUploadOcr, setIsSavingUploadOcr] = useState(false);
  const [isRegisteringNfc] = useState(false);
  const [nfcDialogOpen, setNfcDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrGenerated, setQrGenerated] = useState(false);

  const [deleteDocDialogOpen, setDeleteDocDialogOpen] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [isDeletingDocument, setIsDeletingDocument] = useState(false);

  const [unshareDialogOpen, setUnshareDialogOpen] = useState(false);
  const [unshareId, setUnshareId] = useState<string | null>(null);
  const [isUnsharing, setIsUnsharing] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    storageLocation: '',
    managementNumber: '',
  });
  const [editNameError, setEditNameError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
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
  const [imageZoom, setImageZoom] = useState(100);
  const [imageRotation, setImageRotation] = useState(0);

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

  // 파일 교체 다이얼로그 상태
  const [fileReplaceDialogOpen, setFileReplaceDialogOpen] = useState(false);
  const [replacingDocumentId, setReplacingDocumentId] = useState<string | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [isReplacingFile, setIsReplacingFile] = useState(false);
  const [replaceOcrText, setReplaceOcrText] = useState('');
  const [isExtractingOcr, setIsExtractingOcr] = useState(false);
  const [isEditingReplaceOcr, setIsEditingReplaceOcr] = useState(false);

  // 권한 상태
  const [departmentRole, setDepartmentRole] = useState<Role>('none');
  const isAdmin = user?.role === 'admin';

  // 권한 조회
  useEffect(() => {
    const fetchRole = async () => {
      if (!user?.id || !subcategoryId) return;
      if (isAdmin) {
        setDepartmentRole('manager');
        return;
      }
      const sub = subcategories.find((s) => s.id === subcategoryId);
      if (!sub?.departmentId) return;
      const { role } = await checkUserAccess(user.id, sub.departmentId, user.departmentId);
      setDepartmentRole(role);
    };
    fetchRole();
  }, [user?.id, user?.departmentId, subcategoryId, subcategories, isAdmin]);

  // 권한 체크 헬퍼
  const canDo = (action: Action): boolean => {
    if (isAdmin) return true;
    return hasPermission(departmentRole, action);
  };

  useEffect(() => {
    if (subcategoryId) {
      const saved = localStorage.getItem(`qr_generated_${subcategoryId}`);
      setQrGenerated(!!saved);
    }
  }, [subcategoryId]);

  useEffect(() => {
    if (!parentCategoryId) return;
    fetchSubcategories(parentCategoryId);
    if (documents.length === 0) {
      fetchDocuments();
    }
  }, [parentCategoryId, fetchSubcategories, fetchDocuments, documents.length]);

  const subcategory = useMemo(
    () => subcategories.find((s) => s.id === subcategoryId),
    [subcategories, subcategoryId]
  );

  const parentCategory = useMemo(
    () => parentCategories.find((pc) => pc.id === parentCategoryId),
    [parentCategories, parentCategoryId]
  );

  const isFav = subcategoryId ? isFavorite(subcategoryId) : false;

  useEffect(() => {
    if (!subcategoryId || !parentCategoryId || !subcategory?.departmentId) {
      return;
    }

    recordVisit(subcategoryId, parentCategoryId, subcategory.departmentId);
  }, [subcategoryId, parentCategoryId, subcategory?.departmentId, recordVisit]);

  const [docSortOrder, setDocSortOrder] = useState<'latest' | 'oldest' | 'alpha'>('latest');

  const subcategoryDocuments = useMemo(
    () => {
      const filtered = subcategoryId
        ? documents.filter((d) => d.subcategoryId === subcategoryId)
        : [];
      const arr = [...filtered];
      if (docSortOrder === 'alpha') {
        arr.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
      } else if (docSortOrder === 'oldest') {
        arr.sort((a, b) => new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime());
      } else {
        arr.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
      }
      return arr;
    },
    [documents, subcategoryId, docSortOrder]
  );

  // 새 문서 업로드용 dropzone
  const handleNewFileDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles || acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    const lowerName = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
    const isImage =
      file.type.startsWith('image/') ||
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg') ||
      lowerName.endsWith('.png');

    if (!isPdf && !isImage) {
      toast({
        title: t('documentMgmt.fileTypeError'),
        description: t('documentMgmt.onlyPdfJpgPng'),
        variant: 'destructive',
      });
      return;
    }
    setSelectedFile(file);
    setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
    setUploadOcrText('');
    setUploadOcrPreview('');
    setIsEditingUploadOcr(false);
    setEditedUploadOcrText('');
    setLastUploadedDocId(null);

    // OCR 추출 시작
    setIsExtractingUploadOcr(true);
    setOcrPageProgress(null);
    setUploadOcrStatus(t('subcategoryDetail.ocrExtracting'));

    try {
      const ocrText = await extractText(file, (progress) => {
        setOcrPageProgress({
          page: progress.page ?? 0,
          totalPages: progress.totalPages ?? 0,
          percent: progress.percent,
        });
      });
      setUploadOcrText(ocrText);
      setUploadOcrPreview(ocrText);
      setUploadOcrStatus(t('subcategoryDetail.ocrDoneUploadReady'));
    } catch (error) {
      console.error('OCR 추출 오류:', error);
      setUploadOcrStatus(t('subcategoryDetail.ocrFailedNoText'));
    } finally {
      setIsExtractingUploadOcr(false);
      setOcrPageProgress(null);
    }
  }, []);

  const {
    getRootProps: getNewFileRootProps,
    getInputProps: getNewFileInputProps,
    isDragActive: isNewFileDragActive,
  } = useDropzone({
    onDrop: handleNewFileDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png'],
      'application/pdf': ['.pdf'],
    },
    multiple: false,
  });

  const handleToggleFavorite = async () => {
    if (!subcategoryId) return;

    if (isFav) {
      await removeFavorite(subcategoryId);
    } else {
      await addFavorite(subcategoryId);
    }
  };

  // OCR 텍스트 편집 핸들러
  const handleEditUploadOcr = () => {
    setEditedUploadOcrText(uploadOcrPreview);
    setIsEditingUploadOcr(true);
  };

  const handleCancelEditUploadOcr = () => {
    setIsEditingUploadOcr(false);
    setEditedUploadOcrText('');
  };

  const handleApplyUploadOcrEdit = () => {
    setUploadOcrText(editedUploadOcrText);
    setUploadOcrPreview(editedUploadOcrText);
    setIsEditingUploadOcr(false);
    setEditedUploadOcrText('');
  };

  const handleSaveUploadOcrText = async () => {
    if (!lastUploadedDocId) return;
    setIsSavingUploadOcr(true);
    try {
      await updateDocumentOcrText(lastUploadedDocId, editedUploadOcrText);
      setUploadOcrText(editedUploadOcrText);
      setUploadOcrPreview(editedUploadOcrText);
      setIsEditingUploadOcr(false);
      setEditedUploadOcrText('');
    } catch (error) {
      console.error('OCR 텍스트 저장 오류:', error);
    } finally {
      setIsSavingUploadOcr(false);
    }
  };

  const handleCopyUploadOcrText = () => {
    const text = isEditingUploadOcr ? editedUploadOcrText : uploadOcrPreview;
    navigator.clipboard.writeText(text);
    toast({ title: t('subcategoryDetail.copyDone'), description: t('documentMgmt.ocrCopied') });
  };

  const handleUpload = async () => {
    if (!selectedFile || !subcategory || !parentCategoryId) {
      return;
    }

    if (isExtractingUploadOcr) {
      toast({
        title: t('documentMgmt.extractingOcr'),
        description: t('documentMgmt.waitForOcr'),
        variant: 'destructive',
      });
      return;
    }

    const title = uploadTitle.trim() || selectedFile.name;
    const finalOcrText = isEditingUploadOcr ? editedUploadOcrText : uploadOcrText;

    setIsUploading(true);
    try {
      await uploadDocument({
        name: title,
        originalFileName: selectedFile.name,
        categoryId: undefined,
        parentCategoryId,
        subcategoryId: subcategory.id,
        departmentId: subcategory.departmentId,
        uploader: user?.name || user?.email || 'Unknown',
        classified: false,
        file: selectedFile,
        ocrText: finalOcrText || undefined,
      });

      toast({
        title: t('documentMgmt.uploadComplete'),
        description: t('documentMgmt.uploadCompleteDesc'),
      });

      setSelectedFile(null);
      setUploadTitle('');
      setUploadOcrText('');
      setUploadOcrPreview('');
      setIsEditingUploadOcr(false);
      setEditedUploadOcrText('');
      setUploadOcrStatus('');
    } catch (error) {
      console.error('문서 업로드 실패:', error);
      toast({
        title: t('subcategoryDetail.uploadFailed'),
        description: t('subcategoryDetail.uploadFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleQrCode = () => {
    if (!subcategoryId) return;
    if (!qrGenerated) {
      localStorage.setItem(`qr_generated_${subcategoryId}`, 'true');
      setQrGenerated(true);
    }
    setQrDialogOpen(true);
  };

  const handleQrDownload = () => {
    const canvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-${subcategory?.name || subcategoryId}.png`;
    a.click();
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditNameError('');
  };

  const handleSaveEditSubcategory = async () => {
    if (!subcategory) {
      return;
    }

    const trimmedName = editForm.name.trim();
    if (!trimmedName) {
      setEditNameError(t('subcategoryDetail.enterName'));
      return;
    }

    setIsSavingEdit(true);
    setEditNameError('');
    try {
      await updateSubcategory(subcategory.id, {
        name: trimmedName,
        description: editForm.description,
        storageLocation: editForm.storageLocation,
        managementNumber: editForm.managementNumber,
      });

      toast({
        title: t('subcategoryDetail.editComplete'),
        description: t('subcategoryDetail.editCompleteDesc'),
      });

      setEditDialogOpen(false);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleOpenPreviewDocument = async (documentId: string) => {
    try {
      trackEvent('document_preview_open', {
        document_id: documentId,
        preview_context: 'subcategory_detail',
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

      const { data: publicData } = r2Storage.getPublicUrl(data.file_path);

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

  const handleDownloadDocument = async (documentId: string) => {
    try {
      trackEvent('document_download', {
        document_id: documentId,
        download_context: 'subcategory_detail',
      });

      const { data, error } = await supabase
        .from('documents')
        .select('file_path, title')
        .eq('id', documentId)
        .single();

      if (error || !data) {
        throw error || new Error('Document not found');
      }

      const { data: publicData } = r2Storage.getPublicUrl(data.file_path);

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

  const handleDeleteDocumentClick = async (documentId: string) => {
    setDeletingDocumentId(documentId);
    setDeleteDocDialogOpen(true);
  };

  const handleConfirmDeleteDocument = async () => {
    if (!deletingDocumentId) return;

    const targetDoc = documents.find((d) => d.id === deletingDocumentId);

    setIsDeletingDocument(true);
    try {
      trackEvent('document_delete', {
        document_id: deletingDocumentId,
        delete_context: 'subcategory_detail',
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

      if (!filePath) {
        console.error('파일 경로가 없습니다');
      } else {
        const { error: storageError } = await r2Storage.remove([filePath]);

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

      toast({
        title: t('documentMgmt.deleteComplete'),
        description: t('documentMgmt.deleteCompleteDesc'),
      });

      await fetchDocuments();

      if (user?.companyId && targetDoc) {
        const department = departments.find(
          (d) => d.id === targetDoc.departmentId,
        );
        const parentCategoryForDoc = parentCategories.find(
          (pc) => pc.id === targetDoc.parentCategoryId,
        );
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
          parentCategoryName: parentCategoryForDoc?.name ?? null,
          subcategoryId: targetDoc.subcategoryId,
          subcategoryName: subcategoryForDoc?.name ?? null,
        });
      }

      setDeleteDocDialogOpen(false);
      setDeletingDocumentId(null);
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
      share_context: 'subcategory_detail',
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
    setUnshareId(shareId);
    setUnshareDialogOpen(true);
  };

  const handleConfirmUnshare = async () => {
    if (!unshareId) return;

    setIsUnsharing(true);
    try {
      await unshareDocument(unshareId);
      
      // 목록에서 제거
      setExistingShares((prev) => prev.filter((s) => s.id !== unshareId));
      
      toast({
        title: t('documentMgmt.unshareComplete'),
        description: t('documentMgmt.unshareCompleteDesc'),
      });

      setUnshareDialogOpen(false);
      setUnshareId(null);
    } catch (error) {
      console.error('공유 취소 실패:', error);
      toast({
        title: t('documentMgmt.unshareFailed'),
        description: t('documentMgmt.unshareFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsUnsharing(false);
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

    setIsSendingShare(true);

    try {
      const doc = subcategoryDocuments.find((d) => d.id === sharingDocumentId);
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
          const { data: publicData } = r2Storage.getPublicUrl(docData.file_path);

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

  // 파일 교체 다이얼로그 열기
  const handleOpenFileReplaceDialog = (documentId: string) => {
    setReplacingDocumentId(documentId);
    setReplaceFile(null);
    setReplaceOcrText('');
    setFileReplaceDialogOpen(true);
  };

  // 파일 교체 다이얼로그 닫기
  const handleCloseFileReplaceDialog = () => {
    setFileReplaceDialogOpen(false);
    setReplacingDocumentId(null);
    setReplaceFile(null);
    setReplaceOcrText('');
    setIsExtractingOcr(false);
    setIsEditingReplaceOcr(false);
  };

  // 파일 교체용 파일 선택 핸들러
  const handleReplaceFileDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles || acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const lowerName = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
    const isImage =
      file.type.startsWith('image/') ||
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg') ||
      lowerName.endsWith('.png');

    if (!isPdf && !isImage) {
      toast({
        title: t('documentMgmt.fileTypeError'),
        description: t('documentMgmt.onlyPdfJpgPng'),
        variant: 'destructive',
      });
      return;
    }

    setReplaceFile(file);
    setIsExtractingOcr(true);

    try {
      const ocrText = await extractText(file);
      setReplaceOcrText(ocrText);
      toast({
        title: t('documentMgmt.ocrExtractComplete'),
        description: t('documentMgmt.ocrCharsExtracted', { count: ocrText.length.toLocaleString() }),
      });
    } catch (error) {
      console.error('OCR 추출 오류:', error);
      setReplaceOcrText('');
      toast({
        title: t('documentMgmt.ocrFailed'),
        description: t('documentMgmt.ocrFailedFileUploaded'),
        variant: 'destructive',
      });
    } finally {
      setIsExtractingOcr(false);
    }
  }, []);

  const { getRootProps: getReplaceRootProps, getInputProps: getReplaceInputProps, isDragActive: isReplaceDragActive } = useDropzone({
    onDrop: handleReplaceFileDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png'],
      'application/pdf': ['.pdf'],
    },
    multiple: false,
  });

  // 파일 교체 실행
  const handleReplaceFile = async () => {
    if (!replacingDocumentId || !replaceFile) {
      toast({
        title: t('documentMgmt.selectFile'),
        description: t('documentMgmt.selectFileFirst'),
        variant: 'destructive',
      });
      return;
    }

    setIsReplacingFile(true);

    try {
      await updateDocumentFile(replacingDocumentId, replaceFile, replaceOcrText);
      await fetchDocuments();
      handleCloseFileReplaceDialog();
    } catch (error) {
      console.error('파일 교체 실패:', error);
    } finally {
      setIsReplacingFile(false);
    }
  };

  if (!subcategoryId) {
    return null;
  }

  if (!subcategory) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <BackButton />
          <p className="text-slate-500">{t('documentMgmt.subcategoryNotFound')}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton className="mb-4" />

        <V1PageHeader
          breadcrumb={(() => {
            const department = subcategory && departments.find((dept) => dept.id === subcategory.departmentId);
            return [
              department?.name || t('common.department'),
              parentCategory?.name || t('subcategoryDetail.parentCategory'),
              subcategory.name,
            ];
          })()}
          title={subcategory.name}
          sub={subcategory.description || t('subcategoryDetail.noDescription')}
          right={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={isFav ? 'default' : 'outline'}
                size="sm"
                onClick={handleToggleFavorite}
                className="h-8 rounded-[10px] text-xs font-semibold gap-1.5"
              >
                <Star className={`h-3.5 w-3.5 ${isFav ? 'fill-current' : ''}`} />
                {isFav ? t('subcategoryDetail.unfavorite') : t('subcategoryDetail.favorite')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditForm({
                    name: subcategory.name,
                    description: subcategory.description || '',
                    storageLocation: subcategory.storageLocation || '',
                    managementNumber: subcategory.managementNumber || '',
                  });
                  setEditDialogOpen(true);
                }}
                className="h-8 rounded-[10px] text-xs font-semibold gap-1.5 border-[#e5e7eb]"
              >
                <Edit className="h-3.5 w-3.5" />
                {t('common.edit')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNfcDialogOpen(true)}
                disabled={isRegisteringNfc || !canDo('share')}
                className={`h-8 rounded-[10px] text-xs font-semibold gap-1.5 ${
                  subcategory.nfcRegistered
                    ? 'bg-[#2563eb] text-white hover:bg-[#1d4ed8] hover:text-white active:text-white border-[#2563eb]'
                    : 'border-[#e5e7eb]'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                {subcategory.nfcRegistered ? t('subcategoryDetail.nfcReregister') : t('subcategoryDetail.nfcRegister')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleQrCode}
                className="h-8 rounded-[10px] text-xs font-semibold gap-1.5 border-[#e5e7eb]"
              >
                <QrCode className="h-3.5 w-3.5" />
                {qrGenerated ? t('subcategoryDetail.qrView') : t('subcategoryDetail.qrGenerate')}
              </Button>
            </div>
          }
        />

        {/* V1 Chip Row */}
        <div className="flex flex-wrap gap-2">
          <V1Chip variant="blue" icon={FileText}>{t('subcategoryDetail.docCount')}: {subcategoryDocuments.length}</V1Chip>
          <V1Chip variant={subcategory.nfcRegistered ? 'emerald' : 'neutral'} icon={Smartphone}>
            NFC: {subcategory.nfcRegistered ? t('subcategoryDetail.active') : t('subcategoryDetail.inactive')}
          </V1Chip>
          {subcategory.storageLocation && (
            <V1Chip variant="neutral" icon={MapPin}>{subcategory.storageLocation}</V1Chip>
          )}
          {subcategory.managementNumber && (
            <V1Chip variant="neutral" icon={Hash}>{subcategory.managementNumber}</V1Chip>
          )}
        </div>

        {/* ─── V1 2-Column Layout ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          {/* Left Column: Documents + Upload */}
          <div className="space-y-6">
        <div className={v1Card}>
          <V1CardHeader
            title={t('subcategoryDetail.documentList')}
            icon={FileText}
            iconColor="#2563eb"
            sub={t('subcategoryDetail.documentListDesc')}
            action={
              <select
                value={docSortOrder}
                onChange={(e) => setDocSortOrder(e.target.value as 'latest' | 'oldest' | 'alpha')}
                className="h-9 rounded-[10px] border border-[#e5e7eb] bg-white text-[13px] text-slate-700 px-3 pr-8 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_8px_center] bg-no-repeat cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 dark:bg-[#111827] dark:border-white/10 dark:text-slate-200"
              >
                <option value="latest">{t('common.sortLatest')}</option>
                <option value="oldest">{t('common.sortOldest')}</option>
                <option value="alpha">{t('common.sortAlpha')}</option>
              </select>
            }
          />
          <div className="p-4 sm:p-6">
            {subcategoryDocuments.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                {t('subcategoryDetail.noDocuments')}
              </div>
            ) : (
              <div className="space-y-3">
                {subcategoryDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border border-[#e5e7eb] rounded-[10px]"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-slate-100">
                        <FileText className="h-5 w-5 text-slate-700" />
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
                          {[formatDateTimeSimple(doc.uploadDate), doc.uploader || null]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 sm:mt-0 self-end sm:self-auto flex-wrap">
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
                        onClick={() => handleOpenFileReplaceDialog(doc.id)}
                        title={t('documentMgmt.fileReplace')}
                        disabled={!canDo('write')}
                      >
                        <img src={changeIcon} alt={t('documentMgmt.fileReplace')} className="w-full h-full p-1.5" />
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
                        disabled={!canDo('share')}
                      >
                        <img src={shareIcon} alt={t('documentMgmt.shared')} className="w-full h-full p-1.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-red-500 hover:text-red-600 border-gray-200 hover:border-red-500"
                        onClick={() => handleDeleteDocumentClick(doc.id)}
                        disabled={!canDo('delete')}
                      >
                        <img src={binIcon} alt={t('common.delete')} className="w-full h-full p-1.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={v1Card}>
          <V1CardHeader
            title={t('subcategoryDetail.uploadDocument')}
            icon={Upload}
            iconColor="#2563eb"
            sub={t('subcategoryDetail.uploadDocumentDesc')}
          />
          <div className="p-4 sm:p-6 space-y-6">
            {/* 파일 업로드 영역 */}
            <div className="space-y-2">
              <Label className="font-medium">{t('documentMgmt.fileUpload')}</Label>
              <div
                {...getNewFileRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isNewFileDragActive
                    ? 'border-blue-500 bg-blue-50'
                    : selectedFile
                    ? 'border-green-500 bg-green-50'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                <input {...getNewFileInputProps()} />
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-2 w-full overflow-hidden">
                    <FileText className="h-10 w-10 text-green-500" />
                    <p className="text-sm font-medium text-green-700 truncate w-full text-center">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500">{t('documentMgmt.clickToSelectOther')}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-10 w-10 text-slate-400" />
                    <p className="text-sm font-medium text-slate-600">
                      {isNewFileDragActive ? t('documentMgmt.dropHere') : t('documentMgmt.clickOrDrag')}
                    </p>
                    <p className="text-xs text-slate-400">{t('documentMgmt.supportedFormats')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* OCR 추출 상태 */}
            {uploadOcrStatus && selectedFile && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  {isExtractingUploadOcr && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                  {!isExtractingUploadOcr && uploadOcrPreview && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  <span className={isExtractingUploadOcr ? 'text-[#2563eb]' : uploadOcrPreview ? 'text-green-600' : 'text-slate-500'}>
                    {uploadOcrStatus}
                  </span>
                  {isExtractingUploadOcr && ocrPageProgress && ocrPageProgress.totalPages > 0 && (
                    <span className="ml-auto text-slate-700 font-semibold text-sm">
                      {ocrPageProgress.page}/{ocrPageProgress.totalPages} 페이지
                    </span>
                  )}
                </div>
                {isExtractingUploadOcr && ocrPageProgress && ocrPageProgress.totalPages > 0 && (
                  <Progress value={ocrPageProgress.percent} className="w-full" />
                )}
              </div>
            )}

            {/* 문서 제목 */}
            <div className="space-y-2">
              <Label className="font-medium">{t('documentMgmt.docTitle')}</Label>
              <Input
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder={t('subcategoryDetail.fileNameDefault')}
              />
            </div>

            {/* OCR 추출 텍스트 미리보기/편집 */}
            {uploadOcrPreview && (
              <div className="border border-[#e5e7eb] rounded-[10px] overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-900">{t('documentMgmt.ocrExtractedText')}</p>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      {(isEditingUploadOcr ? editedUploadOcrText : uploadOcrPreview).length.toLocaleString()}{t('documentMgmt.chars')} {isEditingUploadOcr ? t('documentMgmt.editing') : t('documentMgmt.extracted')}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCopyUploadOcrText}
                      >
                        {t('documentMgmt.copy')}
                      </Button>
                      {isEditingUploadOcr ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEditUploadOcr}
                            disabled={isSavingUploadOcr}
                          >
                            {t('common.cancel')}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={lastUploadedDocId ? handleSaveUploadOcrText : handleApplyUploadOcrEdit}
                            disabled={isSavingUploadOcr}
                            className=""
                          >
                            {isSavingUploadOcr ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                {t('common.saving')}
                              </>
                            ) : lastUploadedDocId ? (
                              t('common.save')
                            ) : (
                              t('documentMgmt.apply')
                            )}
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleEditUploadOcr}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          {t('common.edit')}
                        </Button>
                      )}
                    </div>
                  </div>
                  {isEditingUploadOcr ? (
                    <Textarea
                      value={editedUploadOcrText}
                      onChange={(e) => setEditedUploadOcrText(e.target.value)}
                      className="min-h-64 text-sm font-mono"
                      placeholder={t('documentMgmt.editOcrPlaceholder')}
                    />
                  ) : (
                    <div className="border rounded-lg p-3 max-h-64 overflow-y-auto bg-slate-50 text-sm whitespace-pre-wrap">
                      {uploadOcrPreview}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 업로드 가이드라인 */}
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-slate-700">{t('documentMgmt.uploadGuideline')}</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• {t('documentMgmt.guidelineFormats')}</li>
                <li>• {t('documentMgmt.guidelineName')}</li>
                <li>• {t('documentMgmt.guidelineConfidential')}</li>
                <li>• {t('documentMgmt.guidelineMasking')}</li>
                <li>• {t('documentMgmt.guidelineNoConfidential')}</li>
              </ul>
            </div>

            {/* 업로드 버튼 */}
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading || isExtractingUploadOcr || !canDo('upload')}
              className="w-full h-11 rounded-[10px]  font-semibold"
            >
              {isExtractingUploadOcr ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {isExtractingUploadOcr ? t('documentMgmt.extractingOcr') : isUploading ? t('documentMgmt.uploading') : t('documentMgmt.upload')}
            </Button>
          </div>
        </div>
          </div>
          {/* ─── End Left Column ─── */}

          {/* ─── Right Sidebar ─── */}
          <div className="flex flex-col gap-4">
            {/* NFC / QR Card */}
            <div className={v1Card}>
              <V1CardHeader title="NFC / QR" icon={Smartphone} iconColor="#2563eb" />
              <div className="px-5 py-4 flex flex-col gap-3">
                <div className="flex items-center justify-between py-2">
                  <span className="text-[12.5px] text-slate-500">NFC</span>
                  <V1Chip variant={subcategory.nfcRegistered ? 'emerald' : 'neutral'}>
                    {subcategory.nfcRegistered ? t('subcategoryDetail.active') : t('subcategoryDetail.inactive')}
                  </V1Chip>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-slate-100">
                  <span className="text-[12.5px] text-slate-500">QR</span>
                  <V1Chip variant={qrGenerated ? 'blue' : 'neutral'}>
                    {qrGenerated ? t('subcategoryDetail.qrView', { defaultValue: '생성됨' }) : t('subcategoryDetail.qrGenerate', { defaultValue: '미생성' })}
                  </V1Chip>
                </div>
                <div className="flex gap-2 mt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNfcDialogOpen(true)}
                    disabled={isRegisteringNfc || !canDo('share')}
                    className={`flex-1 h-8 rounded-[10px] text-xs font-semibold ${
                      subcategory.nfcRegistered
                        ? 'bg-[#2563eb] text-white hover:bg-[#1d4ed8] hover:text-white border-[#2563eb]'
                        : 'border-[#e5e7eb]'
                    }`}
                  >
                    <Smartphone className="h-3.5 w-3.5 mr-1" />
                    NFC
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleQrCode}
                    className="flex-1 h-8 rounded-[10px] text-xs font-semibold border-[#e5e7eb]"
                  >
                    <QrCode className="h-3.5 w-3.5 mr-1" />
                    QR
                  </Button>
                </div>
              </div>
            </div>

            {/* Activity Timeline */}
            <div className={v1Card}>
              <V1CardHeader title={t('subcategoryDetail.recentActivity', { defaultValue: '최근 활동' })} icon={Activity} iconColor="#2563eb" />
              <div className="px-5 py-3">
                {subcategoryDocuments.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">{t('subcategoryDetail.noDocuments')}</p>
                ) : (
                  <div className="flex flex-col">
                    {subcategoryDocuments.slice(0, 5).map((doc, i) => (
                      <div key={doc.id} className={`flex gap-3 py-2.5 ${i > 0 ? 'border-t border-slate-50' : ''}`}>
                        <div className="flex flex-col items-center shrink-0 mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-[#2563eb]" />
                          {i < Math.min(subcategoryDocuments.length, 5) - 1 && (
                            <div className="w-px flex-1 bg-slate-200 mt-1" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-slate-900 truncate">{doc.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="text-[10px] text-slate-400 font-mono">{formatDateTimeSimple(doc.uploadDate)}</span>
                          </div>
                          {doc.uploader && (
                            <span className="text-[10px] text-slate-500 mt-0.5 block">{doc.uploader}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Storage Info */}
            <div className={v1Card}>
              <V1CardHeader title={t('subcategoryDetail.storageInfo', { defaultValue: '보관 정보' })} icon={MapPin} iconColor="#2563eb" />
              <div className="px-5 py-3 flex flex-col gap-2.5">
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-[12.5px] text-slate-500">{t('subcategoryDetail.storageLocation')}</span>
                  <span className="text-xs font-semibold text-slate-900">{subcategory.storageLocation || t('subcategoryDetail.unassigned')}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-t border-slate-100">
                  <span className="text-[12.5px] text-slate-500">{t('subcategoryDetail.managementNumber')}</span>
                  <span className="text-xs font-semibold text-slate-900 font-mono">{subcategory.managementNumber || t('subcategoryDetail.unassigned')}</span>
                </div>
                {parentCategory && (
                  <div className="flex justify-between items-center py-1.5 border-t border-slate-100">
                    <span className="text-[12.5px] text-slate-500">{t('subcategoryDetail.parentCategoryLabel')}</span>
                    <span className="text-xs font-semibold text-slate-900">{parentCategory.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* ─── End Right Sidebar ─── */}
        </div>
        {/* ─── End 2-Column Grid ─── */}

        <Dialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseEditDialog();
            }
          }}
        >
          <DialogContent variant="v1" className="max-w-[560px]">
            <V1ModalHeader icon={Edit} title={t('subcategoryDetail.editSubcategory')} sub={t('subcategoryDetail.editSubcategoryDesc')} />
            <V1ModalBody>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[13px] font-medium">{t('documentMgmt.subcategoryName')}</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder={t('documentMgmt.namePlaceholder')}
                    className="h-[38px] rounded-lg"
                  />
                  {editNameError && (
                    <p className="text-xs text-red-500">{editNameError}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[13px] font-medium">{t('documentMgmt.managementNumber')}</Label>
                  <Input
                    value={editForm.managementNumber}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        managementNumber: e.target.value,
                      }))
                    }
                    placeholder={t('documentMgmt.managementNumberPlaceholder')}
                    maxLength={30}
                    className="h-[38px] rounded-lg font-mono"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[13px] font-medium">{t('common.description')}</Label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder={t('documentMgmt.descriptionPlaceholder')}
                  className="min-h-[64px] rounded-lg resize-y"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[13px] font-medium">{t('documentMgmt.storageLocation')}</Label>
                <Input
                  value={editForm.storageLocation}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      storageLocation: e.target.value,
                    }))
                  }
                  placeholder={t('documentMgmt.storageLocationPlaceholder')}
                  maxLength={30}
                  className="h-[38px] rounded-lg"
                />
              </div>
            </V1ModalBody>
            <V1ModalFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseEditDialog}
                disabled={isSavingEdit}
                className="h-9 rounded-[10px] text-[13px] font-semibold border-[#e5e7eb]"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                onClick={handleSaveEditSubcategory}
                disabled={isSavingEdit}
                className="h-9 rounded-[10px] text-[13px] font-semibold "
              >
                {isSavingEdit ? t('common.saving') : t('common.save')}
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
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: V1.blueSoft }}>
                <FileText className="h-4 w-4" style={{ color: V1.blueInk }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-slate-900 truncate">{previewDoc?.title || t('documentMgmt.docPreview')}</div>
                <div className="text-[11.5px] text-slate-500 font-mono truncate">
                  {[previewDoc?.uploader, previewDoc?.uploadDate, previewDoc?.fileSize].filter(Boolean).join(' · ') || (previewDoc?.type === 'pdf' ? 'PDF' : 'Image')}
                </div>
              </div>
              {previewDoc && (
                <>
                  <button
                    onClick={() => handleDownloadDocument(previewDoc.id)}
                    className="h-8 px-2.5 rounded-lg border border-[#e5e7eb] bg-white text-[12px] font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shrink-0"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {t('documentMgmt.download')}
                  </button>
                  <button
                    onClick={() => {
                      setSharingDocumentId(previewDoc.id);
                      handleOpenShareDialog(previewDoc.id);
                    }}
                    className="h-8 px-2.5 rounded-lg border border-[#e5e7eb] bg-white text-[12px] font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shrink-0"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    {t('documentMgmt.share', { defaultValue: '공유' })}
                  </button>
                </>
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
                {/* Image toolbar (image only) */}
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

                {/* Viewer area */}
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
                {/* OCR Text */}
                <div className="p-4 border-b border-slate-100 flex-1 overflow-auto">
                  <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-2">
                    OCR {t('documentMgmt.extractedText', { defaultValue: '추출 텍스트' })} · {previewDoc?.ocrText?.length?.toLocaleString() ?? 0}{t('documentMgmt.chars', { defaultValue: '자' })}
                  </div>
                  <div className="text-[11.5px] text-slate-500 leading-relaxed whitespace-pre-wrap">
                    {previewDoc?.ocrText || t('documentMgmt.noOcrText', { defaultValue: 'OCR 텍스트 없음' })}
                  </div>
                </div>
                {/* Document Info */}
                <div className="p-4 border-b border-slate-100 shrink-0">
                  <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-2.5">
                    {t('documentMgmt.docInfo', { defaultValue: '문서 정보' })}
                  </div>
                  <div className="flex flex-col gap-2 text-[12px]">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">{t('subcategoryDetail.storageLocation', { defaultValue: '보관 위치' })}</span>
                      <span className="text-slate-900 font-medium">{subcategory?.name ?? '-'}</span>
                    </div>
                    {subcategory?.nfcUid && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">NFC</span>
                        <span className="text-slate-900 font-medium font-mono">{subcategory.nfcUid}</span>
                      </div>
                    )}
                    {subcategory?.storageLocation && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">{t('subcategoryDetail.physicalLocation', { defaultValue: '물리 위치' })}</span>
                        <span className="text-slate-900 font-medium">{subcategory.storageLocation}</span>
                      </div>
                    )}
                    {subcategory?.managementNumber && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">{t('subcategoryDetail.managementNumber', { defaultValue: '관리번호' })}</span>
                        <span className="text-slate-900 font-medium font-mono">{subcategory.managementNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* NFC 등록 다이얼로그 — 펄스 애니메이션 */}
        {subcategory && (
          <NFCRegistrationDialog
            open={nfcDialogOpen}
            onOpenChange={setNfcDialogOpen}
            categoryId={subcategory.id}
            categoryName={subcategory.name}
            onSuccess={fetchSubcategories}
          />
        )}

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
                    <span>{t('documentMgmt.selectAll', { defaultValue: '총' })} {companyUsers.length}{t('documentMgmt.people', { defaultValue: '명' })} — <strong className="text-slate-900">{selectedUserIds.length}</strong> {t('documentMgmt.selected', { defaultValue: '선택됨' })}</span>
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
                    <div className="text-center py-8 text-slate-500 text-[13px]">
                      {t('documentMgmt.noUsersToShare')}
                    </div>
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
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(companyUser.id)}
                            readOnly
                            className="w-[15px] h-[15px] accent-[#2563eb] m-0"
                          />
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
                    <input
                      type="checkbox"
                      checked={sendEmailNotification}
                      onChange={(e) => setSendEmailNotification(e.target.checked)}
                      className="w-[15px] h-[15px] accent-[#2563eb] m-0"
                    />
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
                    <div className="text-center py-8 text-slate-500 text-[13px]">
                      {t('documentMgmt.noSharedUsers')}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {existingShares.map((share: any) => (
                        <div
                          key={share.id}
                          className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium truncate">{share.users?.name || t('common.unknown')}</p>
                            <p className="text-[11px] text-slate-500 font-mono truncate">{share.users?.email || ''}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnshare(share.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 text-[12px]"
                          >
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

        {/* 파일 교체 다이얼로그 */}
        <Dialog open={fileReplaceDialogOpen} onOpenChange={(open) => !open && handleCloseFileReplaceDialog()}>
          <DialogContent variant="v1" className="max-w-[560px]">
            <V1ModalHeader icon={Upload} title={t('documentMgmt.fileReplace')} sub={t('documentMgmt.fileReplaceDesc')} />
            <V1ModalBody>
              {/* V1 Dropzone */}
              <div
                {...getReplaceRootProps()}
                className={`border-2 border-dashed rounded-[12px] p-7 text-center cursor-pointer transition-colors ${
                  isReplaceDragActive
                    ? 'border-[#2563eb] bg-[#eff6ff]'
                    : replaceFile
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-[#2563eb] bg-[#eff6ff]'
                }`}
              >
                <input {...getReplaceInputProps()} />
                {isExtractingOcr ? (
                  <div className="flex flex-col items-center gap-2.5">
                    <Loader2 className="h-8 w-8 animate-spin text-[#2563eb]" />
                    <p className="text-[13px] text-[#2563eb] font-medium">{t('subcategoryDetail.ocrExtracting')}</p>
                  </div>
                ) : replaceFile ? (
                  <div className="flex flex-col items-center gap-2.5 w-full overflow-hidden">
                    <div className="w-11 h-11 rounded-[10px] bg-white flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                    </div>
                    <p className="text-[13px] font-medium text-emerald-700 truncate w-full text-center">{replaceFile.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {replaceOcrText ? `${replaceOcrText.length.toLocaleString()}${t('documentMgmt.chars')} ${t('documentMgmt.extracted')}` : t('documentMgmt.noOcrText')}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="w-11 h-11 rounded-[10px] bg-white flex items-center justify-center">
                      <Upload className="h-[22px] w-[22px] text-[#2563eb]" />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-slate-900">{isReplaceDragActive ? t('documentMgmt.dropHere') : t('documentMgmt.clickOrDrag')}</p>
                      <p className="text-[12px] text-slate-500 mt-1">{t('documentMgmt.supportedFormatsShort')}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* OCR 추출 텍스트 */}
              {replaceFile && !isExtractingOcr && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[13px] font-medium">{t('documentMgmt.ocrExtractedText')}</Label>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {replaceOcrText.length.toLocaleString()}{t('documentMgmt.chars')}
                    </span>
                  </div>
                  <Textarea
                    value={replaceOcrText}
                    onChange={(e) => setReplaceOcrText(e.target.value)}
                    readOnly={!isEditingReplaceOcr}
                    className={`min-h-[128px] max-h-48 text-[13px] font-mono rounded-lg ${
                      !isEditingReplaceOcr ? 'bg-slate-50 cursor-default' : ''
                    }`}
                    placeholder={replaceOcrText ? undefined : t('documentMgmt.noOcrText')}
                  />
                </div>
              )}
            </V1ModalBody>
            <V1ModalFooter>
              <Button
                variant="outline"
                onClick={handleCloseFileReplaceDialog}
                disabled={isReplacingFile}
                className="h-9 rounded-[10px] text-[13px] font-semibold border-[#e5e7eb]"
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditingReplaceOcr(!isEditingReplaceOcr)}
                disabled={!replaceFile || isReplacingFile || isExtractingOcr}
                className="h-9 rounded-[10px] text-[13px] font-semibold border-[#e5e7eb]"
              >
                {isEditingReplaceOcr ? t('documentMgmt.editDone') : t('common.edit')}
              </Button>
              <Button
                onClick={handleReplaceFile}
                disabled={!replaceFile || isReplacingFile || isExtractingOcr}
                className="h-9 rounded-[10px] text-[13px] font-semibold "
              >
                {isReplacingFile ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    {t('common.saving')}
                  </>
                ) : (
                  t('common.save')
                )}
              </Button>
            </V1ModalFooter>
          </DialogContent>
        </Dialog>
        {/* QR 코드 다이얼로그 */}
        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
          <DialogContent variant="v1" className="sm:max-w-sm">
            <V1ModalHeader icon={QrCode} title={t('subcategoryDetail.qrCodeTitle')} sub={t('subcategoryDetail.qrCodeDesc')} />
            <div className="flex flex-col items-center gap-4 px-6 py-5">
              {subcategoryId && (
                <QRCodeCanvas
                  id="qr-code-canvas"
                  value={`${window.location.origin}/nfc-redirect?subcategoryId=${subcategoryId}`}
                  size={220}
                  level="H"
                  includeMargin
                />
              )}
              <p className="text-[11px] text-slate-400 break-all text-center font-mono">
                {`${window.location.origin}/nfc-redirect?subcategoryId=${subcategoryId}`}
              </p>
            </div>
            <V1ModalFooter>
              <Button variant="outline" onClick={() => setQrDialogOpen(false)} className="h-9 rounded-[10px] text-[13px] font-semibold border-[#e5e7eb]">
                {t('common.close')}
              </Button>
              <Button onClick={handleQrDownload} className="h-9 rounded-[10px] text-[13px] font-semibold ">
                {t('subcategoryDetail.qrDownload')}
              </Button>
            </V1ModalFooter>
          </DialogContent>
        </Dialog>

        {/* 문서 삭제 확인 AlertDialog */}
        <AlertDialog open={deleteDocDialogOpen} onOpenChange={setDeleteDocDialogOpen}>
          <AlertDialogContent className="max-w-md">
            <div className="flex items-start gap-3 px-6 pt-5 pb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-red-50">
                <FileText className="h-[18px] w-[18px] text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <AlertDialogTitle className="text-base font-semibold tracking-tight">
                  {t('documentMgmt.deleteDoc')}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-slate-500 mt-1">
                  {t('subcategoryDetail.confirmDelete')}
                </AlertDialogDescription>
              </div>
            </div>
            <AlertDialogFooter className="px-6 pb-5">
              <AlertDialogCancel disabled={isDeletingDocument} className="h-9">
                {t('common.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteDocument}
                className="h-9 bg-[#ef4444] hover:bg-[#dc2626] dark:bg-[#f87171] dark:hover:bg-[#fca5a5] dark:text-slate-900"
                disabled={isDeletingDocument}
              >
                {isDeletingDocument ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    {t('documentMgmt.deleting')}
                  </>
                ) : (
                  <>
                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                    {t('common.delete')}
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 공유 취소 확인 AlertDialog */}
        <AlertDialog open={unshareDialogOpen} onOpenChange={setUnshareDialogOpen}>
          <AlertDialogContent className="max-w-md">
            <div className="flex items-start gap-3 px-6 pt-5 pb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-amber-50">
                <Share2 className="h-[18px] w-[18px] text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <AlertDialogTitle className="text-base font-semibold tracking-tight">
                  {t('documentMgmt.unshareTitle', { defaultValue: '공유 취소' })}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-slate-500 mt-1">
                  {t('documentMgmt.confirmUnshare')}
                </AlertDialogDescription>
              </div>
            </div>
            <AlertDialogFooter className="px-6 pb-5">
              <AlertDialogCancel disabled={isUnsharing} className="h-9">
                {t('common.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmUnshare}
                className="h-9 bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
                disabled={isUnsharing}
              >
                {isUnsharing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    {t('common.processing')}
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5 mr-1.5" />
                    {t('documentMgmt.unshare', { defaultValue: '취소' })}
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </DashboardLayout>
  );
}
