import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Smartphone, Upload, Star, Loader2, CheckCircle2 } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
import { useAuthStore } from '@/store/authStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { readNFCUid, writeNFCUrl, setNfcMode } from '@/lib/nfc';
import { formatDateTimeSimple } from '@/lib/utils';
import { DocumentBreadcrumb } from '@/components/DocumentBreadcrumb';
import { useFavoriteStore } from '@/store/favoriteStore';
import { supabase } from '@/lib/supabase';
import { createDocumentNotification } from '@/lib/notifications';
import { PdfViewer } from '@/components/PdfViewer';
import { trackEvent } from '@/lib/analytics';

export function SubcategoryDetail() {
  const { parentCategoryId, subcategoryId } = useParams<{
    parentCategoryId: string;
    subcategoryId: string;
  }>();
  const navigate = useNavigate();
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
    registerNfcTag,
    updateSubcategory,
    findSubcategoryByNfcUid,
    clearNfcByUid,
    shareDocument,
    unshareDocument,
  } = useDocumentStore();

  const { addFavorite, removeFavorite, isFavorite, recordVisit } = useFavoriteStore();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isRegisteringNfc, setIsRegisteringNfc] = useState(false);
  const [nfcConfirmDialogOpen, setNfcConfirmDialogOpen] = useState(false);
  const [pendingNfcUid, setPendingNfcUid] = useState<string | null>(null);
  const [existingNfcSubcategory, setExistingNfcSubcategory] = useState<{ id: string; name: string } | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    storageLocation: '',
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

  const subcategoryDocuments = useMemo(
    () =>
      subcategoryId
        ? documents.filter((d) => d.subcategoryId === subcategoryId)
        : [],
    [documents, subcategoryId]
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file) {
      setUploadTitle(file.name);
    } else {
      setUploadTitle('');
    }
  };

  const handleToggleFavorite = async () => {
    if (!subcategoryId) return;

    if (isFav) {
      await removeFavorite(subcategoryId);
    } else {
      await addFavorite(subcategoryId);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !subcategory || !parentCategoryId) {
      return;
    }

    const title = uploadTitle.trim() || selectedFile.name;

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
        ocrText: undefined,
      });

      toast({
        title: '업로드 완료',
        description: '문서가 업로드되었습니다.',
      });

      setSelectedFile(null);
      setUploadTitle('');
    } catch (error) {
      console.error('문서 업로드 실패:', error);
      toast({
        title: '업로드 실패',
        description: '문서를 업로드하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRegisterNfc = async () => {
    if (!subcategory || !subcategoryId) {
      return;
    }

    setIsRegisteringNfc(true);
    const scanToast = toast({
      title: 'NFC 태그 인식 대기',
      description: 'NFC 태그를 기기에 가까이 가져다 대세요.',
      duration: 1000000,
    });
    try {
      // 1) 태그의 UID를 읽어온다
      const uid = await readNFCUid();
      scanToast.dismiss();

      // 2) 이 UID가 이미 등록된 태그인지 확인
      const existingSub = await findSubcategoryByNfcUid(uid);

      if (existingSub) {
        // 이미 등록된 태그 → 확인 다이얼로그 띄우기
        setPendingNfcUid(uid);
        setExistingNfcSubcategory({ id: existingSub.id, name: existingSub.name });
        setNfcConfirmDialogOpen(true);
        setIsRegisteringNfc(false);
        return;
      }

      // 등록된 적 없는 태그 → 바로 등록 진행
      await proceedNfcRegistration(uid);
    } catch (error) {
      scanToast.dismiss();
      console.error('NFC 등록 실패:', error);

      let description = 'NFC 태그를 등록하는 중 오류가 발생했습니다.';
      if (error instanceof Error) {
        description = error.message;
      } else if (error && typeof error === 'object' && 'message' in (error as any)) {
        description = String((error as any).message ?? description);
      }

      toast({
        title: 'NFC 등록 실패',
        description,
        variant: 'destructive',
      });
      setNfcMode('idle'); // 에러 시 모드 초기화
      setIsRegisteringNfc(false);
    }
  };

  const proceedNfcRegistration = async (uid: string) => {
    if (!subcategory) return;

    setIsRegisteringNfc(true);
    try {
      // 기존에 이 UID를 쓰던 모든 세부 카테고리에서 NFC 정보 해제
      await clearNfcByUid(uid, subcategory.id);

      // NFC 태그에 세부 카테고리용 URL을 쓴다
      await writeNFCUrl(subcategory.id, subcategory.name);

      // 세부 카테고리 테이블에 UID 및 등록 여부 반영
      await registerNfcTag(subcategory.id, uid);

      toast({
        title: 'NFC 등록 완료',
        description: 'NFC에 세부 카테고리가 등록되었습니다.',
      });

      // 상태 초기화
      setPendingNfcUid(null);
      setExistingNfcSubcategory(null);
      setNfcConfirmDialogOpen(false);
      setNfcMode('idle'); // NFC 등록 완료 후 모드 초기화
    } catch (error) {
      console.error('NFC 등록 실패:', error);

      let description = 'NFC 태그를 등록하는 중 오류가 발생했습니다.';
      if (error instanceof Error) {
        description = error.message;
      } else if (error && typeof error === 'object' && 'message' in (error as any)) {
        description = String((error as any).message ?? description);
      }

      toast({
        title: 'NFC 등록 실패',
        description,
        variant: 'destructive',
      });
      setNfcMode('idle'); // 에러 시 모드 초기화
    } finally {
      setIsRegisteringNfc(false);
    }
  };

  const handleNfcConfirmYes = async () => {
    if (!pendingNfcUid) return;
    await proceedNfcRegistration(pendingNfcUid);
  };

  const handleNfcConfirmNo = () => {
    setPendingNfcUid(null);
    setExistingNfcSubcategory(null);
    setNfcConfirmDialogOpen(false);
    setNfcMode('idle'); // 취소 시 모드 초기화
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
      setEditNameError('이름을 입력하세요');
      return;
    }

    setIsSavingEdit(true);
    setEditNameError('');
    try {
      await updateSubcategory(subcategory.id, {
        name: trimmedName,
        description: editForm.description,
        storageLocation: editForm.storageLocation,
      });

      toast({
        title: '수정 완료',
        description: '세부 카테고리가 수정되었습니다.',
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

  const handleDeleteDocumentClick = async (documentId: string) => {
    const confirmed = window.confirm('정말 삭제하시겠습니까?');
    if (!confirmed) return;

    const targetDoc = documents.find((d) => d.id === documentId);

    try {
      trackEvent('document_delete', {
        document_id: documentId,
        delete_context: 'subcategory_detail',
      });

      const { data, error } = await supabase
        .from('documents')
        .select('file_path')
        .eq('id', documentId)
        .single();

      if (error) {
        throw error;
      }

      const filePath = data?.file_path as string | undefined;

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
        .eq('id', documentId);

      if (dbError) {
        throw dbError;
      }

      await fetchDocuments();

      toast({
        title: '삭제 완료',
        description: '문서가 삭제되었습니다.',
      });

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
          documentId,
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
    } catch (error) {
      console.error('문서 삭제 실패:', error);


      toast({
        title: '삭제 실패',
        description: '문서를 삭제하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
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
        throw new Error('회사 정보가 없습니다.');
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
        title: '공유 정보 로드 실패',
        description: '공유 정보를 불러오지 못했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingUsers(false);
      setIsLoadingShares(false);
    }
  };

  // 공유 취소
  const handleUnshare = async (shareId: string) => {
    if (!confirm('공유를 취소하시겠습니까?')) return;

    try {
      await unshareDocument(shareId);
      
      // 목록에서 제거
      setExistingShares((prev) => prev.filter((s) => s.id !== shareId));
      
      toast({
        title: '공유 취소 완료',
        description: '문서 공유가 취소되었습니다.',
      });
    } catch (error) {
      console.error('공유 취소 실패:', error);
      toast({
        title: '공유 취소 실패',
        description: '공유 취소 중 오류가 발생했습니다.',
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
        title: '선택 오류',
        description: '공유할 사용자를 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setIsSendingShare(true);

    try {
      const doc = subcategoryDocuments.find((d) => d.id === sharingDocumentId);
      if (!doc) {
        throw new Error('문서를 찾을 수 없습니다.');
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
                senderName: user?.name || '알 수 없음',
                senderEmail: user?.email || '',
              },
            });
          } catch (emailError) {
            console.warn('이메일 전송 실패 (공유는 완료됨):', emailError);
          }
        }
      }

      toast({
        title: '공유 완료',
        description: `${selectedUserIds.length}명에게 문서가 공유되었습니다.${sendEmailNotification ? ' 이메일도 전송되었습니다.' : ''}`,
      });

      setShareDialogOpen(false);
      setSharingDocumentId(null);
      setSelectedUserIds([]);
      setSendEmailNotification(false);
    } catch (error) {
      console.error('문서 공유 실패:', error);
      toast({
        title: '공유 실패',
        description: '문서를 공유하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSendingShare(false);
    }
  };

  if (!subcategoryId) {
    return null;
  }

  if (!subcategory) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>
          <p className="text-slate-500">세부 카테고리를 찾을 수 없습니다.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <DocumentBreadcrumb
            items={(() => {
              const isAdmin = window.location.pathname.startsWith('/admin');
              const basePath = isAdmin ? '/admin' : '/team';

              const department =
                subcategory &&
                departments.find((dept) => dept.id === subcategory.departmentId);

              const departmentHref =
                department?.id &&
                (isAdmin
                  ? `/admin/departments/${department.id}`
                  : `/team/department/${department.id}`);

              return [
                {
                  label: department?.name || '부서',
                  href: departmentHref || undefined,
                },
                {
                  label: parentCategory?.name || '대분류',
                  href: `${basePath}/parent-category/${parentCategoryId}`,
                },
                {
                  label: subcategory.name,
                  isCurrentPage: true,
                },
              ];
            })()}
            className="mb-2"
          />

          <Button
            variant="ghost"
            className="mb-4 bg-[#2563eb] text-white hover:bg-[#1d4ed8] hover:text-white"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {subcategory.name}
              </h1>
              <p className="text-slate-500 mt-1">
                {subcategory.description || '설명이 등록되어 있지 않습니다.'}
              </p>
              {parentCategory && (
                <p className="text-sm text-slate-500 mt-1">
                  상위 대분류: {parentCategory.name}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <Button
                variant={isFav ? 'default' : 'outline'}
                size="sm"
                onClick={handleToggleFavorite}
                className="flex items-center gap-2 w-28 justify-center"
              >
                <Star className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
                {isFav ? '즐겨찾기 해제' : '즐겨찾기'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegisterNfc}
                disabled={isRegisteringNfc}
                className={`flex items-center gap-2 w-28 justify-center ${
                  subcategory.nfcRegistered 
                    ? 'bg-[#2563eb] text-white hover:bg-[#1d4ed8] hover:text-white active:text-white border-[#2563eb]' 
                    : ''
                }`}
              >
                <Smartphone className="h-4 w-4" />
                {subcategory.nfcRegistered ? 'NFC 재등록' : 'NFC 등록'}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">문서 수</p>
              <p className="text-2xl font-bold mt-2">
                {subcategoryDocuments.length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">NFC 상태</p>
              <p className="text-2xl font-bold mt-2">
                {subcategory.nfcRegistered ? '활성' : '비활성'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">보관 위치</p>
              <p className="text-sm font-bold mt-2">
                {subcategory.storageLocation || '미지정'}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>문서 목록</CardTitle>
              <CardDescription className="mt-1">
                이 세부 카테고리에 속한 문서입니다.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {subcategoryDocuments.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                이 세부 카테고리에 문서가 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {subcategoryDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg"
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
                              기밀
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
                    <div className="flex gap-2 mt-3 sm:mt-0 self-end sm:self-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenPreviewDocument(doc.id)}
                      >
                        문서 보기
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
                        onClick={() => handleOpenShareDialog(doc.id)}
                      >
                        📤
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-red-500 hover:text-red-600 border-gray-200 hover:border-red-500"
                        onClick={() => handleDeleteDocumentClick(doc.id)}
                      >
                        🗑️
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>문서 업로드</CardTitle>
            <CardDescription>
              이 세부 카테고리에 새 문서를 업로드합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>파일</Label>
                <Input type="file" accept="application/pdf,image/*" onChange={handleFileChange} />
              </div>
              <div className="space-y-2">
                <Label>문서 제목</Label>
                <Input
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="파일 이름이 기본값으로 사용됩니다."
                />
              </div>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? '업로드 중...' : '업로드'}
              </Button>
            </div>
          </CardContent>
        </Card>
        <Dialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseEditDialog();
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>세부 카테고리 수정</DialogTitle>
              <DialogDescription>
                이 세부 카테고리 정보를 수정합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>세부 카테고리 이름</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="예: 채용 서류 보관함"
                />
                {editNameError && (
                  <p className="text-xs text-red-500 mt-1">{editNameError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>설명</Label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="세부 카테고리 설명"
                />
              </div>
              <div className="space-y-2">
                <Label>보관 위치</Label>
                <Input
                  value={editForm.storageLocation}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      storageLocation: e.target.value,
                    }))
                  }
                  placeholder="예: A동 2층 캐비닛 3"
                />
              </div>
              {/* NFC 등록 여부는 DB(nfcRegistered) 기반으로 카드/상태에서만 표시하고,
                  수정 다이얼로그에서는 직접 수정하지 않는다. */}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseEditDialog}
                disabled={isSavingEdit}
              >
                취소
              </Button>
              <Button
                type="button"
                onClick={handleSaveEditSubcategory}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? '수정 중...' : '저장'}
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
          {previewDoc?.type === 'pdf' && (
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col overflow-hidden" closeClassName="bg-blue-600 hover:bg-blue-700 text-white rounded p-1.5">
              <DialogHeader>
                <DialogTitle className="truncate pr-8">{previewDoc?.title || '문서 미리보기'}</DialogTitle>
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

          {previewDoc?.type === 'image' && (
            <DialogContent className="max-w-6xl h-[90vh] flex flex-col overflow-hidden" closeClassName="bg-blue-600 hover:bg-blue-700 text-white rounded p-1.5">
              <DialogHeader>
                <DialogTitle className="truncate pr-8">{previewDoc?.title || '이미지 미리보기'}</DialogTitle>
              </DialogHeader>

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

        {/* NFC 재등록 확인 다이얼로그 */}
        <AlertDialog open={nfcConfirmDialogOpen} onOpenChange={setNfcConfirmDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>NFC 태그 재등록</AlertDialogTitle>
              <AlertDialogDescription>
                이미 URL이 등록된 태그입니다.
                {existingNfcSubcategory && (
                  <span className="block mt-2 font-medium">
                    현재 연결: {existingNfcSubcategory.name}
                  </span>
                )}
                <span className="block mt-2">계속 하시겠습니까?</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleNfcConfirmNo}>
                아니오
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleNfcConfirmYes}>
                예
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 문서 공유 다이얼로그 */}
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>문서 공유</DialogTitle>
              <DialogDescription>
                공유할 사용자를 선택하거나 기존 공유를 관리하세요.
              </DialogDescription>
            </DialogHeader>

            {/* 탭 버튼 */}
            <div className="flex border-b bg-white">
              <button
                className={`flex-1 py-2 text-sm font-medium bg-white ${
                  activeShareTab === 'new'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                onClick={() => setActiveShareTab('new')}
              >
                새로운 공유
              </button>
              <button
                className={`flex-1 py-2 text-sm font-medium bg-white ${
                  activeShareTab === 'existing'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                onClick={() => setActiveShareTab('existing')}
              >
                공유 현황 ({existingShares.length})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              {activeShareTab === 'new' ? (
                <>
                  {/* 전체 선택 */}
                  {companyUsers.length > 0 && (
                    <div className="pb-2 mb-2 border-b">
                      <button
                        onClick={handleSelectAllUsers}
                        className="text-sm text-slate-600 hover:text-slate-800 bg-white px-3 py-1.5 border border-slate-300 rounded-md hover:bg-slate-50"
                      >
                        {selectedUserIds.length === companyUsers.length ? '전체 해제' : '전체 선택'}
                      </button>
                    </div>
                  )}

                  {isLoadingUsers ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                      <span className="ml-2 text-slate-500">사용자 목록 로딩 중...</span>
                    </div>
                  ) : companyUsers.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      공유할 수 있는 사용자가 없습니다.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {companyUsers.map((companyUser) => (
                        <div
                          key={companyUser.id}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedUserIds.includes(companyUser.id)
                              ? "bg-blue-50 border border-blue-200"
                              : "bg-slate-50 hover:bg-slate-100 border border-transparent"
                          }`}
                          onClick={() => handleToggleUser(companyUser.id)}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            selectedUserIds.includes(companyUser.id)
                              ? "bg-blue-600 border-blue-600"
                              : "border-slate-300"
                          }`}>
                            {selectedUserIds.includes(companyUser.id) && (
                              <CheckCircle2 className="h-4 w-4 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{companyUser.name}</p>
                            <p className="text-sm text-slate-500 truncate">{companyUser.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* 공유 현황 탭 */}
                  {isLoadingShares ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                      <span className="ml-2 text-slate-500">공유 현황 로딩 중...</span>
                    </div>
                  ) : existingShares.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      아직 공유한 사용자가 없습니다.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {existingShares.map((share: any) => (
                        <div
                          key={share.id}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{share.users?.name || '알 수 없음'}</p>
                            <p className="text-sm text-slate-500 truncate">{share.users?.email || ''}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              {new Date(share.shared_at).toLocaleDateString('ko-KR')} 공유
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnshare(share.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            취소
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <DialogFooter className="border-t pt-4">
              {/* 이메일 알림 체크박스 - 우측 하단 */}
              {activeShareTab === 'new' && (
                <div className="flex items-center space-x-2 mr-auto">
                  <input
                    type="checkbox"
                    id="emailNotificationSubcategory"
                    checked={sendEmailNotification}
                    onChange={(e) => setSendEmailNotification(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <label htmlFor="emailNotificationSubcategory" className="text-sm">
                    이메일 알림 전송
                  </label>
                </div>
              )}
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
              >
                닫기
              </Button>
              {activeShareTab === 'new' && (
                <Button
                  onClick={handleSendShare}
                  disabled={isSendingShare || selectedUserIds.length === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSendingShare ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      공유 중...
                    </>
                  ) : (
                    <>📤 {selectedUserIds.length}명에게 공유</>
                  )}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
