import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useAuthStore } from '@/store/authStore';
import { checkUserAccess, hasPermission, type Role, type Action } from '@/lib/permissions';
import { ColorLabelPicker, ColorLabelBadge } from '@/components/ColorLabelPicker';
import { Edit, Trash2, Archive } from 'lucide-react';
import { V1ModalHeader, V1ModalBody, V1ModalFooter, V1 } from '@/components/ui/v1-components';
import i18n from '@/lib/i18n';

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
    return { status: 'expired', daysLeft: diffDays, label: i18n.t('documentMgmt.expired') };
  } else if (diffDays <= 7) {
    return { status: 'warning_7', daysLeft: diffDays, label: i18n.t('documentMgmt.expiresInDays', { days: diffDays }) };
  } else if (diffDays <= 30) {
    return { status: 'warning_30', daysLeft: diffDays, label: i18n.t('documentMgmt.expiresInDays', { days: diffDays }) };
  } else {
    return { status: 'normal', daysLeft: diffDays, label: null };
  }
}

export function ParentCategoryDetail() {
  const { t } = useTranslation();
  const { parentCategoryId } = useParams<{ parentCategoryId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';
  
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

  // 권한 상태
  const [departmentRole, setDepartmentRole] = useState<Role>('none');

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

  // 권한 조회
  useEffect(() => {
    const fetchRole = async () => {
      if (!user?.id || !parentCategory?.departmentId) return;
      if (isAdmin) {
        setDepartmentRole('manager');
        return;
      }
      const { role } = await checkUserAccess(user.id, parentCategory.departmentId, user.departmentId);
      setDepartmentRole(role);
    };
    fetchRole();
  }, [user?.id, user?.departmentId, parentCategory?.departmentId, isAdmin]);

  // 권한 체크 헬퍼
  const canDo = (action: Action): boolean => {
    if (isAdmin) return true;
    return hasPermission(departmentRole, action);
  };

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
        title: t('documentMgmt.subcategoryAdded'),
        description: t('documentMgmt.subcategoryAddedDesc'),
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
      title: t('documentMgmt.nfcWaiting'),
      description: t('documentMgmt.nfcWaitingDesc'),
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
          title: t('documentMgmt.subcategoryCreateFailed'),
          description: t('documentMgmt.subcategoryCreateFailedNfc'),
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
        title: t('documentMgmt.nfcRegFailed'),
        description:
          error?.message || t('documentMgmt.nfcRegFailedDesc'),
        variant: 'destructive',
      });
      setNfcMode('idle');
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
        title: t('documentMgmt.nfcRegComplete'),
        description: t('documentMgmt.nfcRegCompleteDesc'),
      });

      await fetchSubcategories();

      // 상태 초기화
      setPendingNfcUid(null);
      setPendingNfcSubcategoryId(null);
      setExistingNfcSubcategory(null);
      setNfcConfirmDialogOpen(false);
      setNfcMode('idle'); // NFC 등록 완료 후 모드 초기화
    } catch (error: any) {
      console.error('NFC 등록 실패:', error);
      toast({
        title: t('documentMgmt.nfcRegFailed'),
        description:
          error?.message || t('documentMgmt.nfcRegErrorDesc'),
        variant: 'destructive',
      });
      setNfcMode('idle');
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
      setEditNameError(t('parentCategoryDetail.enterParentCategoryName'));
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
        title: t('documentMgmt.editComplete'),
        description: t('parentCategoryDetail.parentCategoryEdited'),
      });

      setIsEditDialogOpen(false);
    } catch (err) {
      console.error('대분류 수정 실패:', err);
      toast({
        title: t('documentMgmt.editFailed'),
        description: t('parentCategoryDetail.parentCategoryEditFailed'),
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
        title: t('documentMgmt.deleteComplete'),
        description: t('parentCategoryDetail.parentCategoryDeleted'),
      });

      setIsDeleteDialogOpen(false);
      navigate(-1);
    } catch (err) {
      console.error('대분류 삭제 실패:', err);
      toast({
        title: t('documentMgmt.deleteFailed'),
        description: t('parentCategoryDetail.parentCategoryDeleteFailed'),
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
      setSubEditNameError(t('documentMgmt.enterName'));
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
        title: t('documentMgmt.editComplete'),
        description: t('documentMgmt.subcategoryEditedDesc'),
      });

      handleCloseSubEditDialog();
    } catch (error) {
      console.error('세부 스토리지 수정 실패:', error);
      toast({
        title: t('documentMgmt.editFailed'),
        description: t('documentMgmt.subcategoryEditFailedDesc'),
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
        title: t('documentMgmt.deleteComplete'),
        description: t('documentMgmt.subcategoryDeletedDesc'),
      });

      setSubDeleteDialogOpen(false);
      setDeletingSubcategory(null);
    } catch (error) {
      console.error('세부 스토리지 삭제 실패:', error);
      toast({
        title: t('documentMgmt.deleteFailed'),
        description: t('documentMgmt.subcategoryDeleteFailedDesc'),
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
          <p className="text-slate-500">{t('parentCategoryDetail.notFound')}</p>
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
                  label: department?.name || t('common.department'),
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
              <h1 className="text-[28px] sm:text-[30px] font-bold tracking-tight text-slate-900">{parentCategory.name}</h1>
              <p className="text-slate-500 mt-1">
                {parentCategory.description || t('subcategoryDetail.noDescription')}
              </p>
              {department && (
                <p className="text-sm text-slate-500 mt-1">
                  {t('common.department')}: {department.name} ({department.code})
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleOpenEditDialog}
              >
                <img src={penIcon} alt={t('common.edit')} className="w-full h-full p-1.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-red-500 hover:text-red-600 hover:border-red-500"
              >
                <img src={binIcon} alt={t('common.delete')} className="w-full h-full p-1.5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">{t('parentCategoryDetail.subcategoryCount')}</p>
              <p className="text-2xl font-bold mt-2">{childSubcategories.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">{t('subcategoryDetail.docCount')}</p>
              <p className="text-2xl font-bold mt-2">{parentDocumentsCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">{t('parentCategoryDetail.nfcRegisteredSubs')}</p>
              <p className="text-2xl font-bold mt-2">
                {childSubcategories.filter((s) => s.nfcRegistered).length}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>{t('parentCategoryDetail.subcategories')}</CardTitle>
              <CardDescription className="mt-1">
                {t('parentCategoryDetail.subcategoryListDesc')}
              </CardDescription>
            </div>
            <Button 
              onClick={() => setAddDialogOpen(true)}
              className="hidden md:inline-flex"
              disabled={!canDo('write')}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('parentCategoryDetail.addSubcategory')}
            </Button>
          </CardHeader>
          {/* 모바일용 세부 스토리지 추가 버튼 */}
          <div className="md:hidden px-6 pb-4">
            <Button 
              onClick={() => setAddDialogOpen(true)}
              className="w-full"
              variant="outline"
              disabled={!canDo('write')}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('parentCategoryDetail.addSubcategory')}
            </Button>
          </div>
          <CardContent>
            {childSubcategories.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                {t('parentCategoryDetail.noSubcategories')}
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
                              {sub.description || t('parentCategoryDetail.noDescription')}
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
                            <span className="text-slate-500">{t('common.department')}</span>
                            <span className="font-medium">
                              {department?.name ?? sub.departmentId}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">{t('subcategoryDetail.parentCategory')}</span>
                            <span className="font-medium">{parentCategory.name}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">{t('subcategoryDetail.docCount')}</span>
                            <span className="font-medium">{sub.documentCount}</span>
                          </div>
                          {sub.storageLocation && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">{t('subcategoryDetail.storageLocation')}</span>
                              <span className="font-medium text-xs">
                                {sub.storageLocation}
                              </span>
                            </div>
                          )}
                          {sub.managementNumber && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">{t('subcategoryDetail.managementNumber')}</span>
                              <span className="font-medium text-xs">
                                {sub.managementNumber}
                              </span>
                            </div>
                          )}
                          {sub.expiryDate ? (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">{t('parentCategoryDetail.expiryDate')}</span>
                              <span className="font-medium">
                                {format(new Date(sub.expiryDate), 'yyyy.MM.dd')}
                              </span>
                            </div>
                          ) : sub.defaultExpiryDays ? (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">{t('parentCategoryDetail.expiryDate')}</span>
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
                            disabled={!canDo('write')}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            {t('common.edit')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenSubDeleteDialog(sub)}
                            disabled={!canDo('delete')}
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
          <DialogContent variant="v1" className="max-w-[560px] max-h-[90vh] flex flex-col overflow-hidden" hideClose>
            <V1ModalHeader icon={Archive} title={t('parentCategoryDetail.addSubcategoryTitle')} sub={t('parentCategoryDetail.addSubcategoryDesc', { name: parentCategory.name })} />
            <V1ModalBody className="flex-1 overflow-y-auto">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-900">{t('parentCategoryDetail.subcategoryName')}</label>
                <Input
                  className="h-[38px] rounded-lg border-[#e5e7eb] text-[14px]"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder={t('parentCategoryDetail.subcategoryNamePlaceholder')}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-900">{t('parentCategoryDetail.description')} <span className="text-slate-400 font-normal">({t('common.optional', { defaultValue: '선택' })})</span></label>
                <Textarea
                  className="min-h-[64px] rounded-lg border-[#e5e7eb] text-[14px] resize-y"
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder={t('parentCategoryDetail.descriptionPlaceholder')}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-900">{t('parentCategoryDetail.colorLabel')} <span className="text-slate-400 font-normal">({t('common.optional', { defaultValue: '선택' })})</span></label>
                <ColorLabelPicker
                  value={form.colorLabel}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, colorLabel: value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-slate-900">{t('parentCategoryDetail.storageLocationOpt')}</label>
                  <Input
                    className="h-[38px] rounded-lg border-[#e5e7eb] text-[14px]"
                    value={form.storageLocation}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        storageLocation: e.target.value,
                      }))
                    }
                    placeholder={t('parentCategoryDetail.storageLocationPlaceholder')}
                    maxLength={30}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-slate-900">{t('parentCategoryDetail.managementNumberOpt')}</label>
                  <Input
                    className="h-[38px] rounded-lg border-[#e5e7eb] text-[14px] font-mono"
                    value={form.managementNumber}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        managementNumber: e.target.value,
                      }))
                    }
                    placeholder={t('parentCategoryDetail.managementNumberPlaceholder')}
                    maxLength={30}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-900">{t('parentCategoryDetail.defaultExpiryLabel')} <span className="text-slate-400 font-normal">({t('common.optional', { defaultValue: '선택' })})</span></label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: t('parentCategoryDetail.months3'), getValue: () => addMonths(new Date(), 3) },
                    { label: t('parentCategoryDetail.year1'), getValue: () => addYears(new Date(), 1) },
                    { label: t('parentCategoryDetail.years3'), getValue: () => addYears(new Date(), 3) },
                    { label: t('parentCategoryDetail.years5'), getValue: () => addYears(new Date(), 5) },
                    { label: t('parentCategoryDetail.years7'), getValue: () => addYears(new Date(), 7) },
                    { label: t('parentCategoryDetail.years10'), getValue: () => addYears(new Date(), 10) },
                  ].map((opt) => {
                    const target = opt.getValue();
                    const isActive = form.expiryDate && Math.abs(new Date(form.expiryDate).getTime() - target.getTime()) < 86400000;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        className={`px-3 py-[7px] rounded-lg text-[12.5px] font-medium border cursor-pointer transition-colors ${
                          isActive
                            ? 'border-[#2563eb] bg-[#eff6ff] text-[#1e40af]'
                            : 'border-[#e5e7eb] bg-white text-slate-900 hover:bg-slate-50'
                        }`}
                        onClick={() => {
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
                        {opt.label}
                      </button>
                    );
                  })}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={`px-3 py-[7px] rounded-lg text-[12.5px] font-medium border cursor-pointer transition-colors ${
                          form.expiryDate && ![addMonths(new Date(), 3), addYears(new Date(), 1), addYears(new Date(), 3), addYears(new Date(), 5), addYears(new Date(), 7), addYears(new Date(), 10)].some(d => Math.abs(new Date(form.expiryDate!).getTime() - d.getTime()) < 86400000)
                            ? 'border-[#2563eb] bg-[#eff6ff] text-[#1e40af]'
                            : 'border-[#e5e7eb] bg-white text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        {t('parentCategoryDetail.selectExpiryFromCalendar', { defaultValue: '직접 선택' })}
                      </button>
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
                </div>
                {form.expiryDate && (
                  <p className="text-[11.5px] text-slate-500 mt-0.5">
                    {format(new Date(form.expiryDate), 'yyyy년 MM월 dd일', { locale: ko })}
                  </p>
                )}
              </div>
            </V1ModalBody>
            <V1ModalFooter>
              <button
                type="button"
                onClick={() => setAddDialogOpen(false)}
                disabled={isSaving}
                className="h-9 px-4 rounded-[10px] text-[13px] font-semibold border border-[#e5e7eb] bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleAddSubcategory}
                disabled={isSaving || !form.name.trim()}
                className="h-9 px-4 rounded-[10px] text-[13px] font-semibold border border-[#e5e7eb] bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Archive className="h-3.5 w-3.5" />
                {t('parentCategoryDetail.addSubcategoryOnly')}
              </button>
              <button
                type="button"
                onClick={handleAddSubcategoryWithNfc}
                disabled={isSaving || !form.name.trim()}
                className="h-9 px-4 rounded-[10px] text-[13px] font-semibold bg-[#2563eb] text-white hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Smartphone className="h-3.5 w-3.5" />
                {t('parentCategoryDetail.addWithNfc')}
              </button>
            </V1ModalFooter>
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
          <AlertDialogContent className="max-w-[460px] gap-0 p-0 rounded-[16px]">
            <div className="flex items-start gap-3 px-6 pt-5 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: '#ef444415' }}>
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <AlertDialogTitle className="text-[17px] font-semibold tracking-[-0.01em]">{t('parentCategoryDetail.deleteParentCategory')}</AlertDialogTitle>
                <AlertDialogDescription className="text-[13px] text-slate-500 mt-1">
                  {t('documentMgmt.deleteIrreversible')}
                </AlertDialogDescription>
              </div>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-[10px]">
                <div className="text-[13px] text-red-800 font-semibold mb-2">
                  {t('parentCategoryDetail.deleteConfirmMsg', { name: parentCategory.name })}
                </div>
                <div className="text-[12px] text-red-700 leading-relaxed">
                  {t('parentCategoryDetail.deleteImpactWarning')}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[13px] font-medium">
                  {t('parentCategoryDetail.typeToConfirmDelete', { text: '' })}
                  <strong className="text-red-500">{t('parentCategoryDetail.confirmDeleteText')}</strong>
                </Label>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={t('parentCategoryDetail.confirmDeleteText')}
                  className="h-[38px] rounded-lg"
                />
              </div>
            </div>
            <AlertDialogFooter className="flex gap-2 justify-end px-6 py-3.5 border-t border-slate-100 bg-[#fafbfc] rounded-b-[16px]">
              <AlertDialogCancel disabled={isDeleting} className="h-9 rounded-[10px] text-[13px] font-semibold border-[#e5e7eb]">
                {t('common.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteParentCategory}
                className="h-9 rounded-[10px] text-[13px] font-semibold bg-red-100 text-red-800 hover:bg-red-200 border-none"
                disabled={isDeleting || deleteConfirmText !== t('parentCategoryDetail.confirmDeleteText')}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                {isDeleting ? t('documentMgmt.deleting') : t('common.delete')}
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
          <DialogContent variant="v1" className="max-w-[560px]">
            <V1ModalHeader icon={Edit} title={t('parentCategoryDetail.editParentCategory')} sub={t('parentCategoryDetail.editParentCategoryDesc')} />
            <V1ModalBody>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[13px] font-medium">{t('parentCategoryDetail.parentCategoryName')}</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={t('parentCategoryDetail.parentCategoryNamePlaceholder')}
                  className="h-[38px] rounded-lg"
                />
                {editNameError && (
                  <p className="text-xs text-red-500">{editNameError}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[13px] font-medium">{t('parentCategoryDetail.description')}</Label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder={t('parentCategoryDetail.editDescPlaceholder')}
                  className="min-h-[64px] rounded-lg resize-y"
                />
              </div>
            </V1ModalBody>
            <V1ModalFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isSavingEdit}
                className="h-9 rounded-[10px] text-[13px] font-semibold border-[#e5e7eb]"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                onClick={handleSaveParentCategory}
                disabled={isSavingEdit}
                className="h-9 rounded-[10px] text-[13px] font-semibold bg-[#2563eb] hover:bg-[#1d4ed8]"
              >
                {isSavingEdit ? t('common.saving') : t('common.save')}
              </Button>
            </V1ModalFooter>
          </DialogContent>
        </Dialog>

        {/* NFC 재등록 확인 다이얼로그 */}
        <AlertDialog open={nfcConfirmDialogOpen} onOpenChange={setNfcConfirmDialogOpen}>
          <AlertDialogContent className="max-w-[440px] gap-0 p-0 rounded-[16px]">
            <div className="flex items-start gap-3 px-6 pt-5 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: `${V1.blue}15` }}>
                <Smartphone className="h-5 w-5 text-[#2563eb]" />
              </div>
              <div className="flex-1 min-w-0">
                <AlertDialogTitle className="text-[17px] font-semibold tracking-[-0.01em]">{t('documentMgmt.nfcReregister')}</AlertDialogTitle>
                <AlertDialogDescription className="text-[13px] text-slate-500 mt-1">
                  {t('parentCategoryDetail.nfcAlreadyRegistered')}
                </AlertDialogDescription>
              </div>
            </div>
            <div className="px-6 py-5">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-[10px] text-[13px] text-amber-800 leading-relaxed">
                {existingNfcSubcategory && (
                  <span className="block font-semibold mb-1">
                    {t('parentCategoryDetail.currentLink')}: {existingNfcSubcategory.name}
                  </span>
                )}
                <span>{t('parentCategoryDetail.continueQuestion')}</span>
              </div>
            </div>
            <AlertDialogFooter className="flex gap-2 justify-end px-6 py-3.5 border-t border-slate-100 bg-[#fafbfc] rounded-b-[16px]">
              <AlertDialogCancel onClick={handleNfcConfirmNo} className="h-9 rounded-[10px] text-[13px] font-semibold border-[#e5e7eb]">
                {t('common.no')}
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleNfcConfirmYes} className="h-9 rounded-[10px] text-[13px] font-semibold bg-[#2563eb] hover:bg-[#1d4ed8]">
                {t('common.yes')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 만료된 카테고리 안내 다이얼로그 */}
        <AlertDialog open={expiredDialogOpen} onOpenChange={setExpiredDialogOpen}>
          <AlertDialogContent className="max-w-[440px] gap-0 p-0 rounded-[16px]">
            <div className="flex items-start gap-3 px-6 pt-5 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: '#f59e0b15' }}>
                <CalendarIcon className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <AlertDialogTitle className="text-[17px] font-semibold tracking-[-0.01em]">{t('parentCategoryDetail.expiredCategory')}</AlertDialogTitle>
                <AlertDialogDescription className="text-[13px] text-slate-500 mt-1">
                  {expiredSubcategory?.name}
                </AlertDialogDescription>
              </div>
            </div>
            <div className="px-6 py-5">
              {expiredSubcategory && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-[10px] text-[13px] text-amber-800 leading-relaxed">
                  <p className="mb-1.5">
                    {t('parentCategoryDetail.expiredMsg', {
                      name: expiredSubcategory.name,
                      date: expiredSubcategory.expiryDate
                        ? format(new Date(expiredSubcategory.expiryDate), 'PPP', { locale: ko })
                        : ''
                    })}
                  </p>
                  <p className="font-semibold">
                    {t('parentCategoryDetail.noAccessDocs', { count: expiredSubcategory.documentCount })}
                  </p>
                </div>
              )}
            </div>
            <AlertDialogFooter className="flex gap-2 justify-end px-6 py-3.5 border-t border-slate-100 bg-[#fafbfc] rounded-b-[16px]">
              <AlertDialogAction onClick={() => setExpiredDialogOpen(false)} className="h-9 rounded-[10px] text-[13px] font-semibold bg-[#2563eb] hover:bg-[#1d4ed8]">
                {t('common.confirm')}
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
          <DialogContent variant="v1" className="max-w-[560px] max-h-[90vh] flex flex-col overflow-hidden" hideClose>
            <V1ModalHeader icon={Archive} title={t('subcategoryDetail.editSubcategory')} sub={t('documentMgmt.editSubcategoryDesc')} />
            <V1ModalBody className="flex-1 overflow-y-auto">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-900">{t('parentCategoryDetail.subcategoryName')}</label>
                <Input
                  className="h-[38px] rounded-lg border-[#e5e7eb] text-[14px]"
                  value={subEditForm.name}
                  onChange={(e) =>
                    setSubEditForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder={t('parentCategoryDetail.subcategoryNamePlaceholder')}
                />
                {subEditNameError && (
                  <p className="text-[11.5px] text-red-500 mt-0.5">{subEditNameError}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-900">{t('parentCategoryDetail.description')} <span className="text-slate-400 font-normal">({t('common.optional', { defaultValue: '선택' })})</span></label>
                <Textarea
                  className="min-h-[64px] rounded-lg border-[#e5e7eb] text-[14px] resize-y"
                  value={subEditForm.description}
                  onChange={(e) =>
                    setSubEditForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder={t('parentCategoryDetail.descriptionPlaceholder')}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-900">{t('parentCategoryDetail.colorLabel')} <span className="text-slate-400 font-normal">({t('common.optional', { defaultValue: '선택' })})</span></label>
                <ColorLabelPicker
                  value={subEditForm.colorLabel}
                  onChange={(value) =>
                    setSubEditForm((prev) => ({ ...prev, colorLabel: value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-slate-900">{t('parentCategoryDetail.storageLocationOpt')}</label>
                  <Input
                    className="h-[38px] rounded-lg border-[#e5e7eb] text-[14px]"
                    value={subEditForm.storageLocation}
                    onChange={(e) =>
                      setSubEditForm((prev) => ({
                        ...prev,
                        storageLocation: e.target.value,
                      }))
                    }
                    placeholder={t('parentCategoryDetail.storageLocationPlaceholder')}
                    maxLength={30}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-slate-900">{t('parentCategoryDetail.managementNumberOpt')}</label>
                  <Input
                    className="h-[38px] rounded-lg border-[#e5e7eb] text-[14px] font-mono"
                    value={subEditForm.managementNumber}
                    onChange={(e) =>
                      setSubEditForm((prev) => ({
                        ...prev,
                        managementNumber: e.target.value,
                      }))
                    }
                    placeholder={t('parentCategoryDetail.managementNumberPlaceholder')}
                    maxLength={30}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-900">{t('parentCategoryDetail.defaultExpiryLabel')} <span className="text-slate-400 font-normal">({t('common.optional', { defaultValue: '선택' })})</span></label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: t('parentCategoryDetail.months3'), getValue: () => addMonths(new Date(), 3) },
                    { label: t('parentCategoryDetail.year1'), getValue: () => addYears(new Date(), 1) },
                    { label: t('parentCategoryDetail.years3'), getValue: () => addYears(new Date(), 3) },
                    { label: t('parentCategoryDetail.years5'), getValue: () => addYears(new Date(), 5) },
                    { label: t('parentCategoryDetail.years7'), getValue: () => addYears(new Date(), 7) },
                    { label: t('parentCategoryDetail.years10'), getValue: () => addYears(new Date(), 10) },
                  ].map((opt) => {
                    const target = opt.getValue();
                    const isActive = subEditForm.expiryDate && Math.abs(new Date(subEditForm.expiryDate).getTime() - target.getTime()) < 86400000;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        className={`px-3 py-[7px] rounded-lg text-[12.5px] font-medium border cursor-pointer transition-colors ${
                          isActive
                            ? 'border-[#2563eb] bg-[#eff6ff] text-[#1e40af]'
                            : 'border-[#e5e7eb] bg-white text-slate-900 hover:bg-slate-50'
                        }`}
                        onClick={() => {
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
                        {opt.label}
                      </button>
                    );
                  })}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={`px-3 py-[7px] rounded-lg text-[12.5px] font-medium border cursor-pointer transition-colors ${
                          subEditForm.expiryDate && ![addMonths(new Date(), 3), addYears(new Date(), 1), addYears(new Date(), 3), addYears(new Date(), 5), addYears(new Date(), 7), addYears(new Date(), 10)].some(d => Math.abs(new Date(subEditForm.expiryDate!).getTime() - d.getTime()) < 86400000)
                            ? 'border-[#2563eb] bg-[#eff6ff] text-[#1e40af]'
                            : 'border-[#e5e7eb] bg-white text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        {t('parentCategoryDetail.selectExpiryFromCalendar', { defaultValue: '직접 선택' })}
                      </button>
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
                </div>
                {subEditForm.expiryDate && (
                  <p className="text-[11.5px] text-slate-500 mt-0.5">
                    {format(new Date(subEditForm.expiryDate), 'yyyy년 MM월 dd일', { locale: ko })}
                  </p>
                )}
              </div>
            </V1ModalBody>
            <V1ModalFooter>
              <button
                type="button"
                onClick={handleCloseSubEditDialog}
                disabled={isSavingSubEdit}
                className="h-9 px-4 rounded-[10px] text-[13px] font-semibold border border-[#e5e7eb] bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveSubcategory}
                disabled={isSavingSubEdit}
                className="h-9 px-4 rounded-[10px] text-[13px] font-semibold bg-[#2563eb] text-white hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingSubEdit ? t('common.saving') : t('common.save')}
              </button>
            </V1ModalFooter>
          </DialogContent>
        </Dialog>

        {/* 세부 스토리지 삭제 확인 다이얼로그 */}
        <AlertDialog open={subDeleteDialogOpen} onOpenChange={setSubDeleteDialogOpen}>
          <AlertDialogContent className="max-w-[460px] gap-0 p-0 rounded-[16px]">
            <div className="flex items-start gap-3 px-6 pt-5 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: '#ef444415' }}>
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <AlertDialogTitle className="text-[17px] font-semibold tracking-[-0.01em]">{t('parentCategoryDetail.deleteSubcategory')}</AlertDialogTitle>
                <AlertDialogDescription className="text-[13px] text-slate-500 mt-1">
                  {t('documentMgmt.deleteIrreversible')}
                </AlertDialogDescription>
              </div>
            </div>
            <div className="px-6 py-5">
              {deletingSubcategory && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-[10px] text-[13px] leading-relaxed">
                  <div className="text-red-800 font-semibold mb-1">
                    {t('parentCategoryDetail.deleteSubConfirm', { name: deletingSubcategory.name })}
                  </div>
                  <div className="text-red-700 text-[12px]">
                    {t('parentCategoryDetail.deleteSubWarning', { count: deletingSubcategory.documentCount })}
                  </div>
                </div>
              )}
            </div>
            <AlertDialogFooter className="flex gap-2 justify-end px-6 py-3.5 border-t border-slate-100 bg-[#fafbfc] rounded-b-[16px]">
              <AlertDialogCancel disabled={isDeletingSubcategory} className="h-9 rounded-[10px] text-[13px] font-semibold border-[#e5e7eb]">
                {t('common.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteSubcategory}
                className="h-9 rounded-[10px] text-[13px] font-semibold bg-red-100 text-red-800 hover:bg-red-200 border-none"
                disabled={isDeletingSubcategory}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                {isDeletingSubcategory ? t('documentMgmt.deleting') : t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
