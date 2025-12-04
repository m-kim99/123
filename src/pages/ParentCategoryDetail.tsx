import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Smartphone } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  } = useDocumentStore();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    storageLocation: '',
    nfcRegistered: false,
  });

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
        nfcRegistered: form.nfcRegistered,
        storageLocation: form.storageLocation,
      });
      setAddDialogOpen(false);
      setForm({
        name: '',
        description: '',
        storageLocation: '',
        nfcRegistered: false,
      });
    } finally {
      setIsSaving(false);
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
              <div className="space-y-2">
                <Label>NFC 등록 여부</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="sub-nfc-yes"
                      name="sub-nfc-registered"
                      className="h-4 w-4"
                      checked={form.nfcRegistered === true}
                      onChange={() =>
                        setForm((prev) => ({ ...prev, nfcRegistered: true }))
                      }
                    />
                    <Label htmlFor="sub-nfc-yes" className="font-normal cursor-pointer">
                      등록됨
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="sub-nfc-no"
                      name="sub-nfc-registered"
                      className="h-4 w-4"
                      checked={form.nfcRegistered === false}
                      onChange={() =>
                        setForm((prev) => ({ ...prev, nfcRegistered: false }))
                      }
                    />
                    <Label htmlFor="sub-nfc-no" className="font-normal cursor-pointer">
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
                onClick={handleAddSubcategory}
                disabled={isSaving || !form.name.trim()}
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
