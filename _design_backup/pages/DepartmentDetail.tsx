import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import penIcon from '@/assets/pen.svg';
import binIcon from '@/assets/bin.svg';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
import { useAuthStore } from '@/store/authStore';
import { DocumentBreadcrumb } from '@/components/DocumentBreadcrumb';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const primaryColor = '#2563eb';

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

  const departmentParentCategories = parentCategories.filter(
    (pc) => pc.departmentId === department.id,
  );
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

          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">{department.name}</h1>
              <p className="text-sm text-slate-500">{t('deptDetail.deptCode')}: {department.code}</p>
              <p className="text-slate-500 mt-1">
                {department.description || t('deptDetail.noDescription')}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
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
                className="text-red-500 hover:text-red-600 hover:border-red-500"
              >
                <img src={binIcon} alt={t('common.delete')} className="w-full h-full p-1.5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500 whitespace-nowrap">{t('deptDetail.docCount')}</p>
              <p className="text-2xl font-bold mt-2">{departmentDocuments.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500 whitespace-nowrap">{t('deptDetail.parentCategoryCount')}</p>
              <p className="text-2xl font-bold mt-2">{departmentParentCategories.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500 whitespace-nowrap">{t('deptDetail.teamMemberCount')}</p>
              <p className="text-2xl font-bold mt-2">{teamMembersCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500 whitespace-nowrap">{t('deptDetail.parentCategoryCount')}</p>
              <p className="text-2xl font-bold mt-2">{nfcCategoryCount}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('deptDetail.parentCategoryList')}</CardTitle>
              <CardDescription className="mt-1">
                {t('deptDetail.parentCategoryListDesc', { name: department.name })}
              </CardDescription>
            </div>
            <Button style={{ backgroundColor: primaryColor }} onClick={handleOpenAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              {t('deptDetail.addParentCategory')}
            </Button>
          </CardHeader>
          <CardContent>
            {departmentParentCategories.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                {t('deptDetail.noParentCategories')}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departmentParentCategories.map((pc) => (
                  <Card
                    key={pc.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate(`/admin/parent-category/${pc.id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <CardTitle className="text-lg truncate">{pc.name}</CardTitle>
                          <CardDescription className="mt-1 truncate">
                            {pc.description || t('parentCategoryDetail.noDescription')}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">{t('deptDetail.subcategories')}</span>
                          <span className="font-medium">{pc.subcategoryCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">{t('deptDetail.docCount')}</span>
                          <span className="font-medium">{pc.documentCount}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('deptDetail.editDeptTitle')}</DialogTitle>
              <DialogDescription>
                {t('deptDetail.editDeptDesc')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
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
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isSaving}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                onClick={handleSaveDepartment}
                disabled={isSaving}
              >
                {isSaving ? t('common.saving') : t('common.save')}
              </Button>
            </DialogFooter>
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
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('deptDetail.deleteDept')}</AlertDialogTitle>
              <AlertDialogDescription>
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
              <AlertDialogCancel disabled={isDeleting}>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteDepartment}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={isDeleting || deleteConfirmText !== t('deptDetail.confirmWord')}
              >
                {isDeleting ? t('documentMgmt.deleting') : t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('deptDetail.addParentCategoryTitle')}</DialogTitle>
              <DialogDescription>
                {t('deptDetail.addParentCategoryDesc', { name: department.name })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
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
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                onClick={handleAddCategory}
                style={{ backgroundColor: primaryColor }}
                disabled={!newParentCategoryName.trim()}
              >
                {t('common.add')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
