import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
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

export function ParentCategoryList() {
  const navigate = useNavigate();
  const {
    departments,
    parentCategories,
    isLoading,
    fetchParentCategories,
    addParentCategory,
  } = useDocumentStore();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    departmentId: '',
  });
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');

  useEffect(() => {
    fetchParentCategories();
  }, [fetchParentCategories]);

  const departmentMap = useMemo(
    () => new Map(departments.map((d) => [d.id, d])),
    [departments]
  );

  const filteredParentCategories = useMemo(() => {
    if (!selectedDepartmentId) return parentCategories;
    return parentCategories.filter((pc) => pc.departmentId === selectedDepartmentId);
  }, [parentCategories, selectedDepartmentId]);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.departmentId) {
      return;
    }

    setIsSaving(true);
    try {
      await addParentCategory({
        name: form.name.trim(),
        description: form.description,
        departmentId: form.departmentId,
      });
      setAddDialogOpen(false);
      setForm({ name: '', description: '', departmentId: '' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">대분류 관리</h1>
            <p className="text-slate-500 mt-1">
              부서별 문서 대분류(Parent Category)를 관리합니다.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <select
              value={selectedDepartmentId}
              onChange={(e) => setSelectedDepartmentId(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm min-w-[150px]"
            >
              <option value="">전체 부서</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              대분류 추가
            </Button>
          </div>
        </div>

        {selectedDepartmentId && (
          <p className="text-sm text-slate-500">
            {departments.find((d) => d.id === selectedDepartmentId)?.name} - 총{' '}
            {filteredParentCategories.length}개 대분류
          </p>
        )}

        {isLoading && parentCategories.length === 0 ? (
          <p className="text-slate-500">로딩 중...</p>
        ) : parentCategories.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              등록된 대분류가 없습니다.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredParentCategories.map((pc) => {
              const dept = departmentMap.get(pc.departmentId);
              return (
                <Card
                  key={pc.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/admin/parent-category/${pc.id}`)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{pc.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {pc.description || '설명이 없습니다.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">부서</span>
                        <span className="font-medium">
                          {dept?.name ?? pc.departmentId}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">세부 카테고리</span>
                        <span className="font-medium">{pc.subcategoryCount}개</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">문서 수</span>
                        <span className="font-medium">{pc.documentCount}개</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 대분류 추가</DialogTitle>
              <DialogDescription>
                부서에 속한 새로운 문서 대분류를 생성합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>대분류 이름</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="예: 인사 문서"
                />
              </div>
              <div className="space-y-2">
                <Label>부서</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={form.departmentId}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      departmentId: e.target.value,
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
                <Label>설명</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="대분류 설명을 입력하세요"
                />
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
                  isSaving || !form.name.trim() || !form.departmentId
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
