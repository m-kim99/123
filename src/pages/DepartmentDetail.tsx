import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Smartphone, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
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

export function DepartmentDetail() {
  const { departmentId } = useParams<{ departmentId: string }>();
  const navigate = useNavigate();
  const { departments, categories, documents, addCategory, fetchDepartments } = useDocumentStore();
  const primaryColor = '#2563eb';

  const department = departments.find((d) => d.id === departmentId);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [newCategoryStorageLocation, setNewCategoryStorageLocation] = useState('');
  const [newCategoryNfcRegistered, setNewCategoryNfcRegistered] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editDeptName, setEditDeptName] = useState(department?.name ?? '');
  const [editDeptCode, setEditDeptCode] = useState(department?.code ?? '');
  const [editDeptDescription, setEditDeptDescription] = useState(
    department?.description ?? ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editNameError, setEditNameError] = useState('');
  const [editCodeError, setEditCodeError] = useState('');

  if (!department) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>
          <p className="text-slate-500">부서를 찾을 수 없습니다</p>
        </div>
      </DashboardLayout>
    );
  }

  const departmentCategories = categories.filter((c) => c.departmentId === department.id);
  const departmentDocuments = documents.filter((d) => d.departmentId === department.id);
  const nfcCategoryCount = departmentCategories.filter((c) => c.nfcRegistered).length;
  const teamMembersCount = 5; // 현재는 고정값, 추후 실제 데이터 연동 가능

  const handleOpenAddDialog = () => {
    setAddDialogOpen(true);
    setNewCategoryName('');
    setNewCategoryDescription('');
    setNewCategoryStorageLocation('');
    setNewCategoryNfcRegistered(false);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      return;
    }

    await addCategory({
      name: newCategoryName.trim(),
      description: newCategoryDescription,
      departmentId: department.id,
      nfcRegistered: newCategoryNfcRegistered,
      storageLocation: newCategoryStorageLocation,
    });

    setAddDialogOpen(false);
  };

  const handleSaveDepartment = async () => {
    if (!department) return;

    const name = editDeptName.trim();
    const code = editDeptCode.trim();

    let hasError = false;
    if (!name) {
      setEditNameError('부서 이름을 입력하세요');
      hasError = true;
    } else {
      setEditNameError('');
    }

    if (!code) {
      setEditCodeError('부서 코드를 입력하세요');
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
        title: '수정 완료',
        description: '부서 정보가 수정되었습니다.',
      });

      setIsEditDialogOpen(false);
    } catch (err) {
      console.error('부서 수정 실패:', err);
      toast({
        title: '수정 실패',
        description: '부서 정보를 수정하는 중 오류가 발생했습니다.',
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
        title: '삭제 완료',
        description: '부서가 삭제되었습니다.',
      });

      setIsDeleteDialogOpen(false);
      navigate('/admin/departments');
    } catch (err) {
      console.error('부서 삭제 실패:', err);
      toast({
        title: '삭제 실패',
        description: '부서를 삭제하는 중 오류가 발생했습니다.',
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
                label: '부서 관리',
                href: '/admin/departments',
              },
              {
                label: department.name,
                isCurrentPage: true,
              },
            ]}
            className="mb-2"
          />

          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>

          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">{department.name}</h1>
              <p className="text-sm text-slate-500">부서 코드: {department.code}</p>
              <p className="text-slate-500 mt-1">
                {department.description || '부서 설명이 등록되어 있지 않습니다.'}
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
                ✏️
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-red-500 hover:text-red-600 hover:border-red-500"
              >
                🗑️
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">문서 수</p>
              <p className="text-2xl font-bold mt-2">{departmentDocuments.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">카테고리 수</p>
              <p className="text-2xl font-bold mt-2">{departmentCategories.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">팀원 수</p>
              <p className="text-2xl font-bold mt-2">{teamMembersCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">NFC 등록</p>
              <p className="text-2xl font-bold mt-2">{nfcCategoryCount}개 카테고리</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>카테고리 목록</CardTitle>
              <CardDescription className="mt-1">
                {department.name} 부서에 속한 카테고리입니다
              </CardDescription>
            </div>
            <Button style={{ backgroundColor: primaryColor }} onClick={handleOpenAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              카테고리 추가
            </Button>
          </CardHeader>
          <CardContent>
            {departmentCategories.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                이 부서에 등록된 카테고리가 없습니다
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departmentCategories.map((category) => (
                  <Card
                    key={category.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate(`/admin/category/${category.id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{category.name}</CardTitle>
                          <CardDescription className="mt-1">
                            {category.description}
                          </CardDescription>
                        </div>
                        {category.nfcRegistered && (
                          <Badge variant="outline" className="ml-2">
                            <Smartphone className="h-3 w-3 mr-1" />
                            NFC
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">부서</span>
                          <span className="font-medium">{department.name}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">문서 수</span>
                          <span className="font-medium">{category.documentCount}개</span>
                        </div>
                        {category.storageLocation && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">보관 위치</span>
                            <span className="font-medium text-xs">
                              {category.storageLocation}
                            </span>
                          </div>
                        )}
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
              <DialogTitle>부서 정보 수정</DialogTitle>
              <DialogDescription>
                부서 이름, 코드, 설명을 수정합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>부서 이름</Label>
                <Input
                  value={editDeptName}
                  onChange={(e) => setEditDeptName(e.target.value)}
                  placeholder="예: 인사팀"
                />
                {editNameError && (
                  <p className="text-xs text-red-500 mt-1">{editNameError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>부서 코드</Label>
                <Input
                  value={editDeptCode}
                  onChange={(e) => setEditDeptCode(e.target.value)}
                  placeholder="예: HR001"
                />
                {editCodeError && (
                  <p className="text-xs text-red-500 mt-1">{editCodeError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>설명</Label>
                <Textarea
                  value={editDeptDescription}
                  onChange={(e) => setEditDeptDescription(e.target.value)}
                  placeholder="부서 역할 및 설명을 입력하세요"
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
                취소
              </Button>
              <Button
                type="button"
                onClick={handleSaveDepartment}
                disabled={isSaving}
              >
                {isSaving ? '저장 중...' : '저장'}
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
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>부서 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                <p>"{department.name}" 부서를 정말 삭제하시겠습니까?</p>
                <p className="mt-1">
                  이 부서의 카테고리 {departmentCategories.length}개와 문서{' '}
                  {departmentDocuments.length}개도 함께 삭제됩니다.
                </p>
                <p className="mt-3 text-sm font-medium text-red-600">
                  삭제 후에는 되돌릴 수 없습니다. 신중하게 진행하세요.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteDepartment}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={isDeleting}
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 카테고리 추가</DialogTitle>
              <DialogDescription>
                {department.name} 부서에 속한 새로운 카테고리를 생성합니다
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>카테고리 이름</Label>
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="예: 계약서"
                />
              </div>
              <div className="space-y-2">
                <Label>설명</Label>
                <Textarea
                  value={newCategoryDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                  placeholder="카테고리 설명"
                />
              </div>
              <div className="space-y-2">
                <Label>보관 위치</Label>
                <Input
                  value={newCategoryStorageLocation}
                  onChange={(e) => setNewCategoryStorageLocation(e.target.value)}
                  placeholder="예: A동 2층 캐비닛 3"
                />
              </div>
              <div className="space-y-2">
                <Label>NFC 등록 여부</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="dept-new-nfc-yes"
                      name="dept-new-nfc-registered"
                      checked={newCategoryNfcRegistered === true}
                      onChange={() => setNewCategoryNfcRegistered(true)}
                      className="h-4 w-4"
                    />
                    <Label
                      htmlFor="dept-new-nfc-yes"
                      className="font-normal cursor-pointer"
                    >
                      등록됨
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="dept-new-nfc-no"
                      name="dept-new-nfc-registered"
                      checked={newCategoryNfcRegistered === false}
                      onChange={() => setNewCategoryNfcRegistered(false)}
                      className="h-4 w-4"
                    />
                    <Label
                      htmlFor="dept-new-nfc-no"
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
              >
                취소
              </Button>
              <Button
                type="button"
                onClick={handleAddCategory}
                style={{ backgroundColor: primaryColor }}
                disabled={!newCategoryName.trim()}
              >
                추가
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
