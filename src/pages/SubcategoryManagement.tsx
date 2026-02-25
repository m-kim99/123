import { useEffect, useMemo, useState, useCallback } from 'react';
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
        title: '삭제 완료',
        description: '세부 스토리지가 삭제되었습니다.',
      });

      handleCloseDeleteDialog();
    } catch (error) {
      console.error('세부 스토리지 삭제 실패:', error);
      toast({
        title: '삭제 실패',
        description: '세부 스토리지를 삭제하는 중 오류가 발생했습니다.',
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
        title: '세부 스토리지 등록 완료',
        description: '세부 스토리지가 성공적으로 추가되었습니다.',
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
      title: 'NFC 태그 인식 대기',
      description: 'NFC 태그를 기기에 가까이 가져다 대세요.',
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
      setEditNameError('이름을 입력하세요');
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
            <h1 className="text-3xl font-bold">세부 스토리지 관리</h1>
            <p className="text-slate-500 mt-1">
              부서와 대분류별로 세부 스토리지를 조회하고 관리합니다.
            </p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            세부 스토리지 추가
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>필터</CardTitle>
            <CardDescription>
              부서와 대분류를 선택하여 세부 스토리지 목록을 좁힐 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">부서</p>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={selectedDepartmentId}
                  onChange={(e) => {
                    setSelectedDepartmentId(e.target.value);
                    setSelectedParentCategoryId('');
                  }}
                >
                  <option value="">전체</option>
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
                <p className="text-sm font-medium text-slate-600 mb-1">대분류</p>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={selectedParentCategoryId}
                  onChange={(e) => setSelectedParentCategoryId(e.target.value)}
                  disabled={filteredParentCategories.length === 0}
                >
                  <option value="">전체</option>
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
            <CardTitle>세부 스토리지 목록</CardTitle>
            <CardDescription>
              목록에서 세부 스토리지를 선택하여 상세 페이지로 이동하거나 삭제할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && subcategories.length === 0 ? (
              <p className="text-slate-500">로딩 중...</p>
            ) : filteredSubcategories.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                조건에 해당하는 세부 스토리지가 없습니다.
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
                        "flex items-center justify-between p-4 border rounded-lg transition-colors",
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
                          문서 {sub.documentCount}개 · NFC{' '}
                          {sub.nfcRegistered ? '등록됨' : '미등록'}
                          {sub.expiryDate
                            ? ` · 보관 만료일 ${format(new Date(sub.expiryDate), 'yyyy.MM.dd')}`
                            : sub.defaultExpiryDays
                              ? ` · 보관 만료일 ${format(addDays(new Date(), sub.defaultExpiryDays), 'yyyy.MM.dd')}`
                              : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
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
                          <img src={penIcon} alt="수정" className="w-full h-full p-1.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(sub.id)}
                          className="text-red-500 hover:text-red-600 border-gray-200 hover:border-red-500"
                        >
                          <img src={binIcon} alt="삭제" className="w-full h-full p-1.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredSubcategories.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="text-sm text-slate-500">
                    {startItem}-{endItem} / 총 {filteredSubcategories.length}개
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      이전
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
                      다음
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
              <DialogTitle>새 세부 스토리지 추가</DialogTitle>
              <DialogDescription>
                부서와 대분류를 선택하여 세부 스토리지를 생성합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              <div className="space-y-2">
                <Label>부서</Label>
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
                  <option value="">부서를 선택하세요</option>
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
                <Label>대분류</Label>
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
                  <option value="">대분류를 선택하세요</option>
                  {filteredParentCategoriesForForm.map((pc) => (
                    <option key={pc.id} value={pc.id}>
                      {pc.name}
                    </option>
                  ))}
                </select>
              </div>
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
                onClick={handleSubmit}
                variant="outline"
                disabled={
                  isSaving ||
                  !form.name.trim() ||
                  !form.departmentId ||
                  !form.parentCategoryId
                }
              >
                세부 스토리지만 추가
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
        <Dialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseEditDialog();
            }
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>세부 스토리지 수정</DialogTitle>
              <DialogDescription>
                선택한 세부 스토리지 정보를 수정합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>세부 스토리지 이름</Label>
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
                  placeholder="세부 스토리지 설명"
                />
              </div>
              <div className="space-y-2">
                <Label>컬러라벨(선택)</Label>
                <ColorLabelPicker
                  value={editForm.colorLabel}
                  onChange={(value) =>
                    setEditForm((prev) => ({ ...prev, colorLabel: value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>보관장소(선택)</Label>
                <Input
                  value={editForm.storageLocation}
                  onChange={(e) =>
                    setEditForm((prev) => ({
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
                  value={editForm.managementNumber}
                  onChange={(e) =>
                    setEditForm((prev) => ({
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
                    3개월
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
                    1년
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
                    3년
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
                    5년
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
                    7년
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
                    10년
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
                        !editForm.expiryDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editForm.expiryDate
                        ? format(new Date(editForm.expiryDate), 'PPP', { locale: ko })
                        : '달력에서 보관 만료일 선택'}
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
                  보관 만료일을 설정하지 않으면 이 카테고리의 문서는 만료되지 않습니다.
                  {editForm.expiryDate && ` (${format(new Date(editForm.expiryDate), 'yyyy년 MM월 dd일', { locale: ko })})`}
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
                취소
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  if (!editingSubcategory) return;
                  let scanToast: ReturnType<typeof toast> | null = null;
                  try {
                    scanToast = toast({
                      title: 'NFC 태그 인식 대기',
                      description: 'NFC 태그를 기기에 가까이 가져다 대세요.',
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
                      title: '오류',
                      description:
                        error?.message || 'NFC 태그 등록 중 오류가 발생했습니다.',
                      variant: 'destructive',
                    });
                    setNfcMode('idle');
                  }
                }}
                disabled={!editingSubcategory || isSavingEdit}
              >
                📱 NFC 태그 등록
              </Button>
              <Button
                type="button"
                onClick={handleSaveEditSubcategory}
                disabled={isSavingEdit}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSavingEdit ? '수정 중...' : '저장'}
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
              <AlertDialogTitle>세부 스토리지 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                <p>
                  "{deletingSubcategory?.name ?? ''}"을(를) 정말 삭제하시겠습니까?
                </p>
                <p className="mt-1">
                  이 세부 스토리지에 속한 문서 {deletingSubcategory?.documentCount ?? 0}개도 함께 삭제됩니다.
                </p>
                <p className="mt-3 text-sm font-medium text-red-600">
                  삭제 후에는 되돌릴 수 없습니다. 신중하게 진행하세요.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingSubcategory}>
                취소
              </AlertDialogCancel>
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
      </div>
    </DashboardLayout>
  );
}
