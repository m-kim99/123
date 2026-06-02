import { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { BackButton } from '@/components/BackButton';
import { V1ModalHeader, V1ModalBody, V1ModalFooter, V1PageHeader, v1Card } from '@/components/ui/v1-components';

export function ParentCategoryList() {
  const { t } = useTranslation();
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
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest' | 'alpha'>('latest');

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
    const filtered = selectedDepartmentId
      ? accessibleCategories.filter((pc) => pc.departmentId === selectedDepartmentId)
      : accessibleCategories;
    const arr = [...filtered];
    if (sortOrder === 'alpha') {
      arr.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    } else if (sortOrder === 'latest') {
      arr.reverse();
    }
    return arr;
  }, [parentCategories, selectedDepartmentId, accessibleDepartmentIds, sortOrder]);

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
        <BackButton className="mb-4" />
        <V1PageHeader
          title={t('parentCatList.title')}
          sub={t('parentCatList.subtitle')}
          right={
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <select
              value={selectedDepartmentId}
              onChange={(e) => setSelectedDepartmentId(e.target.value)}
              className="border border-[#e5e7eb] rounded-[10px] px-3 py-2 text-sm min-w-[150px] bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
            >
              <option value="">{t('parentCatList.allDepartments')}</option>
              {departments
                .filter((dept) => accessibleDepartmentIds.includes(dept.id))
                .map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
            </select>
            <select
              value={sortOrder}
              onChange={(e) => { setSortOrder(e.target.value as 'latest' | 'oldest' | 'alpha'); setCurrentPage(1); }}
              className="h-9 rounded-[10px] border border-[#e5e7eb] bg-white text-[13px] text-slate-700 px-3 pr-8 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_8px_center] bg-no-repeat cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 dark:bg-[#111827] dark:border-white/10 dark:text-slate-200"
            >
              <option value="latest">{t('common.sortLatest')}</option>
              <option value="oldest">{t('common.sortOldest')}</option>
              <option value="alpha">{t('common.sortAlpha')}</option>
            </select>
            <Button className="w-full sm:w-auto" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('deptDetail.addParentCategory')}
            </Button>
            </div>
          }
        />

        {selectedDepartmentId && filteredParentCategories.length > 0 && (
          <p className="text-sm text-slate-500">
            {departments.find((d) => d.id === selectedDepartmentId)?.name} -
            {filteredParentCategories.length > ITEMS_PER_PAGE
              ? ` ${startItem}-${endItem} / ${t('parentCatList.totalCategories', { count: filteredParentCategories.length })}`
              : ` ${t('parentCatList.totalCategories', { count: filteredParentCategories.length })}`}
          </p>
        )}

        {isLoading && parentCategories.length === 0 ? (
          <p className="text-slate-500">{t('common.loading')}</p>
        ) : filteredParentCategories.length === 0 ? (
          <div className={v1Card}>
            <div className="py-12 text-center text-slate-500">
              {t('deptDetail.noParentCategories')}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedParentCategories.map((pc) => {
                const dept = departmentMap.get(pc.departmentId);
                const isAdminPath = window.location.pathname.startsWith('/admin');
                const basePath = isAdminPath ? '/admin' : '/team';
                return (
                  <div
                    key={pc.id}
                    className={`${v1Card} hover:shadow-lg transition-shadow cursor-pointer`}
                    onClick={() => navigate(`${basePath}/parent-category/${pc.id}`)}
                  >
                    <div className="p-5">
                      <p className="text-base font-semibold text-slate-900 dark:text-[#f1f5f9] truncate">{pc.name}</p>
                      <p className="text-xs text-slate-500 dark:text-[#94a3b8] mt-1 truncate">
                        {pc.description || t('parentCategoryDetail.noDescription')}
                      </p>
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06] space-y-2 text-sm">
                        {[
                          { label: t('common.department'), value: dept?.name ?? pc.departmentId },
                          { label: t('deptDetail.subcategories'), value: pc.subcategoryCount },
                          { label: t('deptDetail.docCount'), value: pc.documentCount },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex items-center justify-between">
                            <span className="text-slate-500 dark:text-[#94a3b8]">{label}</span>
                            <span className="font-semibold text-slate-900 dark:text-[#f1f5f9]">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredParentCategories.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="text-sm text-slate-500">
                  {startItem}-{endItem} / {t('parentCatList.totalItems', { count: filteredParentCategories.length })}
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

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent variant="v1" className="max-w-[560px] flex flex-col" hideClose>
            <V1ModalHeader icon={FolderOpen} title={t('deptDetail.addParentCategoryTitle')} sub={t('parentCatList.addDialogDesc')} />
            <V1ModalBody>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-slate-900">{t('deptDetail.parentCategoryName')}</label>
                  <Input
                    className="h-[38px] rounded-lg border-[#e5e7eb] text-[14px]"
                    value={form.name}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder={t('deptDetail.parentCategoryNamePlaceholder')}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-slate-900">{t('common.department')}</label>
                  <select
                    className="h-[38px] rounded-lg border border-[#e5e7eb] px-3 text-[14px] bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30"
                    value={form.departmentId}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        departmentId: e.target.value,
                      }))
                    }
                  >
                    <option value="">{t('parentCatList.selectDept')}</option>
                    {departments
                      .filter((dept) => accessibleDepartmentIds.includes(dept.id))
                      .map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name} ({dept.code})
                        </option>
                      ))}
                  </select>
                </div>
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
                  placeholder={t('deptDetail.parentCategoryDescPlaceholder')}
                />
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
                disabled={isSaving || !form.name.trim() || !form.departmentId}
                className="h-9 px-4 rounded-[10px] text-[13px] font-semibold bg-[#2563eb] text-white hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? t('announcements.adding') : t('common.add')}
              </button>
            </V1ModalFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
