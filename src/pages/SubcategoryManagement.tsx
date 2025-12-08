import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export function SubcategoryManagement() {
  const navigate = useNavigate();
  const {
    departments,
    parentCategories,
    subcategories,
    isLoading,
    fetchParentCategories,
    fetchSubcategories,
    addSubcategory,
    deleteSubcategory,
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
    nfcRegistered: false,
  });

  useEffect(() => {
    fetchParentCategories();
    fetchSubcategories();
  }, [fetchParentCategories, fetchSubcategories]);

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

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('정말 이 세부 카테고리를 삭제하시겠습니까? 관련 문서도 함께 제거될 수 있습니다.');
    if (!confirmed) return;

    try {
      await deleteSubcategory(id);
    } catch (error) {
      console.error('세부 카테고리 삭제 실패:', error);
    }
  };

  const handleSubmit = async () => {
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
        nfcRegistered: form.nfcRegistered,
        nfcUid: null,
      });

      setAddDialogOpen(false);
      setForm({
        name: '',
        description: '',
        departmentId: '',
        parentCategoryId: '',
        storageLocation: '',
        nfcRegistered: false,
      });

      await fetchSubcategories();
    } catch (error) {
      console.error('세부 카테고리 추가 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              돌아가기
            </Button>
            <div>
              <h1 className="text-3xl font-bold">세부 카테고리 관리</h1>
              <p className="text-slate-500 mt-1">
                부서와 대분류별로 세부 카테고리를 조회하고 관리합니다.
              </p>
            </div>
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
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            navigate(
                              `/admin/parent-category/${sub.parentCategoryId}/subcategory/${sub.id}`
                            )
                          }
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
                <Label>NFC 등록 여부</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="sub-mgmt-nfc-yes"
                      name="sub-mgmt-nfc-registered"
                      className="h-4 w-4"
                      checked={form.nfcRegistered === true}
                      onChange={() =>
                        setForm((prev) => ({ ...prev, nfcRegistered: true }))
                      }
                    />
                    <Label
                      htmlFor="sub-mgmt-nfc-yes"
                      className="font-normal cursor-pointer"
                    >
                      등록됨
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="sub-mgmt-nfc-no"
                      name="sub-mgmt-nfc-registered"
                      className="h-4 w-4"
                      checked={form.nfcRegistered === false}
                      onChange={() =>
                        setForm((prev) => ({ ...prev, nfcRegistered: false }))
                      }
                    />
                    <Label
                      htmlFor="sub-mgmt-nfc-no"
                      className="font-normal cursor-pointer"
                    >
                      미등록
                    </Label>
                  </div>
                </div>
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
                disabled={
                  isSaving ||
                  !form.name.trim() ||
                  !form.departmentId ||
                  !form.parentCategoryId
                }
              >
                {isSaving ? '추가 중...' : '추가'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
