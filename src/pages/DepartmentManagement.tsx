import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, FileText, FolderOpen, Users, Plus, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
import { useAuthStore } from '@/store/authStore';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { BackButton } from '@/components/BackButton';
import { V1PageHeader, V1Chip, v1Card, V1ModalHeader, V1ModalBody, V1ModalFooter } from '@/components/ui/v1-components';

export function DepartmentManagement() {
  const { t } = useTranslation();
  // Selector 최적화: 상태값은 개별 selector로
  const departments = useDocumentStore((state) => state.departments);
  const categories = useDocumentStore((state) => state.categories);
  const documents = useDocumentStore((state) => state.documents);
  // 함수는 한 번에 가져오기 (참조 안정적)
  const { fetchDepartments } = useDocumentStore();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptDescription, setNewDeptDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});

  // 정렬 상태
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest' | 'alpha'>('latest');

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  const sortedDepartments = useMemo(() => {
    const arr = [...departments];
    if (sortOrder === 'alpha') {
      arr.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    } else if (sortOrder === 'latest') {
      arr.reverse();
    }
    return arr;
  }, [departments, sortOrder]);

  // 페이지네이션 계산
  const paginatedDepartments = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sortedDepartments.slice(startIndex, endIndex);
  }, [sortedDepartments, currentPage]);

  const totalPages = Math.ceil(sortedDepartments.length / ITEMS_PER_PAGE);
  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, sortedDepartments.length);

  // useCallback으로 최적화
  const resetForm = useCallback(() => {
    setNewDeptName('');
    setNewDeptCode('');
    setNewDeptDescription('');
    setNameError('');
    setCodeError('');
  }, []);

  useEffect(() => {
    const loadMemberCounts = async () => {
      if (!user?.companyId || departments.length === 0) {
        setMemberCounts({});
        return;
      }

      try {
        const deptIds = departments.map((d) => d.id);

        const { data, error } = await supabase
          .from('users')
          .select('id, department_id, role')
          .eq('company_id', user.companyId)
          .eq('role', 'team')
          .in('department_id', deptIds);

        if (error) {
          throw error;
        }

        const counts: Record<string, number> = {};
        (data || []).forEach((u: any) => {
          if (!u.department_id) return;
          counts[u.department_id] = (counts[u.department_id] || 0) + 1;
        });

        setMemberCounts(counts);
      } catch (err) {
        console.error('부서별 팀원 수 로드 실패:', err);
      }
    };

    loadMemberCounts();
  }, [user?.companyId, departments]);

  // useCallback으로 최적화
  const handleGenerateCode = useCallback(() => {
    if (!newDeptName.trim()) {
      setCodeError(t('departmentMgmt.enterDeptNameFirst'));
      return;
    }

    const base = newDeptName.trim().toUpperCase().replace(/\s+/g, '_');
    const code = base.slice(0, 10);
    setNewDeptCode(code);
    setCodeError('');
  }, [newDeptName]);

  const handleSaveDepartment = async () => {
    const name = newDeptName.trim();
    const code = newDeptCode.trim();

    let hasError = false;
    if (!name) {
      setNameError(t('departmentMgmt.enterDeptName'));
      hasError = true;
    } else {
      setNameError('');
    }

    if (!code) {
      setCodeError(t('departmentMgmt.enterDeptCode'));
      hasError = true;
    } else {
      setCodeError('');
    }

    if (hasError) return;

    setIsSaving(true);

    try {
      if (!user?.companyId) {
        toast({
          title: t('departmentMgmt.noCompanyInfo'),
          description: t('departmentMgmt.noCompanyInfoDesc'),
          variant: 'destructive',
        });
        setIsSaving(false);
        return;
      }

      const { error } = await supabase
        .from('departments')
        .insert({
          name,
          code,
          // description 컬럼이 있다면 함께 저장 (없으면 무시됨)
          description: newDeptDescription || null,
          company_id: user.companyId,
        });

      if (error) {
        throw error;
      }

      await fetchDepartments();

      toast({
        title: t('departmentMgmt.addComplete'),
        description: t('departmentMgmt.addCompleteDesc'),
      });

      setIsAddDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error('부서 추가 실패:', err);
      toast({
        title: t('departmentMgmt.addFailed'),
        description: t('departmentMgmt.addFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton className="mb-4" />
        <V1PageHeader
          title={t('departmentMgmt.title')}
          sub={t('departmentMgmt.subtitle')}
          right={
            <div className="flex items-center gap-2">
              <select
                value={sortOrder}
                onChange={(e) => { setSortOrder(e.target.value as 'latest' | 'oldest' | 'alpha'); setCurrentPage(1); }}
                className="h-9 rounded-[10px] border border-[#e5e7eb] bg-white text-[13px] text-slate-700 px-3 pr-8 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_8px_center] bg-no-repeat cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1e40af]/20 dark:bg-[#111827] dark:border-white/10 dark:text-slate-200"
              >
                <option value="latest">{t('common.sortLatest')}</option>
                <option value="oldest">{t('common.sortOldest')}</option>
                <option value="alpha">{t('common.sortAlpha')}</option>
              </select>
              <Button
                className="w-full sm:w-auto h-9 rounded-[10px]  text-[13px] font-semibold shadow-[0_1px_2px_rgba(37,99,235,0.3)]"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('departmentMgmt.addDepartment')}
              </Button>
            </div>
          }
        />

        <Dialog
          open={isAddDialogOpen}
          onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) {
              resetForm();
            }
          }}
        >
          <DialogContent variant="v1" className="max-w-[560px] flex flex-col" hideClose>
            <V1ModalHeader icon={Building2} title={t('departmentMgmt.newDepartmentTitle')} sub={t('departmentMgmt.newDepartmentDesc')} />
            <V1ModalBody>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-900">{t('departmentMgmt.deptName')}</label>
                <Input
                  className="h-[38px] rounded-lg border-[#e5e7eb] text-[14px]"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder={t('departmentMgmt.deptNamePlaceholder')}
                />
                {nameError && <p className="text-[11.5px] text-red-500 mt-0.5">{nameError}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-900">{t('departmentMgmt.deptCode')}</label>
                <div className="flex gap-2">
                  <Input
                    className="h-[38px] rounded-lg border-[#e5e7eb] text-[14px] font-mono flex-1"
                    value={newDeptCode}
                    onChange={(e) => setNewDeptCode(e.target.value)}
                    placeholder={t('departmentMgmt.deptCodePlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={handleGenerateCode}
                    className="h-[38px] px-3 rounded-lg text-[13px] font-medium border border-[#e5e7eb] bg-white text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                  >
                    {t('departmentMgmt.autoGenerate')}
                  </button>
                </div>
                {codeError && <p className="text-[11.5px] text-red-500 mt-0.5">{codeError}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-900">{t('departmentMgmt.description')} <span className="text-slate-400 font-normal">({t('common.optional', { defaultValue: '선택' })})</span></label>
                <Textarea
                  className="min-h-[64px] rounded-lg border-[#e5e7eb] text-[14px] resize-y"
                  value={newDeptDescription}
                  onChange={(e) => setNewDeptDescription(e.target.value)}
                  placeholder={t('departmentMgmt.descPlaceholder')}
                />
              </div>
            </V1ModalBody>
            <V1ModalFooter>
              <button
                type="button"
                onClick={() => setIsAddDialogOpen(false)}
                disabled={isSaving}
                className="h-9 px-4 rounded-[10px] text-[13px] font-semibold border border-[#e5e7eb] bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveDepartment}
                disabled={isSaving}
                className="h-9 px-4 rounded-[10px] text-[13px] font-semibold bg-[#1e40af] text-white hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? t('common.saving') : t('common.save')}
              </button>
            </V1ModalFooter>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {paginatedDepartments.map((dept) => {
            const deptCategories = categories.filter(
              (c) => c.departmentId === dept.id
            );
            const deptDocuments = documents.filter(
              (d) => d.departmentId === dept.id
            );

            return (
              <div
                key={dept.id}
                className={`${v1Card} cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => navigate(`/admin/departments/${dept.id}`)}
              >
                <div className="px-5 py-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[10px] bg-[#eff6ff] flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-5 w-5 text-[#1e40af]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-slate-900 truncate">{dept.name}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">{dept.code}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                </div>
                <div className="px-5 pb-5">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { icon: FileText, label: t('departmentMgmt.documents'), value: deptDocuments.length },
                      { icon: FolderOpen, label: t('departmentMgmt.parentCategories'), value: deptCategories.length },
                      { icon: Users, label: t('departmentMgmt.teamMembers'), value: memberCounts[dept.id] ?? 0 },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="bg-slate-50 rounded-[10px] p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="text-[10px] text-slate-500 leading-tight line-clamp-2">{label}</span>
                        </div>
                        <p className="text-xl font-bold text-slate-900">{value}</p>
                      </div>
                    ))}
                  </div>

                  {deptCategories.length > 0 && (
                    <div className="space-y-2 pt-3">
                      <p className="text-[11px] font-medium text-slate-500">
                        {t('departmentMgmt.mainParentCategories')}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {deptCategories.slice(0, 3).map((cat) => (
                          <V1Chip key={cat.id} variant="blue">
                            {cat.name}
                          </V1Chip>
                        ))}
                        {deptCategories.length > 3 && (
                          <V1Chip variant="neutral">
                            +{deptCategories.length - 3}
                          </V1Chip>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {departments.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div className="text-sm text-slate-500">
              {startItem}-{endItem} / {t('parentCatList.totalItems', { count: departments.length })}
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
      </div>
    </DashboardLayout>
  );
}
