import { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Smartphone, CalendarIcon } from 'lucide-react';
import penIcon from '@/assets/pen.svg';
import binIcon from '@/assets/bin.svg';
import { format, addDays, addMonths, addYears } from 'date-fns';
import { ko } from 'date-fns/locale';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import type { Subcategory } from '@/store/documentStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { readNFCUid, writeNFCUrl, setNfcMode } from '@/lib/nfc';
import { toast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { BackButton } from '@/components/BackButton';
import { ColorLabelPicker, ColorLabelBadge } from '@/components/ColorLabelPicker';

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

export function SubcategoryManagement() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';
  
  // Selector 최적화: 상태값은 개별 selector로
  const departments = useDocumentStore((state) => state.departments);
  const parentCategories = useDocumentStore((state) => state.parentCategories);
  const subcategories = useDocumentStore((state) => state.subcategories);
  const isLoading = useDocumentStore((state) => state.isLoading);
  // 함수는 한 번에 가져오기 (참조 안정적)
  const {
    fetchSubcategories,
    addSubcategory,
    deleteSubcategory,
    updateSubcategory,
    registerNfcTag,
    findSubcategoryByNfcUid,
    clearNfcByUid,
  } = useDocumentStore();

  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedParentCategoryId, setSelectedParentCategoryId] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    departmentId: '',
    parentCategoryId: '',
    storageLocation: '',
    managementNumber: '',
    defaultExpiryDays: null as number | null,
    expiryDate: null as string | null,
    colorLabel: null as string | null,
  });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(
    null,
  );
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    storageLocation: '',
    managementNumber: '',
    defaultExpiryDays: null as number | null,
    expiryDate: null as string | null,
    colorLabel: null as string | null,
  });
  const [editNameError, setEditNameError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // NFC 재등록 확인 다이얼로그 상태
  const [nfcConfirmDialogOpen, setNfcConfirmDialogOpen] = useState(false);
  const [pendingNfcUid, setPendingNfcUid] = useState<string | null>(null);
  const [pendingNfcSubcategoryId, setPendingNfcSubcategoryId] = useState<string | null>(null);
  const [existingNfcSubcategory, setExistingNfcSubcategory] = useState<{ id: string; name: string } | null>(null);
  // 팀원용: 권한 있는 부서 ID 목록
  const [accessibleDepartmentIds, setAccessibleDepartmentIds] = useState<string[]>([]);

  // 만료된 카테고리 안내 다이얼로그 상태
  const [expiredDialogOpen, setExpiredDialogOpen] = useState(false);
  const [expiredSubcategory, setExpiredSubcategory] = useState<Subcategory | null>(null);

  // 세부 스토리지 삭제 확인 다이얼로그 상태
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSubcategory, setDeletingSubcategory] = useState<Subcategory | null>(null);
  const [isDeletingSubcategory, setIsDeletingSubcategory] = useState(false);

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    // Zustand actions는 안정적이므로 getState()로 직접 호출
    useDocumentStore.getState().fetchParentCategories();
    useDocumentStore.getState().fetchSubcategories();
  }, []);

  // 팀원용: 권한 있는 부서 목록 조회
  useEffect(() => {
    const fetchAccessibleDepartments = async () => {
      if (isAdmin || !user?.id) {
        // 관리자는 모든 부서 접근 가능
        setAccessibleDepartmentIds(departments.map((d) => d.id));
        return;
      }

      // 1. 소속 부서는 자동 접근 가능
      const ownDeptId = user.departmentId;

      // 2. 추가 권한 부여된 부서 조회 (role이 none이 아닌 경우)
      const { data: permissionData } = await supabase
        .from('user_permissions')
        .select('department_id')
        .eq('user_id', user.id)
        .neq('role', 'none');

      const permDeptIds = permissionData?.map((p: any) => p.department_id) || [];
      const allIds = new Set<string>([
        ...(ownDeptId ? [ownDeptId] : []),
        ...permDeptIds,
      ]);

      setAccessibleDepartmentIds(Array.from(allIds));
    };

    fetchAccessibleDepartments();
  }, [isAdmin, user?.id, user?.departmentId, departments]);

  const filteredParentCategories = useMemo(
    () => {
      // 먼저 권한 있는 부서의 대분류만 필터링
      const accessibleCategories = parentCategories.filter((pc) =>
        accessibleDepartmentIds.includes(pc.departmentId)
      );
      // 그 다음 선택된 부서 필터 적용
      return selectedDepartmentId
        ? accessibleCategories.filter((pc) => pc.departmentId === selectedDepartmentId)
        : accessibleCategories;
    },
    [parentCategories, selectedDepartmentId, accessibleDepartmentIds]
  );

  const filteredParentCategoriesForForm = useMemo(
    () =>
      form.departmentId
        ? parentCategories.filter((pc) => pc.departmentId === form.departmentId)
        : [],
    [parentCategories, form.departmentId]
  );

  const filteredSubcategories = useMemo(
    () =>
      subcategories.filter((sub) => {
        // 먼저 권한 있는 부서의 세부 스토리지만 필터링
        if (!accessibleDepartmentIds.includes(sub.departmentId)) {
          return false;
        }
        if (selectedDepartmentId && sub.departmentId !== selectedDepartmentId) {
          return false;
        }
        if (
          selectedParentCategoryId &&
          sub.parentCategoryId !== selectedParentCategoryId
        ) {
          return false;
        }
        return true;
      }),
    [subcategories, selectedDepartmentId, selectedParentCategoryId, accessibleDepartmentIds]
  );

  // 페이지네이션 계산
  const paginatedSubcategories = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredSubcategories.slice(startIndex, endIndex);
  }, [filteredSubcategories, currentPage]);

  const totalPages = Math.ceil(filteredSubcategories.length / ITEMS_PER_PAGE);
  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, filteredSubcategories.length);

  // 필터 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDepartmentId, selectedParentCategoryId]);

  // useCallback으로 최적화
  const handleDelete = useCallback(async (id: string) => {
    const target = subcategories.find((s) => s.id === id) || null;
    setDeletingSubcategory(target);
    setDeleteDialogOpen(true);
  }, [subcategories]);

  const handleCloseDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false);
    setDeletingSubcategory(null);
    setIsDeletingSubcategory(false);
  }, []);

  const handleConfirmDeleteSubcategory = useCallback(async () => {
    if (!deletingSubcategory?.id) {
      return;
    }

    setIsDeletingSubcategory(true);

    try {
      await deleteSubcategory(deletingSubcategory.id);

      toast({
        title: t('documentMgmt.deleteComplete'),
        description: t('documentMgmt.subcategoryDeletedDesc'),
      });

      handleCloseDeleteDialog();
    } catch (error) {
      console.error('세부 스토리지 삭제 실패:', error);
      toast({
        title: t('documentMgmt.deleteFailed'),
        description: t('documentMgmt.subcategoryDeleteFailedDesc'),
        variant: 'destructive',
      });
      setIsDeletingSubcategory(false);
    }
  }, [deletingSubcategory?.id, deleteSubcategory, handleCloseDeleteDialog]);

  // useCallback으로 최적화
  const handleSubmit = useCallback(async () => {
    if (!form.name.trim() || !form.departmentId || !form.parentCategoryId) {
      return;
    }

    setIsSaving(true);
    try {
      await addSubcategory({
        name: form.name.trim(),
        description: form.description,
        departmentId: form.departmentId,
        parentCategoryId: form.parentCategoryId,
        storageLocation: form.storageLocation,
        nfcRegistered: false,
        nfcUid: null,
        defaultExpiryDays: form.defaultExpiryDays,
        expiryDate: form.expiryDate,
        colorLabel: form.colorLabel,
      });

      setAddDialogOpen(false);
      setForm({
        name: '',
        description: '',
        departmentId: '',
        parentCategoryId: '',
        storageLocation: '',
        managementNumber: '',
        defaultExpiryDays: null,
        expiryDate: null,
        colorLabel: null,
      });

      await fetchSubcategories();
      toast({
        title: t('documentMgmt.subcategoryAdded'),
        description: t('documentMgmt.subcategoryAddedDesc'),
      });
    } catch (error) {
      console.error('세부 스토리지 추가 실패:', error);
    } finally {
      setIsSaving(false);
    }
  }, [form, addSubcategory, fetchSubcategories]);

  const handleSubmitWithNfc = async () => {
    if (!form.name.trim() || !form.departmentId || !form.parentCategoryId) {
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
        departmentId: form.departmentId,
        parentCategoryId: form.parentCategoryId,
        storageLocation: form.storageLocation,
        nfcRegistered: false,
        nfcUid: null,
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
        departmentId: '',
        parentCategoryId: '',
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
      departmentId: '',
      parentCategoryId: '',
      storageLocation: '',
      managementNumber: '',
      defaultExpiryDays: null,
      expiryDate: null,
      colorLabel: null,
    });
  };

  // useCallback으로 최적화
  const handleNfcConfirmNo = useCallback(() => {
    setPendingNfcUid(null);
    setPendingNfcSubcategoryId(null);
    setExistingNfcSubcategory(null);
    setNfcConfirmDialogOpen(false);
    setNfcMode('idle'); // 취소 시 모드 초기화
  }, []);

  const handleOpenEditDialog = (sub: Subcategory) => {
    setEditingSubcategory(sub);
    setEditForm({
      name: sub.name || '',
      description: sub.description || '',
      storageLocation: sub.storageLocation || '',
      managementNumber: sub.managementNumber || '',
      defaultExpiryDays: sub.defaultExpiryDays || null,
      expiryDate: sub.expiryDate || null,
      colorLabel: sub.colorLabel || null,
    });
    setEditNameError('');
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingSubcategory(null);
    setEditNameError('');
  };

  const handleSaveEditSubcategory = async () => {
    if (!editingSubcategory) return;

    const trimmedName = editForm.name.trim();
    if (!trimmedName) {
      setEditNameError(t('documentMgmt.enterName'));
      return;
    }

    setIsSavingEdit(true);
    setEditNameError('');
    try {
      await updateSubcategory(editingSubcategory.id, {
        name: trimmedName,
        description: editForm.description,
        storageLocation: editForm.storageLocation,
        managementNumber: editForm.managementNumber,
        defaultExpiryDays: editForm.defaultExpiryDays,
        expiryDate: editForm.expiryDate,
        colorLabel: editForm.colorLabel,
      });
      await fetchSubcategories();
      setEditDialogOpen(false);
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <BackButton className="mb-4" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('subcategoryMgmt.title')}</h1>
            <p className="text-slate-500 mt-1">
              {t('subcategoryMgmt.subtitle')}
            </p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('parentCategoryDetail.addSubcategory')}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('subcategoryMgmt.filter')}</CardTitle>
            <CardDescription>
              {t('subcategoryMgmt.filterDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">{t('common.department')}</p>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={selectedDepartmentId}
                  onChange={(e) => {
                    setSelectedDepartmentId(e.target.value);
                    setSelectedParentCategoryId('');
                  }}
                >
                  <option value="">{t('subcategoryMgmt.all')}</option>
                  {departments
                    .filter((dept) => accessibleDepartmentIds.includes(dept.id))
                    .map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">{t('subcategoryDetail.parentCategory')}</p>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={selectedParentCategoryId}
                  onChange={(e) => setSelectedParentCategoryId(e.target.value)}
                  disabled={filteredParentCategories.length === 0}
                >
                  <option value="">{t('subcategoryMgmt.all')}</option>
                  {filteredParentCategories.map((pc) => (
                    <option key={pc.id} value={pc.id}>
                      {pc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('subcategoryMgmt.listTitle')}</CardTitle>
            <CardDescription>
              {t('subcategoryMgmt.listDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && subcategories.length === 0 ? (
              <p className="text-slate-500">{t('common.loading')}</p>
            ) : filteredSubcategories.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                {t('documentMgmt.noSubcategories')}
              </div>
            ) : (
              <>
              <div className="space-y-3">
                {paginatedSubcategories.map((sub) => {
                  const dept = departments.find((d) => d.id === sub.departmentId);
                  const parent = parentCategories.find((pc) => pc.id === sub.parentCategoryId);
                  const isAdminPath = window.location.pathname.startsWith('/admin');
                  const basePath = isAdminPath ? '/admin' : '/team';
                  const expiryStatus = getExpiryStatus(sub.expiryDate || null);
                  const isExpired = expiryStatus.status === 'expired';

                  const handleClick = () => {
                    if (isExpired) {
                      setExpiredDialogOpen(true);
                      setExpiredSubcategory(sub);
                    } else {
                      navigate(
                        `${basePath}/parent-category/${sub.parentCategoryId}/subcategory/${sub.id}`
                      );
                    }
                  };

                  return (
                    <div
                      key={sub.id}
                      className={cn(
                        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg transition-colors",
                        !isExpired && "hover:bg-slate-50 cursor-pointer",
                        expiryStatus.status === 'expired' && "opacity-50 bg-gray-100 border-gray-300 cursor-not-allowed",
                        expiryStatus.status === 'warning_7' && "border-orange-300 bg-orange-50",
                        expiryStatus.status === 'warning_30' && "border-yellow-300 bg-yellow-50"
                      )}
                    >
                      <div
                        className="flex-1 min-w-0"
                        onClick={handleClick}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <p className="font-medium truncate flex-1 min-w-0">{sub.name}</p>
                        </div>
                        <p className="text-sm text-slate-500 truncate">
                          {parent ? `${parent.name} · ` : ''}
                          {dept ? dept.name : sub.departmentId}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {t('subcategoryMgmt.docsCount', { count: sub.documentCount })} · NFC{' '}
                          {sub.nfcRegistered ? t('subcategoryMgmt.registered') : t('subcategoryMgmt.unregistered')}
                          {sub.expiryDate
                            ? ` · ${t('parentCategoryDetail.expiryDate')} ${format(new Date(sub.expiryDate), 'yyyy.MM.dd')}`
                            : sub.defaultExpiryDays
                              ? ` · ${t('parentCategoryDetail.expiryDate')} ${format(addDays(new Date(), sub.defaultExpiryDays), 'yyyy.MM.dd')}`
                              : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto sm:ml-3 flex-wrap">
                        {expiryStatus.label && (
                          <Badge
                            variant={
                              expiryStatus.status === 'expired' ? 'destructive' :
                              expiryStatus.status === 'warning_7' ? 'default' : 'secondary'
                            }
                            className={cn(
                              "flex-shrink-0",
                              expiryStatus.status === 'warning_7' && "bg-orange-500 text-white",
                              expiryStatus.status === 'warning_30' && "bg-yellow-500 text-white"
                            )}
                          >
                            {expiryStatus.label}
                          </Badge>
                        )}
                        {sub.nfcRegistered && (
                          <Badge variant="outline" className="flex-shrink-0">
                            <Smartphone className="h-3 w-3 mr-1" />
                            NFC
                          </Badge>
                        )}
                        <ColorLabelBadge colorLabel={sub.colorLabel} />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleOpenEditDialog(sub)}
                        >
                          <img src={penIcon} alt={t('common.edit')} className="w-full h-full p-1.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(sub.id)}
                          className="text-red-500 hover:text-red-600 border-gray-200 hover:border-red-500"
                        >
                          <img src={binIcon} alt={t('common.delete')} className="w-full h-full p-1.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredSubcategories.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="text-sm text-slate-500">
                    {startItem}-{endItem} / {t('subcategoryMgmt.totalCount', { count: filteredSubcategories.length })}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      {t('common.previous')}
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-10"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      {t('common.next')}
                    </Button>
                  </div>
                </div>
              )}
              </>
            )}
          </CardContent>
        </Card>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{t('subcategoryMgmt.addTitle')}</DialogTitle>
              <DialogDescription>
                {t('subcategoryMgmt.addDesc')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 overflow-y-auto flex-1 px-4">
              <div className="space-y-2">
                <Label>{t('common.department')}</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={form.departmentId}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      departmentId: e.target.value,
                      parentCategoryId: '',
                    }))
                  }
                >
                  <option value="">{t('subcategoryMgmt.selectDepartment')}</option>
                  {departments
                    .filter((dept) => accessibleDepartmentIds.includes(dept.id))
                    .map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t('subcategoryDetail.parentCategory')}</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={form.parentCategoryId}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      parentCategoryId: e.target.value,
                    }))
                  }
                  disabled={filteredParentCategoriesForForm.length === 0}
                >
                  <option value="">{t('subcategoryMgmt.selectParentCategory')}</option>
                  {filteredParentCategoriesForForm.map((pc) => (
                    <option key={pc.id} value={pc.id}>
                      {pc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t('parentCategoryDetail.subcategoryName')}</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder={t('parentCategoryDetail.subcategoryNamePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('parentCategoryDetail.description')}</Label>
                <Textarea
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
              <div className="space-y-2">
                <Label>{t('parentCategoryDetail.colorLabel')}</Label>
                <ColorLabelPicker
                  value={form.colorLabel}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, colorLabel: value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t('parentCategoryDetail.storageLocationOpt')}</Label>
                <Input
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
              <div className="space-y-2">
                <Label>{t('parentCategoryDetail.managementNumberOpt')}</Label>
                <Input
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
              <div className="space-y-2">
                <Label>{t('parentCategoryDetail.defaultExpiryLabel')}</Label>
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
                    {t('parentCategoryDetail.months3')}
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
                    {t('parentCategoryDetail.year1')}
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
                    {t('parentCategoryDetail.years3')}
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
                    {t('parentCategoryDetail.years5')}
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
                    {t('parentCategoryDetail.years7')}
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
                    {t('parentCategoryDetail.years10')}
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
                      {t('parentCategoryDetail.reset')}
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
                        : t('parentCategoryDetail.selectExpiryFromCalendar')}
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
                  {t('parentCategoryDetail.expiryNote')}
                  {form.expiryDate && ` (${format(new Date(form.expiryDate), 'PPP', { locale: ko })})`}
                </p>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row">
              <Button
                type="button"
                onClick={handleSubmit}
                variant="outline"
                disabled={
                  isSaving ||
                  !form.name.trim() ||
                  !form.departmentId ||
                  !form.parentCategoryId
                }
              >
                {t('parentCategoryDetail.addSubcategoryOnly')}
              </Button>
              <Button
                type="button"
                onClick={handleSubmitWithNfc}
                disabled={
                  isSaving ||
                  !form.name.trim() ||
                  !form.departmentId ||
                  !form.parentCategoryId
                }
                className="flex items-center gap-2"
              >
                <Smartphone className="h-4 w-4" />
                {t('parentCategoryDetail.addWithNfc')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
                disabled={isSaving}
              >
                {t('common.cancel')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseEditDialog();
            }
          }}
        >
          <DialogContent className="max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{t('subcategoryDetail.editSubcategory')}</DialogTitle>
              <DialogDescription>
                {t('documentMgmt.editSubcategoryDesc')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 overflow-y-auto flex-1 px-4">
              <div className="space-y-2">
                <Label>{t('parentCategoryDetail.subcategoryName')}</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder={t('parentCategoryDetail.subcategoryNamePlaceholder')}
                />
                {editNameError && (
                  <p className="text-xs text-red-500 mt-1">{editNameError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t('parentCategoryDetail.description')}</Label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder={t('parentCategoryDetail.descriptionPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('parentCategoryDetail.colorLabel')}</Label>
                <ColorLabelPicker
                  value={editForm.colorLabel}
                  onChange={(value) =>
                    setEditForm((prev) => ({ ...prev, colorLabel: value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t('parentCategoryDetail.storageLocationOpt')}</Label>
                <Input
                  value={editForm.storageLocation}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      storageLocation: e.target.value,
                    }))
                  }
                  placeholder={t('parentCategoryDetail.storageLocationPlaceholder')}
                  maxLength={30}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('parentCategoryDetail.managementNumberOpt')}</Label>
                <Input
                  value={editForm.managementNumber}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      managementNumber: e.target.value,
                    }))
                  }
                  placeholder={t('parentCategoryDetail.managementNumberPlaceholder')}
                  maxLength={30}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('parentCategoryDetail.defaultExpiryLabel')}</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={editForm.expiryDate && Math.abs(new Date(editForm.expiryDate).getTime() - addMonths(new Date(), 3).getTime()) < 86400000 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}
                    onClick={() => {
                      const target = addMonths(new Date(), 3);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const targetDay = new Date(target);
                      targetDay.setHours(0, 0, 0, 0);
                      const diffTime = targetDay.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      setEditForm((prev) => ({
                        ...prev,
                        defaultExpiryDays: diffDays,
                        expiryDate: target.toISOString(),
                      }));
                    }}
                  >
                    {t('parentCategoryDetail.months3')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={editForm.expiryDate && Math.abs(new Date(editForm.expiryDate).getTime() - addYears(new Date(), 1).getTime()) < 86400000 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}
                    onClick={() => {
                      const target = addYears(new Date(), 1);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const targetDay = new Date(target);
                      targetDay.setHours(0, 0, 0, 0);
                      const diffTime = targetDay.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      setEditForm((prev) => ({
                        ...prev,
                        defaultExpiryDays: diffDays,
                        expiryDate: target.toISOString(),
                      }));
                    }}
                  >
                    {t('parentCategoryDetail.year1')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={editForm.expiryDate && Math.abs(new Date(editForm.expiryDate).getTime() - addYears(new Date(), 3).getTime()) < 86400000 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}
                    onClick={() => {
                      const target = addYears(new Date(), 3);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const targetDay = new Date(target);
                      targetDay.setHours(0, 0, 0, 0);
                      const diffTime = targetDay.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      setEditForm((prev) => ({
                        ...prev,
                        defaultExpiryDays: diffDays,
                        expiryDate: target.toISOString(),
                      }));
                    }}
                  >
                    {t('parentCategoryDetail.years3')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={editForm.expiryDate && Math.abs(new Date(editForm.expiryDate).getTime() - addYears(new Date(), 5).getTime()) < 86400000 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}
                    onClick={() => {
                      const target = addYears(new Date(), 5);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const targetDay = new Date(target);
                      targetDay.setHours(0, 0, 0, 0);
                      const diffTime = targetDay.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      setEditForm((prev) => ({
                        ...prev,
                        defaultExpiryDays: diffDays,
                        expiryDate: target.toISOString(),
                      }));
                    }}
                  >
                    {t('parentCategoryDetail.years5')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={editForm.expiryDate && Math.abs(new Date(editForm.expiryDate).getTime() - addYears(new Date(), 7).getTime()) < 86400000 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}
                    onClick={() => {
                      const target = addYears(new Date(), 7);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const targetDay = new Date(target);
                      targetDay.setHours(0, 0, 0, 0);
                      const diffTime = targetDay.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      setEditForm((prev) => ({
                        ...prev,
                        defaultExpiryDays: diffDays,
                        expiryDate: target.toISOString(),
                      }));
                    }}
                  >
                    {t('parentCategoryDetail.years7')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={editForm.expiryDate && Math.abs(new Date(editForm.expiryDate).getTime() - addYears(new Date(), 10).getTime()) < 86400000 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}
                    onClick={() => {
                      const target = addYears(new Date(), 10);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const targetDay = new Date(target);
                      targetDay.setHours(0, 0, 0, 0);
                      const diffTime = targetDay.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      setEditForm((prev) => ({
                        ...prev,
                        defaultExpiryDays: diffDays,
                        expiryDate: target.toISOString(),
                      }));
                    }}
                  >
                    {t('parentCategoryDetail.years10')}
                  </Button>
                  {editForm.defaultExpiryDays && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setEditForm((prev) => ({
                          ...prev,
                          defaultExpiryDays: null,
                          expiryDate: null,
                        }))
                      }
                      className="bg-white text-slate-600 hover:bg-slate-100"
                    >
                      {t('parentCategoryDetail.reset')}
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
                        !editForm.expiryDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editForm.expiryDate
                        ? format(new Date(editForm.expiryDate), 'PPP', { locale: ko })
                        : t('parentCategoryDetail.selectExpiryFromCalendar')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      captionLayout="dropdown"
                      fromYear={2020}
                      toYear={2040}
                      selected={editForm.expiryDate ? new Date(editForm.expiryDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const selected = new Date(date);
                          selected.setHours(0, 0, 0, 0);
                          const diffTime = selected.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          setEditForm((prev) => ({
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
                  {t('parentCategoryDetail.expiryNote')}
                  {editForm.expiryDate && ` (${format(new Date(editForm.expiryDate), 'PPP', { locale: ko })})`}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseEditDialog}
                disabled={isSavingEdit}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  if (!editingSubcategory) return;
                  let scanToast: ReturnType<typeof toast> | null = null;
                  try {
                    scanToast = toast({
                      title: t('documentMgmt.nfcWaiting'),
                      description: t('documentMgmt.nfcWaitingDesc'),
                      duration: 1000000,
                    });
                    const uid = await readNFCUid();
                    scanToast.dismiss();

                    // 이 UID가 이미 등록된 태그인지 확인
                    const existingSub = await findSubcategoryByNfcUid(uid);

                    if (existingSub) {
                      // 이미 등록된 태그 → 확인 다이얼로그 띄우기
                      setPendingNfcUid(uid);
                      setPendingNfcSubcategoryId(editingSubcategory.id);
                      setExistingNfcSubcategory({ id: existingSub.id, name: existingSub.name });
                      setNfcConfirmDialogOpen(true);
                      return;
                    }

                    // 등록된 적 없는 태그 → 바로 등록 진행
                    await proceedNfcRegistration(uid, editingSubcategory.id);
                  } catch (error: any) {
                    scanToast?.dismiss();
                    toast({
                      title: t('common.error'),
                      description:
                        error?.message || t('documentMgmt.nfcRegErrorDesc'),
                      variant: 'destructive',
                    });
                    setNfcMode('idle');
                  }
                }}
                disabled={!editingSubcategory || isSavingEdit}
              >
                📱 {t('subcategoryMgmt.nfcTagRegister')}
              </Button>
              <Button
                type="button"
                onClick={handleSaveEditSubcategory}
                disabled={isSavingEdit}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSavingEdit ? t('common.saving') : t('common.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
              <AlertDialogTitle>{t('parentCategoryDetail.deleteSubcategory')}</AlertDialogTitle>
              <AlertDialogDescription>
                <p>
                  {t('parentCategoryDetail.deleteSubConfirm', { name: deletingSubcategory?.name ?? '' })}
                </p>
                <p className="mt-1">
                  {t('parentCategoryDetail.deleteSubWarning', { count: deletingSubcategory?.documentCount ?? 0 })}
                </p>
                <p className="mt-3 text-sm font-medium text-red-600">
                  {t('documentMgmt.deleteIrreversible')}
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingSubcategory}>
                {t('common.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteSubcategory}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={isDeletingSubcategory}
              >
                {isDeletingSubcategory ? t('documentMgmt.deleting') : t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* NFC 재등록 확인 다이얼로그 */}
        <AlertDialog open={nfcConfirmDialogOpen} onOpenChange={setNfcConfirmDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('documentMgmt.nfcReregister')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('parentCategoryDetail.nfcAlreadyRegistered')}
                {existingNfcSubcategory && (
                  <span className="block mt-2 font-medium">
                    {t('parentCategoryDetail.currentLink')}: {existingNfcSubcategory.name}
                  </span>
                )}
                <span className="block mt-2">{t('parentCategoryDetail.continueQuestion')}</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleNfcConfirmNo}>
                {t('common.no')}
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleNfcConfirmYes}>
                {t('common.yes')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 만료된 카테고리 안내 다이얼로그 */}
        <AlertDialog open={expiredDialogOpen} onOpenChange={setExpiredDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('parentCategoryDetail.expiredCategory')}</AlertDialogTitle>
              <AlertDialogDescription>
                {expiredSubcategory && (
                  <>
                    <p className="mb-2">
                      {t('parentCategoryDetail.expiredMsg', {
                        name: expiredSubcategory.name,
                        date: expiredSubcategory.expiryDate
                          ? format(new Date(expiredSubcategory.expiryDate), 'PPP', { locale: ko })
                          : ''
                      })}
                    </p>
                    <p>
                      {t('parentCategoryDetail.noAccessDocs', { count: expiredSubcategory.documentCount })}
                    </p>
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setExpiredDialogOpen(false)}>
                {t('common.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
