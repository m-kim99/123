import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Smartphone, CalendarIcon } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
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
import { readNFCUid, writeNFCUrl } from '@/lib/nfc';
import { toast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export function SubcategoryManagement() {
  const navigate = useNavigate();
  
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
    clearNfcFromSubcategory,
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
    defaultExpiryDays: null as number | null,
  });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(
    null,
  );
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    storageLocation: '',
    defaultExpiryDays: null as number | null,
  });
  const [editNameError, setEditNameError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // NFC 재등록 확인 다이얼로그 상태
  const [nfcConfirmDialogOpen, setNfcConfirmDialogOpen] = useState(false);
  const [pendingNfcUid, setPendingNfcUid] = useState<string | null>(null);
  const [pendingNfcSubcategoryId, setPendingNfcSubcategoryId] = useState<string | null>(null);
  const [existingNfcSubcategory, setExistingNfcSubcategory] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    // Zustand actions는 안정적이므로 getState()로 직접 호출
    useDocumentStore.getState().fetchParentCategories();
    useDocumentStore.getState().fetchSubcategories();
  }, []);

  const filteredParentCategories = useMemo(
    () =>
      selectedDepartmentId
        ? parentCategories.filter((pc) => pc.departmentId === selectedDepartmentId)
        : parentCategories,
    [parentCategories, selectedDepartmentId]
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
    [subcategories, selectedDepartmentId, selectedParentCategoryId]
  );

  // useCallback으로 최적화
  const handleDelete = useCallback(async (id: string) => {
    const confirmed = window.confirm('정말 이 세부 카테고리를 삭제하시겠습니까? 관련 문서도 함께 제거될 수 있습니다.');
    if (!confirmed) return;

    try {
      await deleteSubcategory(id);
    } catch (error) {
      console.error('세부 카테고리 삭제 실패:', error);
    }
  }, [deleteSubcategory]);

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
      });

      setAddDialogOpen(false);
      setForm({
        name: '',
        description: '',
        departmentId: '',
        parentCategoryId: '',
        storageLocation: '',
        defaultExpiryDays: null,
      });

      await fetchSubcategories();
    } catch (error) {
      console.error('세부 카테고리 추가 실패:', error);
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
        nfcRegistered: false,
        nfcUid: null,
        defaultExpiryDays: form.defaultExpiryDays,
      });

      if (!created) {
        toast({
          title: '세부 카테고리 생성 실패',
          description: '세부 카테고리를 생성하지 못해 NFC를 등록할 수 없습니다.',
          variant: 'destructive',
        });
        return;
      }

      const uid = await readNFCUid();

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
        defaultExpiryDays: null,
      });
    } catch (error: any) {
      console.error('세부 카테고리 생성 및 NFC 등록 실패:', error);
      toast({
        title: 'NFC 등록 실패',
        description:
          error?.message || '세부 카테고리 생성 또는 NFC 등록 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const proceedNfcRegistration = async (uid: string, subcategoryId: string) => {
    try {
      const targetSub = subcategories.find((s) => s.id === subcategoryId);

      // 기존에 이 UID를 쓰던 세부 카테고리가 있으면 NFC 정보 해제
      const existingSub = await findSubcategoryByNfcUid(uid);
      if (existingSub && existingSub.id !== subcategoryId) {
        await clearNfcFromSubcategory(existingSub.id);
      }

      // NFC 태그에 세부 카테고리용 URL을 쓴다
      const subName = targetSub?.name || subcategoryId;
      await writeNFCUrl(subcategoryId, subName);

      // 세부 카테고리 테이블에 UID 및 등록 여부 반영
      await registerNfcTag(subcategoryId, uid);

      toast({
        title: 'NFC 등록 완료',
        description: 'NFC에 세부 카테고리가 등록되었습니다.',
      });

      await fetchSubcategories();

      // 상태 초기화
      setPendingNfcUid(null);
      setPendingNfcSubcategoryId(null);
      setExistingNfcSubcategory(null);
      setNfcConfirmDialogOpen(false);
    } catch (error: any) {
      console.error('NFC 등록 실패:', error);
      toast({
        title: 'NFC 등록 실패',
        description:
          error?.message || 'NFC 태그를 등록하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
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
      defaultExpiryDays: null,
    });
  };

  // useCallback으로 최적화
  const handleNfcConfirmNo = useCallback(() => {
    setPendingNfcUid(null);
    setPendingNfcSubcategoryId(null);
    setExistingNfcSubcategory(null);
    setNfcConfirmDialogOpen(false);
  }, []);

  const handleOpenEditDialog = (sub: Subcategory) => {
    setEditingSubcategory(sub);
    setEditForm({
      name: sub.name || '',
      description: sub.description || '',
      storageLocation: sub.storageLocation || '',
      defaultExpiryDays: sub.defaultExpiryDays || null,
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
        defaultExpiryDays: editForm.defaultExpiryDays,
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">세부 카테고리 관리</h1>
            <p className="text-slate-500 mt-1">
              부서와 대분류별로 세부 카테고리를 조회하고 관리합니다.
            </p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            세부 카테고리 추가
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>필터</CardTitle>
            <CardDescription>
              부서와 대분류를 선택하여 세부 카테고리 목록을 좁힐 수 있습니다.
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
                  {departments.map((dept) => (
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
            <CardTitle>세부 카테고리 목록</CardTitle>
            <CardDescription>
              목록에서 세부 카테고리를 선택하여 상세 페이지로 이동하거나 삭제할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && subcategories.length === 0 ? (
              <p className="text-slate-500">로딩 중...</p>
            ) : filteredSubcategories.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                조건에 해당하는 세부 카테고리가 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSubcategories.map((sub) => {
                  const dept = departments.find((d) => d.id === sub.departmentId);
                  const parent = parentCategories.find((pc) => pc.id === sub.parentCategoryId);
                  return (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() =>
                          navigate(
                            `/admin/parent-category/${sub.parentCategoryId}/subcategory/${sub.id}`
                          )
                        }
                      >
                        <p className="font-medium truncate">{sub.name}</p>
                        <p className="text-sm text-slate-500 truncate">
                          {parent ? `${parent.name} · ` : ''}
                          {dept ? dept.name : sub.departmentId}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          문서 {sub.documentCount}개 · NFC{' '}
                          {sub.nfcRegistered ? '등록됨' : '미등록'}
                          {sub.defaultExpiryDays && ` · 만료 ${Math.round(sub.defaultExpiryDays / 365)}년`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleOpenEditDialog(sub)}
                        >
                          ✏️
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(sub.id)}
                          className="text-red-500 hover:text-red-600 border-gray-200 hover:border-red-500"
                        >
                          🗑️
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 세부 카테고리 추가</DialogTitle>
              <DialogDescription>
                부서와 대분류를 선택하여 세부 카테고리를 생성합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
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
                  {departments.map((dept) => (
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
                <Label>세부 카테고리 이름</Label>
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
                  placeholder="세부 카테고리 설명"
                />
              </div>
              <div className="space-y-2">
                <Label>보관 위치</Label>
                <Input
                  value={form.storageLocation}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      storageLocation: e.target.value,
                    }))
                  }
                  placeholder="예: A동 2층 캐비닛 3"
                />
              </div>
              <div className="space-y-2">
                <Label>기본 만료일 (선택)</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setForm((prev) => ({ ...prev, defaultExpiryDays: 90 }))}
                  >
                    3개월
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setForm((prev) => ({ ...prev, defaultExpiryDays: 365 }))}
                  >
                    1년
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setForm((prev) => ({ ...prev, defaultExpiryDays: 1095 }))}
                  >
                    3년
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setForm((prev) => ({ ...prev, defaultExpiryDays: 1825 }))}
                  >
                    5년
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setForm((prev) => ({ ...prev, defaultExpiryDays: 2555 }))}
                  >
                    7년
                  </Button>
                  {form.defaultExpiryDays && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setForm((prev) => ({ ...prev, defaultExpiryDays: null }))}
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
                        !form.defaultExpiryDays && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.defaultExpiryDays
                        ? format(addDays(new Date(), form.defaultExpiryDays), 'PPP', { locale: ko })
                        : '달력에서 만료일 선택'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      captionLayout="dropdown"
                      fromYear={2020}
                      toYear={2040}
                      selected={form.defaultExpiryDays ? addDays(new Date(), form.defaultExpiryDays) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const diffTime = date.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          setForm((prev) => ({
                            ...prev,
                            defaultExpiryDays: diffDays,
                          }));
                        }
                      }}
                      initialFocus
                      className="bg-white"
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-slate-500">
                  만료일을 설정하지 않으면 이 카테고리의 문서는 만료되지 않습니다.
                  {form.defaultExpiryDays && ` (약 ${Math.round(form.defaultExpiryDays / 365)}년, ${form.defaultExpiryDays}일)`}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
                disabled={isSaving}
              >
                취소
              </Button>
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
                세부 카테고리만 추가
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>세부 카테고리 수정</DialogTitle>
              <DialogDescription>
                선택한 세부 카테고리 정보를 수정합니다.
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
              <div className="space-y-2">
                <Label>기본 만료일 (선택)</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditForm((prev) => ({ ...prev, defaultExpiryDays: 90 }))}
                  >
                    3개월
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditForm((prev) => ({ ...prev, defaultExpiryDays: 365 }))}
                  >
                    1년
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditForm((prev) => ({ ...prev, defaultExpiryDays: 1095 }))}
                  >
                    3년
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditForm((prev) => ({ ...prev, defaultExpiryDays: 1825 }))}
                  >
                    5년
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditForm((prev) => ({ ...prev, defaultExpiryDays: 2555 }))}
                  >
                    7년
                  </Button>
                  {editForm.defaultExpiryDays && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditForm((prev) => ({ ...prev, defaultExpiryDays: null }))}
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
                        !editForm.defaultExpiryDays && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editForm.defaultExpiryDays
                        ? format(addDays(new Date(), editForm.defaultExpiryDays), 'PPP', { locale: ko })
                        : '달력에서 만료일 선택'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      captionLayout="dropdown"
                      fromYear={2020}
                      toYear={2040}
                      selected={editForm.defaultExpiryDays ? addDays(new Date(), editForm.defaultExpiryDays) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const diffTime = date.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          setEditForm((prev) => ({
                            ...prev,
                            defaultExpiryDays: diffDays,
                          }));
                        }
                      }}
                      initialFocus
                      className="bg-white"
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-slate-500">
                  만료일을 설정하지 않으면 이 카테고리의 문서는 만료되지 않습니다.
                  {editForm.defaultExpiryDays && ` (약 ${Math.round(editForm.defaultExpiryDays / 365)}년, ${editForm.defaultExpiryDays}일)`}
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
                onClick={handleSaveEditSubcategory}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? '수정 중...' : '저장'}
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
      </div>
    </DashboardLayout>
  );
}
