import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, FileText, FolderOpen, Users, ChevronRight, Pencil } from 'lucide-react';
import penIcon from '@/assets/icons/pen.svg';
import binIcon from '@/assets/icons/bin.svg';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/DashboardLayout';
import { V1StatTile, V1CardHeader, v1Card, V1PageHeader, V1ModalHeader, V1ModalBody, V1ModalFooter } from '@/components/ui/v1-components';
import { useDocumentStore } from '@/store/documentStore';
import { useAuthStore } from '@/store/authStore';
import { DocumentBreadcrumb } from '@/components/DocumentBreadcrumb';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { BackButton } from '@/components/BackButton';

export function DepartmentDetail() {
  const { t } = useTranslation();
  const { departmentId } = useParams<{ departmentId: string }>();
  const navigate = useNavigate();
  
  // Selector 최적화: 상태값은 개별 selector로
  const departments = useDocumentStore((state) => state.departments);
  const parentCategories = useDocumentStore((state) => state.parentCategories);
  const documents = useDocumentStore((state) => state.documents);
  // 함수는 한 번에 가져오기 (참조 안정적)
  const { addParentCategory, fetchDepartments } = useDocumentStore();
  const user = useAuthStore((state) => state.user);

  const department = departments.find((d) => d.id === departmentId);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newParentCategoryName, setNewParentCategoryName] = useState('');
  const [newParentCategoryDescription, setNewParentCategoryDescription] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editDeptName, setEditDeptName] = useState(department?.name ?? '');
  const [editDeptCode, setEditDeptCode] = useState(department?.code ?? '');
  const [editDeptDescription, setEditDeptDescription] = useState(
    department?.description ?? ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [editNameError, setEditNameError] = useState('');
  const [editCodeError, setEditCodeError] = useState('');
  const [teamMembersCount, setTeamMembersCount] = useState(0);
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest' | 'alpha'>('latest');

  if (!department) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <BackButton />
          <p className="text-slate-500">{t('deptDetail.notFound')}</p>
        </div>
      </DashboardLayout>
    );
  }

  const departmentParentCategories = useMemo(() => {
    const filtered = parentCategories.filter((pc) => pc.departmentId === department.id);
    const arr = [...filtered];
    if (sortOrder === 'alpha') {
      arr.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    } else if (sortOrder === 'latest') {
      arr.reverse();
    }
    return arr;
  }, [parentCategories, department.id, sortOrder]);
  const departmentDocuments = documents.filter((d) => d.departmentId === department.id);
  const nfcCategoryCount = departmentParentCategories.length;

  useEffect(() => {
    const loadTeamMembersCount = async () => {
      if (!department || !user?.companyId) {
        setTeamMembersCount(0);
        return;
      }

      try {
        const { count, error } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', user.companyId)
          .eq('department_id', department.id)
          .eq('role', 'team');

        if (error) {
          throw error;
        }

        setTeamMembersCount(count || 0);
      } catch (err) {
        console.error('팀원 수 로드 실패:', err);
      }
    };

    loadTeamMembersCount();
  }, [department, user?.companyId]);

  const handleOpenAddDialog = () => {
    setAddDialogOpen(true);
    setNewParentCategoryName('');
    setNewParentCategoryDescription('');
  };

  const handleAddCategory = async () => {
    if (!newParentCategoryName.trim()) {
      return;
    }

    await addParentCategory({
      name: newParentCategoryName.trim(),
      description: newParentCategoryDescription,
      departmentId: department.id,
    });

    setAddDialogOpen(false);
    setNewParentCategoryName('');
    setNewParentCategoryDescription('');
  };

  const handleSaveDepartment = async () => {
    if (!department) return;

    const name = editDeptName.trim();
    const code = editDeptCode.trim();

    let hasError = false;
    if (!name) {
      setEditNameError(t('deptDetail.enterDeptName'));
      hasError = true;
    } else {
      setEditNameError('');
    }

    if (!code) {
      setEditCodeError(t('deptDetail.enterDeptCode'));
      hasError = true;
    } else {
      setEditCodeError('');
    }

    if (hasError) return;

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('departments')
        .update({
          name,
          code,
          description: editDeptDescription || null,
        })
        .eq('id', department.id);

      if (error) {
        throw error;
      }

      await fetchDepartments();

      toast({
        title: t('deptDetail.editComplete'),
        description: t('deptDetail.editCompleteDesc'),
      });

      setIsEditDialogOpen(false);
    } catch (err) {
      console.error('부서 수정 실패:', err);
      toast({
        title: t('deptDetail.editFailed'),
        description: t('deptDetail.editFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDeleteDepartment = async () => {
    if (!department) return;

    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', department.id);

      if (error) {
        throw error;
      }

      await fetchDepartments();

      toast({
        title: t('documentMgmt.deleteComplete'),
        description: t('deptDetail.deleteCompleteDesc'),
      });

      setIsDeleteDialogOpen(false);
      navigate('/admin/departments');
    } catch (err) {
      console.error('부서 삭제 실패:', err);
      toast({
        title: t('documentMgmt.deleteFailed'),
        description: t('deptDetail.deleteFailedDesc'),
        variant: 'destructive',
      });
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <DocumentBreadcrumb
            items={[
              {
                label: t('nav.departmentManagement'),
                href: '/admin/departments',
              },
              {
                label: department.name,
                isCurrentPage: true,
              },
            ]}
            className="mb-2"
          />

          <BackButton className="mb-4" />

          <V1PageHeader
            eyebrow={`${t('deptDetail.deptCode')}: ${department.code}`}
            title={department.name}
            sub={department.description || t('deptDetail.noDescription')}
            right={
              <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="icon"
                className="rounded-[10px]"
                onClick={() => {
                  setEditDeptName(department.name);
                  setEditDeptCode(department.code);
                  setEditDeptDescription(department.description ?? '');
                  setEditNameError('');
                  setEditCodeError('');
                  setIsEditDialogOpen(true);
                }}
              >
                <img src={penIcon} alt={t('common.edit')} className="w-full h-full p-1.5" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="rounded-[10px] text-red-500 hover:text-red-600 hover:border-red-500"
              >
                <img src={binIcon} alt={t('common.delete')} className="w-full h-full p-1.5" />
              </Button>
              </div>
            }
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <V1StatTile title={t('deptDetail.docCount')} value={departmentDocuments.length} icon={FileText} color="#1e40af" />
          <V1StatTile title={t('deptDetail.parentCategoryCount')} value={departmentParentCategories.length} icon={FolderOpen} color="#10b981" />
          <V1StatTile title={t('deptDetail.teamMemberCount')} value={teamMembersCount} icon={Users} color="#8b5cf6" />
          <V1StatTile title={t('deptDetail.parentCategoryCount')} value={nfcCategoryCount} icon={FolderOpen} color="#f59e0b" />
        </div>

        <div className={v1Card}>
          <V1CardHeader
            title={t('deptDetail.parentCategoryList')}
            sub={t('deptDetail.parentCategoryListDesc', { name: department.name })}
            icon={FolderOpen}
            iconColor="#1e40af"
            action={
              <div className="flex items-center gap-2">
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'latest' | 'oldest' | 'alpha')}
                  className="h-9 rounded-[10px] border border-[#e5e7eb] bg-white text-[13px] text-slate-700 px-3 pr-8 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_8px_center] bg-no-repeat cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1e40af]/20 dark:bg-[#111827] dark:border-white/10 dark:text-slate-200"
                >
                  <option value="latest">{t('common.sortLatest')}</option>
                  <option value="oldest">{t('common.sortOldest')}</option>
                  <option value="alpha">{t('common.sortAlpha')}</option>
                </select>
                <Button className="h-9 rounded-[10px]  text-[13px] font-semibold shadow-[0_1px_2px_rgba(37,99,235,0.3)]" onClick={handleOpenAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('deptDetail.addParentCategory')}
                </Button>
              </div>
            }
          />
          <div className="p-5 sm:p-6">
            {departmentParentCategories.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                {t('deptDetail.noParentCategories')}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departmentParentCategories.map((pc) => (
                  <div
                    key={pc.id}
                    className={`${v1Card} hover:shadow-lg transition-shadow cursor-pointer`}
                    onClick={() => navigate(`/admin/parent-category/${pc.id}`)}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-semibold text-slate-900 truncate">{pc.name}</p>
                          <p className="text-xs text-slate-500 mt-1 truncate">
                            {pc.description || t('parentCategoryDetail.noDescription')}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300 shrink-0 mt-1" />
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">{t('deptDetail.subcategories')}</span>
                          <span className="font-semibold text-slate-900">{pc.subcategoryCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">{t('deptDetail.docCount')}</span>
                          <span className="font-semibold text-slate-900">{pc.documentCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <Dialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              setEditNameError('');
              setEditCodeError('');
            }
          }}
        >
          <DialogContent variant="v1" className="max-w-[560px] flex flex-col" hideClose>
            <V1ModalHeader icon={Pencil} title={t('deptDetail.editDeptTitle')} sub={t('deptDetail.editDeptDesc')} />
            <V1ModalBody>
              <div className="space-y-2">
                <Label>{t('deptDetail.deptName')}</Label>
                <Input
                  value={editDeptName}
                  onChange={(e) => setEditDeptName(e.target.value)}
                  placeholder={t('deptDetail.deptNamePlaceholder')}
                />
                {editNameError && (
                  <p className="text-xs text-red-500 mt-1">{editNameError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t('deptDetail.deptCode')}</Label>
                <Input
                  value={editDeptCode}
                  onChange={(e) => setEditDeptCode(e.target.value)}
                  placeholder={t('deptDetail.deptCodePlaceholder')}
                />
                {editCodeError && (
                  <p className="text-xs text-red-500 mt-1">{editCodeError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t('parentCategoryDetail.description')}</Label>
                <Textarea
                  value={editDeptDescription}
                  onChange={(e) => setEditDeptDescription(e.target.value)}
                  placeholder={t('deptDetail.deptDescPlaceholder')}
                />
              </div>
            </V1ModalBody>
            <V1ModalFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-[10px] h-9"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isSaving}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                className="rounded-[10px] h-9"
                onClick={handleSaveDepartment}
                disabled={isSaving}
              >
                {isSaving ? t('common.saving') : t('common.save')}
              </Button>
            </V1ModalFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={(open) => {
            setIsDeleteDialogOpen(open);
            if (!open) {
              setIsDeleting(false);
              setDeleteConfirmText('');
            }
          }}
        >
          <AlertDialogContent className="dark:bg-[#111827] dark:border-white/[0.08]">
            <AlertDialogHeader>
              <AlertDialogTitle className="dark:text-[#f1f5f9]">{t('deptDetail.deleteDept')}</AlertDialogTitle>
              <AlertDialogDescription className="dark:text-[#94a3b8]">
                <p>{t('deptDetail.deleteDeptConfirm', { name: department.name })}</p>
                <p className="mt-1">
                  {t('deptDetail.deleteDeptWarning', { categories: departmentParentCategories.length, docs: departmentDocuments.length })}
                </p>
                <p className="mt-3 text-sm font-medium text-red-600">
                  {t('documentMgmt.deleteIrreversible')}
                </p>
                <div className="mt-4">
                  <p className="text-sm text-slate-600 mb-2">
                    {t('deptDetail.typeToConfirm')} <span className="font-bold text-red-600">{t('deptDetail.confirmWord')}</span>
                  </p>
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={t('deptDetail.confirmWord')}
                    className="mt-1"
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting} className="dark:bg-[#1e293b] dark:text-[#cbd5e1] dark:border-white/[0.08]">{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteDepartment}
                className="bg-[#ef4444] hover:bg-[#dc2626] dark:bg-[#f87171] dark:hover:bg-[#fca5a5] dark:text-slate-900"
                disabled={isDeleting || deleteConfirmText !== t('deptDetail.confirmWord')}
              >
                {isDeleting ? t('documentMgmt.deleting') : t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent variant="v1" className="max-w-[560px] flex flex-col" hideClose>
            <V1ModalHeader icon={FolderOpen} title={t('deptDetail.addParentCategoryTitle')} sub={t('deptDetail.addParentCategoryDesc', { name: department.name })} />
            <V1ModalBody>
              <div className="space-y-2">
                <Label>{t('deptDetail.parentCategoryName')}</Label>
                <Input
                  value={newParentCategoryName}
                  onChange={(e) => setNewParentCategoryName(e.target.value)}
                  placeholder={t('deptDetail.parentCategoryNamePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('parentCategoryDetail.description')}</Label>
                <Textarea
                  value={newParentCategoryDescription}
                  onChange={(e) => setNewParentCategoryDescription(e.target.value)}
                  placeholder={t('deptDetail.parentCategoryDescPlaceholder')}
                />
              </div>
            </V1ModalBody>
            <V1ModalFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-[10px] h-9"
                onClick={() => setAddDialogOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                onClick={handleAddCategory}
                className="rounded-[10px] h-9"
                disabled={!newParentCategoryName.trim()}
              >
                {t('common.add')}
              </Button>
            </V1ModalFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
