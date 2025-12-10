import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Smartphone } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DocumentBreadcrumb } from '@/components/DocumentBreadcrumb';
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
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { readNFCUid, writeNFCUrl } from '@/lib/nfc';
import { useAuthStore } from '@/store/authStore';

export function ParentCategoryDetail() {
  const { parentCategoryId } = useParams<{ parentCategoryId: string }>();
  const navigate = useNavigate();
  const {
    departments,
    parentCategories,
    subcategories,
    documents,
    fetchParentCategories,
    fetchSubcategories,
    fetchDocuments,
    addSubcategory,
    registerNfcTag,
  } = useDocumentStore();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    storageLocation: '',
  });

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editNameError, setEditNameError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!parentCategoryId) return;
    fetchParentCategories();
    fetchSubcategories(parentCategoryId);
    if (documents.length === 0) {
      fetchDocuments();
    }
  }, [parentCategoryId, fetchParentCategories, fetchSubcategories, fetchDocuments, documents.length]);

  const parentCategory = useMemo(
    () => parentCategories.find((pc) => pc.id === parentCategoryId),
    [parentCategories, parentCategoryId]
  );

  const department = useMemo(
    () =>
      parentCategory
        ? departments.find((d) => d.id === parentCategory.departmentId)
        : undefined,
    [departments, parentCategory]
  );

  const childSubcategories = useMemo(
    () =>
      parentCategoryId
        ? subcategories.filter((s) => s.parentCategoryId === parentCategoryId)
        : [],
    [subcategories, parentCategoryId]
  );

  const parentDocumentsCount = useMemo(
    () =>
      parentCategoryId
        ? documents.filter((d) => d.parentCategoryId === parentCategoryId).length
        : 0,
    [documents, parentCategoryId]
  );

  const handleAddSubcategory = async () => {
    if (!parentCategory || !form.name.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await addSubcategory({
        name: form.name.trim(),
        description: form.description,
        parentCategoryId: parentCategory.id,
        departmentId: parentCategory.departmentId,
        nfcUid: null,
        nfcRegistered: false,
        storageLocation: form.storageLocation,
      });
      setAddDialogOpen(false);
      setForm({
        name: '',
        description: '',
        storageLocation: '',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSubcategoryWithNfc = async () => {
    if (!parentCategory || !form.name.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      const created = await addSubcategory({
        name: form.name.trim(),
        description: form.description,
        parentCategoryId: parentCategory.id,
        departmentId: parentCategory.departmentId,
        nfcUid: null,
        nfcRegistered: true,
        storageLocation: form.storageLocation,
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

      await writeNFCUrl(created.id, created.name);

      await registerNfcTag(created.id, uid);

      const { user } = useAuthStore.getState();
      const { error: mappingError } = await supabase
        .from('nfc_mappings')
        .upsert(
          {
            tag_id: uid,
            subcategory_id: created.id,
            registered_by: user?.id ?? null,
          },
          { onConflict: 'tag_id' },
        );

      if (mappingError) {
        throw mappingError;
      }

      toast({
        title: 'NFC 등록 완료',
        description: 'NFC에 세부 카테고리가 등록되었습니다.',
      });

      setAddDialogOpen(false);
      setForm({
        name: '',
        description: '',
        storageLocation: '',
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

  const handleOpenEditDialog = () => {
    if (!parentCategory) return;
    setEditName(parentCategory.name);
    setEditDescription(parentCategory.description || '');
    setEditNameError('');
    setIsEditDialogOpen(true);
  };

  const handleSaveParentCategory = async () => {
    if (!parentCategory) return;

    const name = editName.trim();
    const description = editDescription.trim();

    if (!name) {
      setEditNameError('대분류 이름을 입력하세요');
      return;
    }
    setEditNameError('');

    setIsSavingEdit(true);
    try {
      const { error } = await supabase
        .from('categories')
        .update({
          name,
          description: description || null,
        })
        .eq('id', parentCategory.id);

      if (error) throw error;

      await fetchParentCategories();

      toast({
        title: '수정 완료',
        description: '대분류 정보가 수정되었습니다.',
      });

      setIsEditDialogOpen(false);
    } catch (err) {
      console.error('대분류 수정 실패:', err);
      toast({
        title: '수정 실패',
        description: '대분류 정보를 수정하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDeleteParentCategory = async () => {
    if (!parentCategory) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', parentCategory.id);

      if (error) throw error;

      await fetchParentCategories();

      toast({
        title: '삭제 완료',
        description: '대분류가 삭제되었습니다.',
      });

      setIsDeleteDialogOpen(false);
      navigate(-1);
    } catch (err) {
      console.error('대분류 삭제 실패:', err);
      toast({
        title: '삭제 실패',
        description: '대분류를 삭제하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
      setIsDeleting(false);
    }
  };

  if (!parentCategoryId) {
    return null;
  }

  if (!parentCategory) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>
          <p className="text-slate-500">대분류를 찾을 수 없습니다.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <DocumentBreadcrumb
            items={(() => {
              const isAdmin = window.location.pathname.startsWith('/admin');
              const departmentHref =
                department?.id &&
                (isAdmin
                  ? `/admin/departments/${department.id}`
                  : `/team/department/${department.id}`);

              return [
                {
                  label: department?.name || '부서',
                  href: departmentHref || undefined,
                },
                {
                  label: parentCategory.name,
                  isCurrentPage: true,
                },
              ];
            })()}
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
              <h1 className="text-3xl font-bold">{parentCategory.name}</h1>
              <p className="text-slate-500 mt-1">
                {parentCategory.description || '설명이 등록되어 있지 않습니다.'}
              </p>
              {department && (
                <p className="text-sm text-slate-500 mt-1">
                  부서: {department.name} ({department.code})
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleOpenEditDialog}
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">세부 카테고리 수</p>
              <p className="text-2xl font-bold mt-2">{childSubcategories.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">문서 수</p>
              <p className="text-2xl font-bold mt-2">{parentDocumentsCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">NFC 등록 세부 카테고리</p>
              <p className="text-2xl font-bold mt-2">
                {childSubcategories.filter((s) => s.nfcRegistered).length}개
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>세부 카테고리</CardTitle>
              <CardDescription className="mt-1">
                이 대분류에 속한 세부 카테고리 목록입니다.
              </CardDescription>
            </div>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              세부 카테고리 추가
            </Button>
          </CardHeader>
          <CardContent>
            {childSubcategories.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                등록된 세부 카테고리가 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {childSubcategories.map((sub) => (
                  <Card
                    key={sub.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() =>
                      navigate(
                        `/admin/parent-category/${parentCategory.id}/subcategory/${sub.id}`
                      )
                    }
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{sub.name}</CardTitle>
                          <CardDescription className="mt-1">
                            {sub.description || '설명이 없습니다.'}
                          </CardDescription>
                        </div>
                        {sub.nfcRegistered && (
                          <Badge variant="outline" className="ml-2">
                            <Smartphone className="h-3 w-3 mr-1" />
                            NFC
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">문서 수</span>
                          <span className="font-medium">{sub.documentCount}개</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">부서</span>
                          <span className="font-medium">
                            {department?.name ?? sub.departmentId}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">보관 위치</span>
                          <span className="font-medium text-xs">
                            {sub.storageLocation || '미지정'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 세부 카테고리 추가</DialogTitle>
              <DialogDescription>
                {parentCategory.name} 대분류에 속한 세부 카테고리를 생성합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
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
              {/* NFC 등록 여부는 DB(nfcRegistered) 기반으로 카드/상태에서만 표시하고,
                  추가 다이얼로그에서는 직접 입력받지 않는다. */}
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
                onClick={handleAddSubcategory}
                variant="outline"
                disabled={isSaving || !form.name.trim()}
              >
                세부 카테고리만 추가
              </Button>
              <Button
                type="button"
                onClick={handleAddSubcategoryWithNfc}
                disabled={isSaving || !form.name.trim()}
                className="flex items-center gap-2"
              >
                <Smartphone className="h-4 w-4" />
                NFC 등록하며 추가
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
              <AlertDialogTitle>대분류 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                <p>"{parentCategory.name}" 대분류를 정말 삭제하시겠습니까?</p>
                <p className="mt-1">
                  이 대분류에 속한 세부 카테고리 및 문서에 영향이 있을 수 있습니다.
                </p>
                <p className="mt-3 text-sm font-medium text-red-600">
                  삭제 후에는 되돌릴 수 없습니다. 신중하게 진행하세요.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteParentCategory}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={isDeleting}
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              setEditNameError('');
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>대분류 정보 수정</DialogTitle>
              <DialogDescription>
                대분류 이름과 설명을 수정합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>대분류 이름</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="예: 채용 문서"
                />
                {editNameError && (
                  <p className="text-xs text-red-500 mt-1">{editNameError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>설명</Label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="대분류 설명을 입력하세요"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isSavingEdit}
              >
                취소
              </Button>
              <Button
                type="button"
                onClick={handleSaveParentCategory}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? '저장 중...' : '저장'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
