import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
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
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';
  
  // Selector 최적화: 상태값은 개별 selector로
  const departments = useDocumentStore((state) => state.departments);
  const parentCategories = useDocumentStore((state) => state.parentCategories);
  const isLoading = useDocumentStore((state) => state.isLoading);
  // 함수는 한 번에 가져오기 (참조 안정적)
  const { fetchParentCategories, addParentCategory } = useDocumentStore();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    departmentId: '',
  });
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;
  // 팀원용: 권한 있는 부서 ID 목록
  const [accessibleDepartmentIds, setAccessibleDepartmentIds] = useState<string[]>([]);

  useEffect(() => {
    fetchParentCategories();
  }, [fetchParentCategories]);

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

  const departmentMap = useMemo(
    () => new Map(departments.map((d) => [d.id, d])),
    [departments]
  );

  const filteredParentCategories = useMemo(() => {
    // 먼저 권한 있는 부서의 대분류만 필터링
    const accessibleCategories = parentCategories.filter((pc) =>
      accessibleDepartmentIds.includes(pc.departmentId)
    );
    // 그 다음 선택된 부서 필터 적용
    if (!selectedDepartmentId) return accessibleCategories;
    return accessibleCategories.filter((pc) => pc.departmentId === selectedDepartmentId);
  }, [parentCategories, selectedDepartmentId, accessibleDepartmentIds]);

  const paginatedParentCategories = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredParentCategories.slice(startIndex, endIndex);
  }, [filteredParentCategories, currentPage]);

  const totalPages = Math.ceil(filteredParentCategories.length / ITEMS_PER_PAGE);
  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, filteredParentCategories.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDepartmentId]);

  // useCallback으로 최적화
  const handleSubmit = useCallback(async () => {
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
  }, [form, addParentCategory]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">대분류 관리</h1>
            <p className="text-slate-500 mt-1">
              부서별 문서 대분류를 관리합니다
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <select
              value={selectedDepartmentId}
              onChange={(e) => setSelectedDepartmentId(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm min-w-[150px]"
            >
              <option value="">전체 부서</option>
              {departments
                .filter((dept) => accessibleDepartmentIds.includes(dept.id))
                .map((dept) => (
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

        {selectedDepartmentId && filteredParentCategories.length > 0 && (
          <p className="text-sm text-slate-500">
            {departments.find((d) => d.id === selectedDepartmentId)?.name} -
            {filteredParentCategories.length > ITEMS_PER_PAGE
              ? ` ${startItem}-${endItem} / 총 ${filteredParentCategories.length}개 대분류`
              : ` 총 ${filteredParentCategories.length}개 대분류`}
          </p>
        )}

        {isLoading && parentCategories.length === 0 ? (
          <p className="text-slate-500">로딩 중...</p>
        ) : filteredParentCategories.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              등록된 대분류가 없습니다.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedParentCategories.map((pc) => {
                const dept = departmentMap.get(pc.departmentId);
                const isAdminPath = window.location.pathname.startsWith('/admin');
                const basePath = isAdminPath ? '/admin' : '/team';
                return (
                  <Card
                    key={pc.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate(`${basePath}/parent-category/${pc.id}`)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg truncate">{pc.name}</CardTitle>
                      <CardDescription className="mt-1 truncate">
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
                          <span className="text-slate-500">세부 스토리지</span>
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

            {filteredParentCategories.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="text-sm text-slate-500">
                  {startItem}-{endItem} / 총 {filteredParentCategories.length}개
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
