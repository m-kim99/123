import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Smartphone, CalendarIcon } from 'lucide-react';
import penIcon from '@/assets/pen.svg';
import binIcon from '@/assets/bin.svg';
import { format, addDays, addMonths, addYears } from 'date-fns';
import { ko } from 'date-fns/locale';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DocumentBreadcrumb } from '@/components/DocumentBreadcrumb';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { readNFCUid, writeNFCUrl, setNfcMode } from '@/lib/nfc';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { BackButton } from '@/components/BackButton';
import { ColorLabelPicker, ColorLabelBadge } from '@/components/ColorLabelPicker';
import { Edit, Trash2 } from 'lucide-react';

// 만료 상태 계산
function getExpiryStatus(expiryDate: string | null): {
  status: 'normal' | 'warning_30' | 'warning_7' | 'expired';
  daysLeft: number | null;
  label: string | null;
} {
  if (!expiryDate) {
    return { status: 'normal', daysLeft: null, label: null };
  }

  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: 'expired', daysLeft: diffDays, label: '만료됨 🔒' };
  } else if (diffDays <= 7) {
    return { status: 'warning_7', daysLeft: diffDays, label: `만료 ${diffDays}일 전` };
  } else if (diffDays <= 30) {
    return { status: 'warning_30', daysLeft: diffDays, label: `만료 ${diffDays}일 전` };
  } else {
    return { status: 'normal', daysLeft: diffDays, label: null };
  }
}

export function ParentCategoryDetail() {
  const { parentCategoryId } = useParams<{ parentCategoryId: string }>();
  const navigate = useNavigate();
  
  // Selector 최적화: 상태값은 개별 selector로
  const departments = useDocumentStore((state) => state.departments);
  const parentCategories = useDocumentStore((state) => state.parentCategories);
  const subcategories = useDocumentStore((state) => state.subcategories);
  const documents = useDocumentStore((state) => state.documents);
  // 함수는 한 번에 가져오기 (참조 안정적)
  const {
    fetchParentCategories,
    fetchSubcategories,
    fetchDocuments,
    addSubcategory,
    updateSubcategory,
    deleteSubcategory,
    registerNfcTag,
    findSubcategoryByNfcUid,
    clearNfcByUid,
  } = useDocumentStore();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    storageLocation: '',
    managementNumber: '',
    defaultExpiryDays: null as number | null,
    expiryDate: null as string | null,
    colorLabel: null as string | null,
  });

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editNameError, setEditNameError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // NFC 재등록 확인 다이얼로그 상태
  const [nfcConfirmDialogOpen, setNfcConfirmDialogOpen] = useState(false);
  const [pendingNfcUid, setPendingNfcUid] = useState<string | null>(null);
  const [pendingNfcSubcategoryId, setPendingNfcSubcategoryId] = useState<string | null>(null);
  const [existingNfcSubcategory, setExistingNfcSubcategory] = useState<{ id: string; name: string } | null>(null);

  // 만료된 카테고리 안내 다이얼로그 상태
  const [expiredDialogOpen, setExpiredDialogOpen] = useState(false);
  const [expiredSubcategory, setExpiredSubcategory] = useState<any>(null);

  // 세부 스토리지 수정/삭제 다이얼로그 상태
  const [subEditDialogOpen, setSubEditDialogOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<any>(null);
  const [subEditForm, setSubEditForm] = useState({
    name: '',
    description: '',
    storageLocation: '',
    managementNumber: '',
    defaultExpiryDays: null as number | null,
    expiryDate: null as string | null,
    colorLabel: null as string | null,
  });
  const [subEditNameError, setSubEditNameError] = useState('');
  const [isSavingSubEdit, setIsSavingSubEdit] = useState(false);
  const [subDeleteDialogOpen, setSubDeleteDialogOpen] = useState(false);
  const [deletingSubcategory, setDeletingSubcategory] = useState<any>(null);
  const [isDeletingSubcategory, setIsDeletingSubcategory] = useState(false);

  useEffect(() => {
    if (!parentCategoryId) return;
    fetchParentCategories();
    fetchSubcategories(parentCategoryId);
    if (documents.length === 0) {
      fetchDocuments();
    }
  }, [parentCategoryId, fetchParentCategories, fetchSubcategories, fetchDocuments, documents.length]);

  const parentCategory = useMemo(
    () => parentCategories.find((pc) => pc.id === parentCategoryId),
    [parentCategories, parentCategoryId]
  );

  const department = useMemo(
    () =>
      parentCategory
        ? departments.find((d) => d.id === parentCategory.departmentId)
        : undefined,
    [departments, parentCategory]
  );

  const childSubcategories = useMemo(
    () =>
      parentCategoryId
        ? subcategories.filter((s) => s.parentCategoryId === parentCategoryId)
        : [],
    [subcategories, parentCategoryId]
  );

  const parentDocumentsCount = useMemo(
    () =>
      parentCategoryId
        ? documents.filter((d) => d.parentCategoryId === parentCategoryId).length
        : 0,
    [documents, parentCategoryId]
  );

  const handleAddSubcategory = async () => {
    if (!parentCategory || !form.name.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await addSubcategory({
        name: form.name.trim(),
        description: form.description,
        parentCategoryId: parentCategory.id,
        departmentId: parentCategory.departmentId,
        nfcUid: null,
        nfcRegistered: false,
        storageLocation: form.storageLocation,
        defaultExpiryDays: form.defaultExpiryDays,
        expiryDate: form.expiryDate,
        colorLabel: form.colorLabel,
      });
      setAddDialogOpen(false);
      setForm({
        name: '',
        description: '',
        storageLocation: '',
        managementNumber: '',
        defaultExpiryDays: null,
        expiryDate: null,
        colorLabel: null,
      });
      toast({
        title: '세부 스토리지 등록 완료',
        description: '세부 스토리지가 성공적으로 추가되었습니다.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSubcategoryWithNfc = async () => {
    if (!parentCategory || !form.name.trim()) {
      return;
    }

    setIsSaving(true);
    const scanToast = toast({
      title: 'NFC 태그 인식 대기',
      description: 'NFC 태그를 기기에 가까이 가져다 대세요.',
      duration: 1000000,
    });
    try {
      const created = await addSubcategory({
        name: form.name.trim(),
        description: form.description,
        parentCategoryId: parentCategory.id,
        departmentId: parentCategory.departmentId,
        nfcUid: null,
        nfcRegistered: false,
        storageLocation: form.storageLocation,
        defaultExpiryDays: form.defaultExpiryDays,
        expiryDate: form.expiryDate,
        colorLabel: form.colorLabel,
      });

      if (!created) {
        toast({
          title: '세부 스토리지 생성 실패',
          description: '세부 스토리지를 생성하지 못해 NFC를 등록할 수 없습니다.',
          variant: 'destructive',
        });
        return;
      }

      const uid = await readNFCUid();
      scanToast.dismiss();

      // 이 UID가 이미 등록된 태그인지 확인
      const existingSub = await findSubcategoryByNfcUid(uid);

      if (existingSub) {
        // 이미 등록된 태그 → 확인 다이얼로그 띄우기
        setPendingNfcUid(uid);
        setPendingNfcSubcategoryId(created.id);
        setExistingNfcSubcategory({ id: existingSub.id, name: existingSub.name });
        setNfcConfirmDialogOpen(true);
        setIsSaving(false);
        return;
      }

      // 등록된 적 없는 태그 → 바로 등록 진행
      await proceedNfcRegistration(uid, created.id);

      setAddDialogOpen(false);
      setForm({
        name: '',
        description: '',
        storageLocation: '',
        managementNumber: '',
        defaultExpiryDays: null,
        expiryDate: null,
        colorLabel: null,
      });
    } catch (error: any) {
      scanToast.dismiss();
      console.error('세부 스토리지 생성 및 NFC 등록 실패:', error);
      toast({
        title: 'NFC 등록 실패',
        description:
          error?.message || '세부 스토리지 생성 또는 NFC 등록 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
      setNfcMode('idle'); // 에러 시 모드 초기화
    } finally {
      setIsSaving(false);
    }
  };

  const proceedNfcRegistration = async (uid: string, subcategoryId: string) => {
    try {
      const targetSub = subcategories.find((s) => s.id === subcategoryId);

      // 기존에 이 UID를 쓰던 모든 세부 스토리지에서 NFC 정보 해제
      await clearNfcByUid(uid, subcategoryId);

      // NFC 태그에 세부 스토리지용 URL을 쓴다
      const subName = targetSub?.name || subcategoryId;
      await writeNFCUrl(subcategoryId, subName);

      // 세부 스토리지 테이블에 UID 및 등록 여부 반영
      await registerNfcTag(subcategoryId, uid);

      toast({
        title: 'NFC 등록 완료',
        description: 'NFC에 세부 스토리지가 등록되었습니다.',
      });

      // 상태 초기화
      setPendingNfcUid(null);
      setPendingNfcSubcategoryId(null);
      setExistingNfcSubcategory(null);
      setNfcConfirmDialogOpen(false);
      setNfcMode('idle'); // NFC 등록 완료 후 모드 초기화
    } catch (error: any) {
      console.error('NFC 등록 실패:', error);
      toast({
        title: 'NFC 등록 실패',
        description:
          error?.message || 'NFC 태그를 등록하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
      setNfcMode('idle'); // 에러 시 모드 초기화
    }
  };

  const handleNfcConfirmYes = async () => {
    if (!pendingNfcUid || !pendingNfcSubcategoryId) return;
    await proceedNfcRegistration(pendingNfcUid, pendingNfcSubcategoryId);
    setAddDialogOpen(false);
    setForm({
      name: '',
      description: '',
      storageLocation: '',
      managementNumber: '',
      defaultExpiryDays: null,
      expiryDate: null,
      colorLabel: null,
    });
  };

  const handleNfcConfirmNo = () => {
    setPendingNfcUid(null);
    setPendingNfcSubcategoryId(null);
    setExistingNfcSubcategory(null);
    setNfcConfirmDialogOpen(false);
    setNfcMode('idle'); // 취소 시 모드 초기화
  };

  const handleOpenEditDialog = () => {
    if (!parentCategory) return;
    setEditName(parentCategory.name);
    setEditDescription(parentCategory.description || '');
    setEditNameError('');
    setIsEditDialogOpen(true);
  };

  const handleSaveParentCategory = async () => {
    if (!parentCategory) return;

    const name = editName.trim();
    const description = editDescription.trim();

    if (!name) {
      setEditNameError('대분류 이름을 입력하세요');
      return;
    }
    setEditNameError('');

    setIsSavingEdit(true);
    try {
      const { error } = await supabase
        .from('categories')
        .update({
          name,
          description: description || null,
        })
        .eq('id', parentCategory.id);

      if (error) throw error;

      await fetchParentCategories();

      toast({
        title: '수정 완료',
        description: '대분류 정보가 수정되었습니다.',
      });

      setIsEditDialogOpen(false);
    } catch (err) {
      console.error('대분류 수정 실패:', err);
      toast({
        title: '수정 실패',
        description: '대분류 정보를 수정하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDeleteParentCategory = async () => {
    if (!parentCategory) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', parentCategory.id);

      if (error) throw error;

      await fetchParentCategories();

      toast({
        title: '삭제 완료',
        description: '대분류가 삭제되었습니다.',
      });

      setIsDeleteDialogOpen(false);
      navigate(-1);
    } catch (err) {
      console.error('대분류 삭제 실패:', err);
      toast({
        title: '삭제 실패',
        description: '대분류를 삭제하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
      setIsDeleting(false);
    }
  };

  // 세부 스토리지 수정/삭제 핸들러
  const handleOpenSubEditDialog = (sub: any) => {
    setEditingSubcategory(sub);
    setSubEditForm({
      name: sub.name || '',
      description: sub.description || '',
      storageLocation: sub.storageLocation || '',
      managementNumber: sub.managementNumber || '',
      defaultExpiryDays: sub.defaultExpiryDays || null,
      expiryDate: sub.expiryDate || null,
      colorLabel: sub.colorLabel || null,
    });
    setSubEditNameError('');
    setSubEditDialogOpen(true);
  };

  const handleCloseSubEditDialog = () => {
    setSubEditDialogOpen(false);
    setEditingSubcategory(null);
    setSubEditNameError('');
  };

  const handleSaveSubcategory = async () => {
    if (!editingSubcategory) return;

    const trimmedName = subEditForm.name.trim();
    if (!trimmedName) {
      setSubEditNameError('이름을 입력하세요');
      return;
    }

    setIsSavingSubEdit(true);
    setSubEditNameError('');

    try {
      await updateSubcategory(editingSubcategory.id, {
        name: trimmedName,
        description: subEditForm.description,
        storageLocation: subEditForm.storageLocation,
        managementNumber: subEditForm.managementNumber,
        defaultExpiryDays: subEditForm.defaultExpiryDays,
        expiryDate: subEditForm.expiryDate,
        colorLabel: subEditForm.colorLabel,
      });

      toast({
        title: '수정 완료',
        description: '세부 스토리지가 성공적으로 수정되었습니다.',
      });

      handleCloseSubEditDialog();
    } catch (error) {
      console.error('세부 스토리지 수정 실패:', error);
      toast({
        title: '수정 실패',
        description: '세부 스토리지를 수정하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingSubEdit(false);
    }
  };

  const handleOpenSubDeleteDialog = (sub: any) => {
    setDeletingSubcategory(sub);
    setSubDeleteDialogOpen(true);
  };

  const handleConfirmDeleteSubcategory = async () => {
    if (!deletingSubcategory) return;

    setIsDeletingSubcategory(true);
    try {
      await deleteSubcategory(deletingSubcategory.id);

      toast({
        title: '삭제 완료',
        description: '세부 스토리지가 삭제되었습니다.',
      });

      setSubDeleteDialogOpen(false);
      setDeletingSubcategory(null);
    } catch (error) {
      console.error('세부 스토리지 삭제 실패:', error);
      toast({
        title: '삭제 실패',
        description: '세부 스토리지를 삭제하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsDeletingSubcategory(false);
    }
  };

  if (!parentCategoryId) {
    return null;
  }

  if (!parentCategory) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <BackButton />
          <p className="text-slate-500">대분류를 찾을 수 없습니다.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <DocumentBreadcrumb
            items={(() => {
              const isAdmin = window.location.pathname.startsWith('/admin');
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
                  label: parentCategory.name,
                  isCurrentPage: true,
                },
              ];
            })()}
            className="mb-2"
          />

          <BackButton className="mb-4" />

          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">{parentCategory.name}</h1>
              <p className="text-slate-500 mt-1">
                {parentCategory.description || '설명이 등록되어 있지 않습니다.'}
              </p>
              {department && (
                <p className="text-sm text-slate-500 mt-1">
                  부서: {department.name} ({department.code})
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleOpenEditDialog}
              >
                <img src={penIcon} alt="수정" className="w-full h-full p-1.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-red-500 hover:text-red-600 hover:border-red-500"
              >
                <img src={binIcon} alt="삭제" className="w-full h-full p-1.5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">세부 스토리지 수</p>
              <p className="text-2xl font-bold mt-2">{childSubcategories.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">문서 수</p>
              <p className="text-2xl font-bold mt-2">{parentDocumentsCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">NFC 등록 세부 스토리지</p>
              <p className="text-2xl font-bold mt-2">
                {childSubcategories.filter((s) => s.nfcRegistered).length}개
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>세부 스토리지</CardTitle>
              <CardDescription className="mt-1">
                이 대분류에 속한 세부 스토리지 목록입니다.
              </CardDescription>
            </div>
            <Button 
              onClick={() => setAddDialogOpen(true)}
              className="hidden md:inline-flex"
            >
              <Plus className="h-4 w-4 mr-2" />
              세부 스토리지 추가
            </Button>
          </CardHeader>
          {/* 모바일용 세부 스토리지 추가 버튼 */}
          <div className="md:hidden px-6 pb-4">
            <Button 
              onClick={() => setAddDialogOpen(true)}
              className="w-full"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              세부 스토리지 추가
            </Button>
          </div>
          <CardContent>
            {childSubcategories.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                등록된 세부 스토리지가 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {childSubcategories.map((sub) => {
                  const isAdmin = window.location.pathname.startsWith('/admin');
                  const basePath = isAdmin ? '/admin' : '/team';
                  const expiryStatus = getExpiryStatus(sub.expiryDate || null);
                  const isExpired = expiryStatus.status === 'expired';

                  const handleClick = () => {
                    if (isExpired) {
                      setExpiredDialogOpen(true);
                      setExpiredSubcategory(sub);
                    } else {
                      navigate(
                        `${basePath}/parent-category/${parentCategory.id}/subcategory/${sub.id}`
                      );
                    }
                  };

                  return (
                  <Card
                    key={sub.id}
                    className={cn(
                      "hover:shadow-lg transition-shadow cursor-pointer flex flex-col",
                      expiryStatus.status === 'expired' && "opacity-50 bg-gray-100 border-gray-300",
                      expiryStatus.status === 'warning_7' && "border-orange-300 bg-orange-50",
                      expiryStatus.status === 'warning_30' && "border-yellow-300 bg-yellow-50"
                    )}
                  >
                    <div className="flex flex-col h-full" onClick={handleClick}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <CardTitle className="text-lg truncate">{sub.name}</CardTitle>
                            <CardDescription className="mt-1 truncate">
                              {sub.description || '설명이 없습니다.'}
                            </CardDescription>
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            <div className="flex items-center gap-2">
                              {sub.nfcRegistered && (
                                <Badge variant="outline">
                                  <Smartphone className="h-3 w-3 mr-1" />
                                  NFC
                                </Badge>
                              )}
                              <ColorLabelBadge colorLabel={sub.colorLabel} />
                            </div>
                            {expiryStatus.label && (
                              <Badge
                                variant={
                                  expiryStatus.status === 'expired' ? 'destructive' :
                                  expiryStatus.status === 'warning_7' ? 'default' : 'secondary'
                                }
                                className={cn(
                                  expiryStatus.status === 'warning_7' && "bg-orange-500 text-white",
                                  expiryStatus.status === 'warning_30' && "bg-yellow-500 text-white"
                                )}
                              >
                                {expiryStatus.label}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex flex-col justify-between flex-1">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">부서</span>
                            <span className="font-medium">
                              {department?.name ?? sub.departmentId}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">대분류</span>
                            <span className="font-medium">{parentCategory.name}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">문서 수</span>
                            <span className="font-medium">{sub.documentCount}개</span>
                          </div>
                          {sub.storageLocation && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">보관 장소</span>
                              <span className="font-medium text-xs">
                                {sub.storageLocation}
                              </span>
                            </div>
                          )}
                          {sub.managementNumber && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">관리번호</span>
                              <span className="font-medium text-xs">
                                {sub.managementNumber}
                              </span>
                            </div>
                          )}
                          {sub.expiryDate ? (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">보관 만료일</span>
                              <span className="font-medium">
                                {format(new Date(sub.expiryDate), 'yyyy.MM.dd')}
                              </span>
                            </div>
                          ) : sub.defaultExpiryDays ? (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">보관 만료일</span>
                              <span className="font-medium">
                                {format(addDays(new Date(), sub.defaultExpiryDays), 'yyyy.MM.dd')}
                              </span>
                            </div>
                          ) : null}
                        </div>
                        <div
                          className="flex gap-2 mt-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleOpenSubEditDialog(sub)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            수정
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenSubDeleteDialog(sub)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 세부 스토리지 추가</DialogTitle>
              <DialogDescription>
                {parentCategory.name} 대분류에 속한 세부 스토리지를 생성합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>세부 스토리지 이름</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="예: 채용 서류 보관함"
                />
              </div>
              <div className="space-y-2">
                <Label>설명</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="세부 스토리지 설명"
                />
              </div>
              <div className="space-y-2">
                <Label>컬러라벨(선택)</Label>
                <ColorLabelPicker
                  value={form.colorLabel}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, colorLabel: value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>보관장소(선택)</Label>
                <Input
                  value={form.storageLocation}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      storageLocation: e.target.value,
                    }))
                  }
                  placeholder="예: A동 2층 캐비닛 3"
                  maxLength={30}
                />
              </div>
              <div className="space-y-2">
                <Label>관리번호(선택)</Label>
                <Input
                  value={form.managementNumber}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      managementNumber: e.target.value,
                    }))
                  }
                  placeholder="예: MGT-2024-001"
                  maxLength={30}
                />
              </div>
              <div className="space-y-2">
                <Label>기본 보관 만료일 (선택)</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={form.expiryDate && Math.abs(new Date(form.expiryDate).getTime() - addMonths(new Date(), 3).getTime()) < 86400000 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}
                    onClick={() => {
                      const target = addMonths(new Date(), 3);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const targetDay = new Date(target);
                      targetDay.setHours(0, 0, 0, 0);
                      const diffTime = targetDay.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      setForm((prev) => ({
                        ...prev,
                        defaultExpiryDays: diffDays,
                        expiryDate: target.toISOString(),
                      }));
                    }}
                  >
                    3개월
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={form.expiryDate && Math.abs(new Date(form.expiryDate).getTime() - addYears(new Date(), 1).getTime()) < 86400000 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}
                    onClick={() => {
                      const target = addYears(new Date(), 1);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const targetDay = new Date(target);
                      targetDay.setHours(0, 0, 0, 0);
                      const diffTime = targetDay.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      setForm((prev) => ({
                        ...prev,
                        defaultExpiryDays: diffDays,
                        expiryDate: target.toISOString(),
                      }));
                    }}
                  >
                    1년
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={form.expiryDate && Math.abs(new Date(form.expiryDate).getTime() - addYears(new Date(), 3).getTime()) < 86400000 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}
                    onClick={() => {
                      const target = addYears(new Date(), 3);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const targetDay = new Date(target);
                      targetDay.setHours(0, 0, 0, 0);
                      const diffTime = targetDay.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      setForm((prev) => ({
                        ...prev,
                        defaultExpiryDays: diffDays,
                        expiryDate: target.toISOString(),
                      }));
                    }}
                  >
                    3년
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={form.expiryDate && Math.abs(new Date(form.expiryDate).getTime() - addYears(new Date(), 5).getTime()) < 86400000 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}
                    onClick={() => {
                      const target = addYears(new Date(), 5);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const targetDay = new Date(target);
                      targetDay.setHours(0, 0, 0, 0);
                      const diffTime = targetDay.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      setForm((prev) => ({
                        ...prev,
                        defaultExpiryDays: diffDays,
                        expiryDate: target.toISOString(),
                      }));
                    }}
                  >
                    5년
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={form.expiryDate && Math.abs(new Date(form.expiryDate).getTime() - addYears(new Date(), 7).getTime()) < 86400000 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}
                    onClick={() => {
                      const target = addYears(new Date(), 7);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const targetDay = new Date(target);
                      targetDay.setHours(0, 0, 0, 0);
                      const diffTime = targetDay.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      setForm((prev) => ({
                        ...prev,
                        defaultExpiryDays: diffDays,
                        expiryDate: target.toISOString(),
                      }));
                    }}
                  >
                    7년
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={form.expiryDate && Math.abs(new Date(form.expiryDate).getTime() - addYears(new Date(), 10).getTime()) < 86400000 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}
                    onClick={() => {
                      const target = addYears(new Date(), 10);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const targetDay = new Date(target);
                      targetDay.setHours(0, 0, 0, 0);
                      const diffTime = targetDay.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      setForm((prev) => ({
                        ...prev,
                        defaultExpiryDays: diffDays,
                        expiryDate: target.toISOString(),
                      }));
                    }}
                  >
                    10년
                  </Button>
                  {form.defaultExpiryDays && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          defaultExpiryDays: null,
                          expiryDate: null,
                        }))
                      }
                      className="bg-white text-slate-600 hover:bg-slate-100"
                    >
                      초기화
                    </Button>
                  )}
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !form.expiryDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.expiryDate
                        ? format(new Date(form.expiryDate), 'PPP', { locale: ko })
                        : '달력에서 보관 만료일 선택'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      captionLayout="dropdown"
                      fromYear={2020}
                      toYear={2040}
                      selected={form.expiryDate ? new Date(form.expiryDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const selected = new Date(date);
                          selected.setHours(0, 0, 0, 0);
                          const diffTime = selected.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          setForm((prev) => ({
                            ...prev,
                            defaultExpiryDays: diffDays,
                            expiryDate: date.toISOString(),
                          }));
                        }
                      }}
                      initialFocus
                      className="bg-white"
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-slate-500">
                  보관 만료일을 설정하지 않으면 이 카테고리의 문서는 만료되지 않습니다.
                  {form.expiryDate && ` (${format(new Date(form.expiryDate), 'yyyy년 MM월 dd일', { locale: ko })})`}
                </p>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row">
              <Button
                type="button"
                onClick={handleAddSubcategory}
                variant="outline"
                disabled={isSaving || !form.name.trim()}
              >
                세부 스토리지만 추가
              </Button>
              <Button
                type="button"
                onClick={handleAddSubcategoryWithNfc}
                disabled={isSaving || !form.name.trim()}
                className="flex items-center gap-2"
              >
                <Smartphone className="h-4 w-4" />
                NFC 등록하며 추가
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
                disabled={isSaving}
              >
                취소
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={(open) => {
            setIsDeleteDialogOpen(open);
            if (!open) {
              setIsDeleting(false);
              setDeleteConfirmText('');
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>대분류 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                <p>"{parentCategory.name}" 대분류를 정말 삭제하시겠습니까?</p>
                <p className="mt-1">
                  이 대분류에 속한 세부 스토리지 및 문서에 영향이 있을 수 있습니다.
                </p>
                <p className="mt-3 text-sm font-medium text-red-600">
                  삭제 후에는 되돌릴 수 없습니다. 신중하게 진행하세요.
                </p>
                <div className="mt-4">
                  <p className="text-sm text-slate-600 mb-2">
                    정말 삭제하려면 아래에 <span className="font-bold text-red-600">삭제하겠습니다</span>를 입력하세요.
                  </p>
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="삭제하겠습니다"
                    className="mt-1"
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteParentCategory}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={isDeleting || deleteConfirmText !== '삭제하겠습니다'}
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              setEditNameError('');
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>대분류 정보 수정</DialogTitle>
              <DialogDescription>
                대분류 이름과 설명을 수정합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>대분류 이름</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="예: 채용 문서"
                />
                {editNameError && (
                  <p className="text-xs text-red-500 mt-1">{editNameError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>설명</Label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="대분류 설명을 입력하세요"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isSavingEdit}
              >
                취소
              </Button>
              <Button
                type="button"
                onClick={handleSaveParentCategory}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? '저장 중...' : '저장'}
              </Button>
            </DialogFooter>
          </DialogContent>
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

        {/* 만료된 카테고리 안내 다이얼로그 */}
        <AlertDialog open={expiredDialogOpen} onOpenChange={setExpiredDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>만료된 카테고리</AlertDialogTitle>
              <AlertDialogDescription>
                {expiredSubcategory && (
                  <>
                    <p className="mb-2">
                      "{expiredSubcategory.name}" 카테고리는{' '}
                      {expiredSubcategory.expiryDate && 
                        format(new Date(expiredSubcategory.expiryDate), 'yyyy년 MM월 dd일', { locale: ko })}
                      에 만료되었습니다.
                    </p>
                    <p>
                      내부 문서 ({expiredSubcategory.documentCount}개)에 더 이상 접근할 수 없습니다.
                    </p>
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setExpiredDialogOpen(false)}>
                확인
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 세부 스토리지 수정 다이얼로그 */}
        <Dialog
          open={subEditDialogOpen}
          onOpenChange={(open) => {
            if (!open) handleCloseSubEditDialog();
          }}
        >
          <DialogContent className="max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>세부 스토리지 수정</DialogTitle>
              <DialogDescription>
                선택한 세부 스토리지 정보를 수정합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 overflow-y-auto flex-1 px-4">
              <div className="space-y-2">
                <Label>세부 스토리지 이름</Label>
                <Input
                  value={subEditForm.name}
                  onChange={(e) =>
                    setSubEditForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="예: 채용 서류 보관함"
                />
                {subEditNameError && (
                  <p className="text-xs text-red-500 mt-1">{subEditNameError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>설명</Label>
                <Textarea
                  value={subEditForm.description}
                  onChange={(e) =>
                    setSubEditForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="세부 스토리지 설명"
                />
              </div>
              <div className="space-y-2">
                <Label>컬러라벨(선택)</Label>
                <ColorLabelPicker
                  value={subEditForm.colorLabel}
                  onChange={(value) =>
                    setSubEditForm((prev) => ({ ...prev, colorLabel: value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>보관장소(선택)</Label>
                <Input
                  value={subEditForm.storageLocation}
                  onChange={(e) =>
                    setSubEditForm((prev) => ({
                      ...prev,
                      storageLocation: e.target.value,
                    }))
                  }
                  placeholder="예: A동 2층 캐비닛 3"
                  maxLength={30}
                />
              </div>
              <div className="space-y-2">
                <Label>관리번호(선택)</Label>
                <Input
                  value={subEditForm.managementNumber}
                  onChange={(e) =>
                    setSubEditForm((prev) => ({
                      ...prev,
                      managementNumber: e.target.value,
                    }))
                  }
                  placeholder="예: MGT-2024-001"
                  maxLength={30}
                />
              </div>
              <div className="space-y-2">
                <Label>기본 보관 만료일 (선택)</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={subEditForm.expiryDate && Math.abs(new Date(subEditForm.expiryDate).getTime() - addMonths(new Date(), 3).getTime()) < 86400000 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}
                    onClick={() => {
                      const target = addMonths(new Date(), 3);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const targetDay = new Date(target);
                      targetDay.setHours(0, 0, 0, 0);
                      const diffTime = targetDay.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      setSubEditForm((prev) => ({
                        ...prev,
                        defaultExpiryDays: diffDays,
                        expiryDate: target.toISOString(),
                      }));
                    }}
                  >
                    3개월
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={subEditForm.expiryDate && Math.abs(new Date(subEditForm.expiryDate).getTime() - addYears(new Date(), 1).getTime()) < 86400000 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}
                    onClick={() => {
                      const target = addYears(new Date(), 1);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const targetDay = new Date(target);
                      targetDay.setHours(0, 0, 0, 0);
                      const diffTime = targetDay.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      setSubEditForm((prev) => ({
                        ...prev,
                        defaultExpiryDays: diffDays,
                        expiryDate: target.toISOString(),
                      }));
                    }}
                  >
                    1년
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={subEditForm.expiryDate && Math.abs(new Date(subEditForm.expiryDate).getTime() - addYears(new Date(), 3).getTime()) < 86400000 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}
                    onClick={() => {
                      const target = addYears(new Date(), 3);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const targetDay = new Date(target);
                      targetDay.setHours(0, 0, 0, 0);
                      const diffTime = targetDay.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      setSubEditForm((prev) => ({
                        ...prev,
                        defaultExpiryDays: diffDays,
                        expiryDate: target.toISOString(),
                      }));
                    }}
                  >
                    3년
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={subEditForm.expiryDate && Math.abs(new Date(subEditForm.expiryDate).getTime() - addYears(new Date(), 5).getTime()) < 86400000 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}
                    onClick={() => {
                      const target = addYears(new Date(), 5);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const targetDay = new Date(target);
                      targetDay.setHours(0, 0, 0, 0);
                      const diffTime = targetDay.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      setSubEditForm((prev) => ({
                        ...prev,
                        defaultExpiryDays: diffDays,
                        expiryDate: target.toISOString(),
                      }));
                    }}
                  >
                    5년
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={subEditForm.expiryDate && Math.abs(new Date(subEditForm.expiryDate).getTime() - addYears(new Date(), 7).getTime()) < 86400000 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}
                    onClick={() => {
                      const target = addYears(new Date(), 7);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const targetDay = new Date(target);
                      targetDay.setHours(0, 0, 0, 0);
                      const diffTime = targetDay.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      setSubEditForm((prev) => ({
                        ...prev,
                        defaultExpiryDays: diffDays,
                        expiryDate: target.toISOString(),
                      }));
                    }}
                  >
                    7년
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={subEditForm.expiryDate && Math.abs(new Date(subEditForm.expiryDate).getTime() - addYears(new Date(), 10).getTime()) < 86400000 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}
                    onClick={() => {
                      const target = addYears(new Date(), 10);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const targetDay = new Date(target);
                      targetDay.setHours(0, 0, 0, 0);
                      const diffTime = targetDay.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      setSubEditForm((prev) => ({
                        ...prev,
                        defaultExpiryDays: diffDays,
                        expiryDate: target.toISOString(),
                      }));
                    }}
                  >
                    10년
                  </Button>
                  {subEditForm.defaultExpiryDays && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSubEditForm((prev) => ({
                          ...prev,
                          defaultExpiryDays: null,
                          expiryDate: null,
                        }))
                      }
                      className="bg-white text-slate-600 hover:bg-slate-100"
                    >
                      초기화
                    </Button>
                  )}
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !subEditForm.expiryDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {subEditForm.expiryDate
                        ? format(new Date(subEditForm.expiryDate), 'PPP', { locale: ko })
                        : '달력에서 보관 만료일 선택'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      captionLayout="dropdown"
                      fromYear={2020}
                      toYear={2040}
                      selected={subEditForm.expiryDate ? new Date(subEditForm.expiryDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const diffTime = date.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          setSubEditForm((prev) => ({
                            ...prev,
                            defaultExpiryDays: diffDays,
                            expiryDate: date.toISOString(),
                          }));
                        }
                      }}
                      initialFocus
                      className="bg-white"
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-slate-500">
                  보관 만료일을 설정하지 않으면 이 카테고리의 문서는 만료되지 않습니다.
                  {subEditForm.expiryDate && ` (${format(new Date(subEditForm.expiryDate), 'yyyy년 MM월 dd일', { locale: ko })})`}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseSubEditDialog}
                disabled={isSavingSubEdit}
              >
                취소
              </Button>
              <Button
                type="button"
                onClick={handleSaveSubcategory}
                disabled={isSavingSubEdit}
              >
                {isSavingSubEdit ? '저장 중...' : '저장'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 세부 스토리지 삭제 확인 다이얼로그 */}
        <AlertDialog open={subDeleteDialogOpen} onOpenChange={setSubDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>세부 스토리지 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                {deletingSubcategory && (
                  <>
                    <p className="mb-2">
                      "{deletingSubcategory.name}" 세부 스토리지를 삭제하시겠습니까?
                    </p>
                    <p className="text-red-500">
                      이 작업은 되돌릴 수 없으며, 포함된 모든 문서({deletingSubcategory.documentCount}개)도 함께 삭제됩니다.
                    </p>
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingSubcategory}>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteSubcategory}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={isDeletingSubcategory}
              >
                {isDeletingSubcategory ? '삭제 중...' : '삭제'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
