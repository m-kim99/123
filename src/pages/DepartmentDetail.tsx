import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Smartphone, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export function DepartmentDetail() {
  const { departmentId } = useParams<{ departmentId: string }>();
  const navigate = useNavigate();
  const { departments, categories, documents, addCategory } = useDocumentStore();
  const primaryColor = '#2563eb';

  const department = departments.find((d) => d.id === departmentId);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [newCategoryStorageLocation, setNewCategoryStorageLocation] = useState('');
  const [newCategoryNfcRegistered, setNewCategoryNfcRegistered] = useState(false);

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{department.name}</h1>
              <p className="text-slate-500 mt-1">부서 코드: {department.code}</p>
              <p className="text-slate-500 mt-1">
                부서 설명이 등록되어 있지 않습니다.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-[#2563eb] p-3 rounded-xl">
                <Building2 className="h-6 w-6 text-white" />
              </div>
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
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="new-nfc-registered"
                  checked={newCategoryNfcRegistered}
                  onCheckedChange={(checked) =>
                    setNewCategoryNfcRegistered(Boolean(checked))
                  }
                />
                <Label htmlFor="new-nfc-registered">NFC 등록 여부</Label>
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
