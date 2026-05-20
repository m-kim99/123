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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { BackButton } from '@/components/BackButton';
import { V1PageHeader, V1Chip, v1Card } from '@/components/ui/v1-components';

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

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // 페이지네이션 계산
  const paginatedDepartments = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return departments.slice(startIndex, endIndex);
  }, [departments, currentPage]);

  const totalPages = Math.ceil(departments.length / ITEMS_PER_PAGE);
  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, departments.length);

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
            <Button
              className="w-full sm:w-auto h-9 rounded-[10px] bg-[#2563eb] hover:bg-[#1d4ed8] text-[13px] font-semibold shadow-[0_1px_2px_rgba(37,99,235,0.3)]"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('departmentMgmt.addDepartment')}
            </Button>
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
          <DialogContent className="rounded-[14px]" closeClassName="text-white data-[state=open]:text-white">
            <DialogHeader>
              <DialogTitle>{t('departmentMgmt.newDepartmentTitle')}</DialogTitle>
              <DialogDescription>
                {t('departmentMgmt.newDepartmentDesc')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('departmentMgmt.deptName')}</Label>
                <Input
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder={t('departmentMgmt.deptNamePlaceholder')}
                />
                {nameError && (
                  <p className="text-xs text-red-500 mt-1">{nameError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t('departmentMgmt.deptCode')}</Label>
                <div className="flex gap-2">
                  <Input
                    value={newDeptCode}
                    onChange={(e) => setNewDeptCode(e.target.value)}
                    placeholder={t('departmentMgmt.deptCodePlaceholder')}
                  />
                  <Button type="button" variant="outline" onClick={handleGenerateCode}>
                    {t('departmentMgmt.autoGenerate')}
                  </Button>
                </div>
                {codeError && (
                  <p className="text-xs text-red-500 mt-1">{codeError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t('departmentMgmt.description')}</Label>
                <Textarea
                  value={newDeptDescription}
                  onChange={(e) => setNewDeptDescription(e.target.value)}
                  placeholder={t('departmentMgmt.descPlaceholder')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-[10px] h-9"
                onClick={() => setIsAddDialogOpen(false)}
                disabled={isSaving}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                className="rounded-[10px] h-9 bg-[#2563eb] hover:bg-[#1d4ed8]"
                onClick={handleSaveDepartment}
                disabled={isSaving}
              >
                {isSaving ? t('common.saving') : t('common.save')}
              </Button>
            </DialogFooter>
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
                    <Building2 className="h-5 w-5 text-[#2563eb]" />
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
