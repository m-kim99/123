import { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Smartphone, Edit, Trash2, Archive, PackageOpen, PackageCheck, Loader2 } from 'lucide-react';

import { format, addDays, addMonths, addYears } from 'date-fns';
import { ko } from 'date-fns/locale';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import type { Subcategory } from '@/store/documentStore';
import { getStorageDisplayStatus, type StorageDisplayStatus } from '@/store/documentStore';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NFCRegistrationDialog } from '@/components/NFCRegistrationDialog';
import { toast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { BackButton } from '@/components/BackButton';
import { ColorLabelPicker, ColorLabelBadge } from '@/components/ColorLabelPicker';
import { hasPermission, type Role, type Action } from '@/lib/permissions';
import { V1ModalHeader, V1ModalBody, V1ModalFooter } from '@/components/ui/v1-components';
import i18n from '@/lib/i18n';

// 보관 상태 배지 스타일/라벨 키
const STORAGE_BADGE_CLASS: Record<StorageDisplayStatus, string> = {
  stored: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  checkedOut: 'bg-amber-50 text-amber-700 border-amber-200',
  disposalPending: 'bg-red-50 text-red-700 border-red-200',
  disposed: 'bg-slate-100 text-slate-500 border-slate-200',
};
const STORAGE_LABEL_KEY: Record<StorageDisplayStatus, string> = {
  stored: 'subcategoryDetail.statusStored',
  checkedOut: 'subcategoryDetail.statusCheckedOut',
  disposalPending: 'subcategoryDetail.statusDisposalPending',
  disposed: 'subcategoryDetail.statusDisposed',
};

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
    checkoutSubcategory,
    returnSubcategory,
  } = useDocumentStore();

  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedParentCategoryId, setSelectedParentCategoryId] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | StorageDisplayStatus>('');

  // 반출/반납 퀵액션 상태
  const [checkoutTarget, setCheckoutTarget] = useState<Subcategory | null>(null);
  const [checkoutReason, setCheckoutReason] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [returnTarget, setReturnTarget] = useState<Subcategory | null>(null);
  const [isReturning, setIsReturning] = useState(false);
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
  const [nfcDialogOpen, setNfcDialogOpen] = useState(false);
  const [nfcTargetSubcategory, setNfcTargetSubcategory] = useState<{ id: string; name: string } | null>(null);
  const [nfcDialogSource, setNfcDialogSource] = useState<'add' | 'edit'>('add');
  // 팀원용: 권한 있는 부서 ID 목록
  const [accessibleDepartmentIds, setAccessibleDepartmentIds] = useState<string[]>([]);
  // 부서별 권한 매핑
  const [departmentPermissions, setDepartmentPermissions] = useState<Map<string, Role>>(new Map());

  // 만료된 카테고리 안내 다이얼로그 상태
  const [expiredDialogOpen, setExpiredDialogOpen] = useState(false);
  const [expiredSubcategory, setExpiredSubcategory] = useState<Subcategory | null>(null);

  // 세부 스토리지 삭제 확인 다이얼로그 상태
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSubcategory, setDeletingSubcategory] = useState<Subcategory | null>(null);
  const [isDeletingSubcategory, setIsDeletingSubcategory] = useState(false);

  // 정렬 상태
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest' | 'alpha'>('latest');

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    // Zustand actions는 안정적이므로 getState()로 직접 호출
    useDocumentStore.getState().fetchParentCategories();
    useDocumentStore.getState().fetchSubcategories();
  }, []);

  // 팀원용: 권한 있는 부서 목록 조회 + 권한 레벨 매핑
  useEffect(() => {
    const fetchAccessibleDepartments = async () => {
      if (isAdmin || !user?.id) {
        // 관리자는 모든 부서에 manager 권한
        setAccessibleDepartmentIds(departments.map((d) => d.id));
        const adminPerms = new Map<string, Role>();
        departments.forEach(d => adminPerms.set(d.id, 'manager'));
        setDepartmentPermissions(adminPerms);
        return;
      }

      const permissions = new Map<string, Role>();
      const deptIds = new Set<string>();

      // 1. 소속 부서는 자동 manager 권한
      const ownDeptId = user.departmentId;
      if (ownDeptId) {
        deptIds.add(ownDeptId);
        permissions.set(ownDeptId, 'manager');
      }

      // 2. 추가 권한 부여된 부서 조회 (role이 none이 아닌 경우)
      const { data: permissionData } = await supabase
        .from('user_permissions')
        .select('department_id, role')
        .eq('user_id', user.id)
        .neq('role', 'none');

      permissionData?.forEach((p: any) => {
        deptIds.add(p.department_id);
        if (p.department_id !== ownDeptId) {
          permissions.set(p.department_id, p.role as Role);
        }
      });

      setAccessibleDepartmentIds(Array.from(deptIds));
      setDepartmentPermissions(permissions);
    };

    fetchAccessibleDepartments();
  }, [isAdmin, user?.id, user?.departmentId, departments]);

  // 세부 카테고리별 권한 체크 헬퍼
  const canDoForSub = (sub: { departmentId: string }, action: Action): boolean => {
    if (isAdmin) return true;
    const role = departmentPermissions.get(sub.departmentId);
    if (!role) return false;
    return hasPermission(role, action);
  };

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

  // 접근 가능한 세부 스토리지 (통계 카드 기준)
  const accessibleSubcategories = useMemo(
    () => subcategories.filter((sub) => accessibleDepartmentIds.includes(sub.departmentId)),
    [subcategories, accessibleDepartmentIds]
  );

  // 보관 상태 통계: 전체 / 보관중 / 반출중 / 폐기 예정
  const storageStats = useMemo(() => {
    const stats = { total: accessibleSubcategories.length, stored: 0, checkedOut: 0, disposalPending: 0, disposed: 0 };
    accessibleSubcategories.forEach((sub) => {
      stats[getStorageDisplayStatus(sub)]++;
    });
    return stats;
  }, [accessibleSubcategories]);

  const filteredSubcategories = useMemo(
    () => {
      const filtered = subcategories.filter((sub) => {
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
        if (statusFilter && getStorageDisplayStatus(sub) !== statusFilter) {
          return false;
        }
        return true;
      });
      const arr = [...filtered];
      if (sortOrder === 'alpha') {
        arr.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
      } else if (sortOrder === 'latest') {
        arr.reverse();
      }
      return arr;
    },
    [subcategories, selectedDepartmentId, selectedParentCategoryId, statusFilter, accessibleDepartmentIds, sortOrder]
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
  }, [selectedDepartmentId, selectedParentCategoryId, statusFilter]);

  // 반출/반납 퀵액션
  const handleQuickCheckout = useCallback(async () => {
    if (!checkoutTarget) return;
    setIsCheckingOut(true);
    try {
      const ok = await checkoutSubcategory(checkoutTarget.id, checkoutReason.trim());
      if (ok) {
        toast({
          title: t('subcategoryDetail.checkoutDone'),
          description: t('subcategoryDetail.checkoutDoneDesc'),
        });
        setCheckoutTarget(null);
        setCheckoutReason('');
      }
    } finally {
      setIsCheckingOut(false);
    }
  }, [checkoutTarget, checkoutReason, checkoutSubcategory, t]);

  const handleQuickReturn = useCallback(async () => {
    if (!returnTarget) return;
    setIsReturning(true);
    try {
      const ok = await returnSubcategory(returnTarget.id);
      if (ok) {
        toast({
          title: t('subcategoryDetail.returnDone'),
          description: t('subcategoryDetail.returnDoneDesc'),
        });
        setReturnTarget(null);
      }
    } finally {
      setIsReturning(false);
    }
  }, [returnTarget, returnSubcategory, t]);

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
        managementNumber: form.managementNumber,
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
    try {
      const created = await addSubcategory({
        name: form.name.trim(),
        description: form.description,
        departmentId: form.departmentId,
        parentCategoryId: form.parentCategoryId,
        storageLocation: form.storageLocation,
        managementNumber: form.managementNumber,
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

      // 세부 스토리지 생성 완료 → NFC 등록 다이어로그 열기 (펄스 애니메이션)
      setNfcDialogSource('add');
      setNfcTargetSubcategory({ id: created.id, name: created.name });
      setNfcDialogOpen(true);
    } catch (error: any) {
      console.error('세부 스토리지 생성 실패:', error);
      toast({
        title: t('documentMgmt.subcategoryCreateFailed'),
        description: error?.message || t('documentMgmt.subcategoryCreateFailedNfc'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleNfcRegistrationSuccess = useCallback(async () => {
    await fetchSubcategories();
    if (nfcDialogSource === 'add') {
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
    }
    setNfcTargetSubcategory(null);
  }, [fetchSubcategories, nfcDialogSource]);

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
            <h1 className="text-[28px] sm:text-[30px] font-bold tracking-tight text-slate-900">{t('subcategoryMgmt.title')}</h1>
            <p className="text-sm text-slate-500 mt-1">{t('subcategoryMgmt.subtitle')}</p>
          </div>
          <Button className=" w-full sm:w-auto" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('parentCategoryDetail.addSubcategory')}
          </Button>
        </div>

        {/* 보관 상태 통계 카드 (클릭 시 상태 필터 연동) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => setStatusFilter('')}
          >
            <CardContent className="pt-5 pb-4">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{storageStats.total}</p>
              <p className="text-xs text-slate-500 mt-1">{t('subcategoryMgmt.statTotal')}</p>
            </CardContent>
          </Card>
          {([
            { key: 'stored', count: storageStats.stored, dot: 'bg-emerald-500', text: 'text-emerald-600' },
            { key: 'checkedOut', count: storageStats.checkedOut, dot: 'bg-amber-500', text: 'text-amber-600' },
            { key: 'disposalPending', count: storageStats.disposalPending, dot: 'bg-red-500', text: 'text-red-600' },
          ] as const).map((stat) => (
            <Card
              key={stat.key}
              className={cn(
                'cursor-pointer transition-shadow hover:shadow-md',
                statusFilter === stat.key && 'ring-2 ring-[#2563eb]/40'
              )}
              onClick={() => setStatusFilter((prev) => (prev === stat.key ? '' : stat.key))}
            >
              <CardContent className="pt-5 pb-4">
                <p className={cn('text-2xl font-bold', stat.text)}>{stat.count}</p>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <span className={cn('w-2 h-2 rounded-full shrink-0', stat.dot)} />
                  {t(STORAGE_LABEL_KEY[stat.key])}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('subcategoryMgmt.filter')}</CardTitle>
            <CardDescription>
              {t('subcategoryMgmt.filterDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1.5">{t('common.department')}</p>
                <select
                  className="w-full border border-[#e5e7eb] rounded-[10px] px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
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
                <p className="text-xs font-medium text-slate-500 mb-1.5">{t('subcategoryDetail.parentCategory')}</p>
                <select
                  className="w-full border border-[#e5e7eb] rounded-[10px] px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 disabled:opacity-50 disabled:bg-slate-50"
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
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1.5">{t('subcategoryMgmt.storageStatus')}</p>
                <select
                  className="w-full border border-[#e5e7eb] rounded-[10px] px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as '' | StorageDisplayStatus)}
                >
                  <option value="">{t('subcategoryMgmt.allStatus')}</option>
                  <option value="stored">{t('subcategoryDetail.statusStored')}</option>
                  <option value="checkedOut">{t('subcategoryDetail.statusCheckedOut')}</option>
                  <option value="disposalPending">{t('subcategoryDetail.statusDisposalPending')}</option>
                  <option value="disposed">{t('subcategoryDetail.statusDisposed')}</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>{t('subcategoryMgmt.listTitle')}</CardTitle>
              <CardDescription>
                {t('subcategoryMgmt.listDesc')}
              </CardDescription>
            </div>
            <select
              value={sortOrder}
              onChange={(e) => { setSortOrder(e.target.value as 'latest' | 'oldest' | 'alpha'); setCurrentPage(1); }}
              className="h-9 rounded-[10px] border border-[#e5e7eb] bg-white text-[13px] text-slate-700 px-3 pr-8 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_8px_center] bg-no-repeat cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 dark:bg-[#111827] dark:border-white/10 dark:text-slate-200"
            >
              <option value="latest">{t('common.sortLatest')}</option>
              <option value="oldest">{t('common.sortOldest')}</option>
              <option value="alpha">{t('common.sortAlpha')}</option>
            </select>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedSubcategories.map((sub) => {
                  const dept = departments.find((d) => d.id === sub.departmentId);
                  const parent = parentCategories.find((pc) => pc.id === sub.parentCategoryId);
                  const isAdminPath = window.location.pathname.startsWith('/admin');
                  const basePath = isAdminPath ? '/admin' : '/team';
                  const expiryStatus = getExpiryStatus(sub.expiryDate || null);
                  const isExpired = expiryStatus.status === 'expired';
                  const storageStatus = getStorageDisplayStatus(sub);

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
                  <Card
                    key={sub.id}
                    className={cn(
                      "hover:shadow-md transition-shadow cursor-pointer flex flex-col",
                      expiryStatus.status === 'expired' && "opacity-50 bg-gray-100 border-gray-300",
                      storageStatus === 'disposed' && "opacity-60 bg-slate-100 border-slate-300",
                      storageStatus !== 'disposed' && expiryStatus.status === 'warning_7' && "border-orange-300 bg-orange-50",
                      storageStatus !== 'disposed' && expiryStatus.status === 'warning_30' && "border-yellow-300 bg-yellow-50"
                    )}
                  >
                    <div className="flex flex-col h-full" onClick={handleClick}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <CardTitle className="text-base truncate">{sub.name}</CardTitle>
                            <CardDescription className="text-xs mt-0.5 truncate">
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
                              <Badge variant="outline" className={STORAGE_BADGE_CLASS[storageStatus]}>
                                ● {t(STORAGE_LABEL_KEY[storageStatus])}
                              </Badge>
                            </div>
                            {expiryStatus.label && expiryStatus.status !== 'expired' && storageStatus !== 'disposed' && (
                              <Badge
                                variant={
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
                              {dept?.name ?? sub.departmentId}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">{t('subcategoryDetail.parentCategory')}</span>
                            <span className="font-medium">{parent?.name ?? '-'}</span>
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
                            onClick={() => handleOpenEditDialog(sub)}
                            disabled={!canDoForSub(sub, 'write')}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            {t('common.edit')}
                          </Button>
                          {storageStatus !== 'disposed' && (
                            storageStatus === 'checkedOut' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setReturnTarget(sub)}
                                disabled={!canDoForSub(sub, 'write')}
                                title={t('subcategoryDetail.returnAction')}
                                className="text-emerald-600 hover:text-emerald-700 border-gray-200 hover:border-emerald-500"
                              >
                                <PackageCheck className="h-3 w-3" />
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCheckoutTarget(sub)}
                                disabled={!canDoForSub(sub, 'write')}
                                title={t('subcategoryDetail.checkoutAction')}
                              >
                                <PackageOpen className="h-3 w-3" />
                              </Button>
                            )
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(sub.id)}
                            disabled={!canDoForSub(sub, 'delete')}
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
          <DialogContent variant="v1" className="max-w-[560px] max-h-[90vh] flex flex-col overflow-hidden" hideClose>
            <V1ModalHeader icon={Archive} title={t('subcategoryMgmt.addTitle')} sub={t('subcategoryMgmt.addDesc')} />
            <V1ModalBody className="overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-slate-900">{t('common.department')}</label>
                  <select
                    className="h-[38px] px-3 rounded-lg border border-[#e5e7eb] bg-white text-[14px] w-full outline-none"
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
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-slate-900">{t('subcategoryDetail.parentCategory')}</label>
                  <select
                    className="h-[38px] px-3 rounded-lg border border-[#e5e7eb] bg-white text-[14px] w-full outline-none"
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
              </div>
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
                            ? 'border-[#2563eb] bg-[#eff6ff] text-[#2563eb]'
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
                            ? 'border-[#2563eb] bg-[#eff6ff] text-[#2563eb]'
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
                onClick={handleSubmit}
                disabled={isSaving || !form.name.trim() || !form.departmentId || !form.parentCategoryId}
                className="h-9 px-4 rounded-[10px] text-[13px] font-semibold border border-[#e5e7eb] bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Archive className="h-3.5 w-3.5" />
                {t('parentCategoryDetail.addSubcategoryOnly')}
              </button>
              <button
                type="button"
                onClick={handleSubmitWithNfc}
                disabled={isSaving || !form.name.trim() || !form.departmentId || !form.parentCategoryId}
                className="h-9 px-4 rounded-[10px] text-[13px] font-semibold bg-[#2563eb] text-white hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Smartphone className="h-3.5 w-3.5" />
                {t('parentCategoryDetail.addWithNfc')}
              </button>
            </V1ModalFooter>
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
          <DialogContent variant="v1" className="max-w-[560px] max-h-[90vh] flex flex-col overflow-hidden" hideClose>
            <V1ModalHeader icon={Archive} title={t('subcategoryDetail.editSubcategory')} sub={t('documentMgmt.editSubcategoryDesc')} />
            <V1ModalBody className="overflow-y-auto flex-1">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-900">{t('parentCategoryDetail.subcategoryName')}</label>
                <Input
                  className="h-[38px] rounded-lg border-[#e5e7eb] text-[14px]"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder={t('parentCategoryDetail.subcategoryNamePlaceholder')}
                />
                {editNameError && (
                  <p className="text-[11.5px] text-red-500 mt-0.5">{editNameError}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-900">{t('parentCategoryDetail.description')} <span className="text-slate-400 font-normal">({t('common.optional', { defaultValue: '선택' })})</span></label>
                <Textarea
                  className="min-h-[64px] rounded-lg border-[#e5e7eb] text-[14px] resize-y"
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
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-900">{t('parentCategoryDetail.colorLabel')} <span className="text-slate-400 font-normal">({t('common.optional', { defaultValue: '선택' })})</span></label>
                <ColorLabelPicker
                  value={editForm.colorLabel}
                  onChange={(value) =>
                    setEditForm((prev) => ({ ...prev, colorLabel: value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-slate-900">{t('parentCategoryDetail.storageLocationOpt')}</label>
                  <Input
                    className="h-[38px] rounded-lg border-[#e5e7eb] text-[14px]"
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
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-slate-900">{t('parentCategoryDetail.managementNumberOpt')}</label>
                  <Input
                    className="h-[38px] rounded-lg border-[#e5e7eb] text-[14px] font-mono"
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
                    const isActive = editForm.expiryDate && Math.abs(new Date(editForm.expiryDate).getTime() - target.getTime()) < 86400000;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        className={`px-3 py-[7px] rounded-lg text-[12.5px] font-medium border cursor-pointer transition-colors ${
                          isActive
                            ? 'border-[#2563eb] bg-[#eff6ff] text-[#2563eb]'
                            : 'border-[#e5e7eb] bg-white text-slate-900 hover:bg-slate-50'
                        }`}
                        onClick={() => {
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
                        {opt.label}
                      </button>
                    );
                  })}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={`px-3 py-[7px] rounded-lg text-[12.5px] font-medium border cursor-pointer transition-colors ${
                          editForm.expiryDate && ![addMonths(new Date(), 3), addYears(new Date(), 1), addYears(new Date(), 3), addYears(new Date(), 5), addYears(new Date(), 7), addYears(new Date(), 10)].some(d => Math.abs(new Date(editForm.expiryDate!).getTime() - d.getTime()) < 86400000)
                            ? 'border-[#2563eb] bg-[#eff6ff] text-[#2563eb]'
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
                </div>
                {editForm.expiryDate && (
                  <p className="text-[11.5px] text-slate-500 mt-0.5">
                    {format(new Date(editForm.expiryDate), 'yyyy년 MM월 dd일', { locale: ko })}
                  </p>
                )}
              </div>
            </V1ModalBody>
            <V1ModalFooter>
              <button
                type="button"
                onClick={handleCloseEditDialog}
                disabled={isSavingEdit}
                className="h-9 px-4 rounded-[10px] text-[13px] font-semibold border border-[#e5e7eb] bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!editingSubcategory) return;
                  setNfcDialogSource('edit');
                  setNfcTargetSubcategory({ id: editingSubcategory.id, name: editingSubcategory.name });
                  setNfcDialogOpen(true);
                }}
                disabled={!editingSubcategory || isSavingEdit}
                className="h-9 px-4 rounded-[10px] text-[13px] font-semibold border border-[#e5e7eb] bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Smartphone className="h-3.5 w-3.5" />
                {t('subcategoryMgmt.nfcTagRegister')}
              </button>
              <button
                type="button"
                onClick={handleSaveEditSubcategory}
                disabled={isSavingEdit}
                className="h-9 px-4 rounded-[10px] text-[13px] font-semibold bg-[#2563eb] text-white hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingEdit ? t('common.saving') : t('common.save')}
              </button>
            </V1ModalFooter>
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
          <AlertDialogContent className="dark:bg-[#111827] dark:border-white/[0.08]">
            <AlertDialogHeader>
              <AlertDialogTitle className="dark:text-[#f1f5f9]">{t('parentCategoryDetail.deleteSubcategory')}</AlertDialogTitle>
              <AlertDialogDescription className="dark:text-[#94a3b8]">
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
              <AlertDialogCancel disabled={isDeletingSubcategory} className="dark:bg-[#1e293b] dark:text-[#cbd5e1] dark:border-white/[0.08]">
                {t('common.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteSubcategory}
                className="bg-[#ef4444] hover:bg-[#dc2626] dark:bg-[#f87171] dark:hover:bg-[#fca5a5] dark:text-slate-900"
                disabled={isDeletingSubcategory}
              >
                {isDeletingSubcategory ? t('documentMgmt.deleting') : t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* NFC 등록 다이어로그 — 펄스 애니메이션 (이미 등록된 태그는 내부에서 자동 해제) */}
        {nfcTargetSubcategory && (
          <NFCRegistrationDialog
            open={nfcDialogOpen}
            onOpenChange={(open) => {
              setNfcDialogOpen(open);
              if (!open) setNfcTargetSubcategory(null);
            }}
            categoryId={nfcTargetSubcategory.id}
            categoryName={nfcTargetSubcategory.name}
            onSuccess={handleNfcRegistrationSuccess}
          />
        )}

        {/* 만료된 카테고리 안내 다이얼로그 */}
        <AlertDialog open={expiredDialogOpen} onOpenChange={setExpiredDialogOpen}>
          <AlertDialogContent className="dark:bg-[#111827] dark:border-white/[0.08]">
            <AlertDialogHeader>
              <AlertDialogTitle className="dark:text-[#f1f5f9]">{t('parentCategoryDetail.expiredCategory')}</AlertDialogTitle>
              <AlertDialogDescription className="dark:text-[#94a3b8]">
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
              <AlertDialogAction onClick={() => setExpiredDialogOpen(false)} className="dark:bg-[#3b82f6] dark:hover:bg-[#60a5fa]">
                {t('common.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 반출 처리 다이얼로그 (퀵액션) */}
        <Dialog
          open={!!checkoutTarget}
          onOpenChange={(open) => {
            if (!open) {
              setCheckoutTarget(null);
              setCheckoutReason('');
            }
          }}
        >
          <DialogContent variant="v1" className="max-w-[480px]">
            <V1ModalHeader
              icon={PackageOpen}
              title={t('subcategoryDetail.checkoutTitle')}
              sub={t('subcategoryDetail.checkoutDesc', { name: checkoutTarget?.name ?? '' })}
            />
            <V1ModalBody>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[13px] font-medium">{t('subcategoryDetail.checkoutBy')}</Label>
                <div className="h-[38px] rounded-lg border border-[#e5e7eb] bg-slate-50 px-3 flex items-center text-[13px] text-slate-700 dark:bg-white/5 dark:border-white/10 dark:text-slate-200">
                  {user?.name}
                </div>
                <p className="text-[11px] text-slate-400">{t('subcategoryDetail.checkoutByAuto')}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[13px] font-medium">{t('subcategoryDetail.checkoutReason')}</Label>
                <Input
                  value={checkoutReason}
                  onChange={(e) => setCheckoutReason(e.target.value)}
                  placeholder={t('subcategoryDetail.checkoutReasonPlaceholder')}
                  maxLength={100}
                  className="h-[38px] rounded-lg"
                />
              </div>
            </V1ModalBody>
            <V1ModalFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCheckoutTarget(null);
                  setCheckoutReason('');
                }}
                disabled={isCheckingOut}
                className="h-9 rounded-[10px] text-[13px] font-semibold border-[#e5e7eb]"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                onClick={handleQuickCheckout}
                disabled={isCheckingOut}
                className="h-9 rounded-[10px] text-[13px] font-semibold"
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    {t('common.processing')}
                  </>
                ) : (
                  <>
                    <PackageOpen className="h-3.5 w-3.5 mr-1.5" />
                    {t('subcategoryDetail.checkoutAction')}
                  </>
                )}
              </Button>
            </V1ModalFooter>
          </DialogContent>
        </Dialog>

        {/* 반납 확인 AlertDialog (퀵액션) */}
        <AlertDialog
          open={!!returnTarget}
          onOpenChange={(open) => {
            if (!open) setReturnTarget(null);
          }}
        >
          <AlertDialogContent className="max-w-md">
            <div className="flex items-start gap-3 px-6 pt-5 pb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50">
                <PackageCheck className="h-[18px] w-[18px] text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <AlertDialogTitle className="text-base font-semibold tracking-tight">
                  {t('subcategoryDetail.returnTitle')}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-slate-500 mt-1">
                  {t('subcategoryDetail.returnDesc', { name: returnTarget?.name ?? '' })}
                </AlertDialogDescription>
              </div>
            </div>
            <AlertDialogFooter className="px-6 pb-5">
              <AlertDialogCancel disabled={isReturning} className="h-9">
                {t('common.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleQuickReturn}
                disabled={isReturning}
                className="h-9 bg-emerald-600 hover:bg-emerald-700"
              >
                {isReturning ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    {t('common.processing')}
                  </>
                ) : (
                  <>
                    <PackageCheck className="h-3.5 w-3.5 mr-1.5" />
                    {t('subcategoryDetail.returnAction')}
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
