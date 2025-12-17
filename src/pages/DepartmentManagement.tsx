import { useState, useEffect, useCallback } from 'react';
import { Building2, FileText, Users, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export function DepartmentManagement() {
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
      setCodeError('먼저 부서 이름을 입력하세요');
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
      setNameError('부서 이름을 입력하세요');
      hasError = true;
    } else {
      setNameError('');
    }

    if (!code) {
      setCodeError('부서 코드를 입력하거나 자동 생성하세요');
      hasError = true;
    } else {
      setCodeError('');
    }

    if (hasError) return;

    setIsSaving(true);

    try {
      if (!user?.companyId) {
        toast({
          title: '회사 정보 없음',
          description: '회사 정보를 불러오지 못했습니다. 다시 로그인해주세요.',
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
        title: '부서 추가 완료',
        description: '새 부서가 추가되었습니다.',
      });

      setIsAddDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error('부서 추가 실패:', err);
      toast({
        title: '부서 추가 실패',
        description: '부서를 추가하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between md:mb-6">
          <div>
            <h1 className="text-3xl font-bold">부서 관리</h1>
            <p className="text-slate-500 mt-1">전체 부서 현황을 관리합니다</p>
          </div>
          {/* 데스크톱: 헤더 옆에 표시 */}
          <Button 
            className="hidden md:flex"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            부서 추가
          </Button>
        </div>

        {/* 모바일: 전체 너비 버튼 */}
        <Button 
          className="md:hidden w-full"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          부서 추가
        </Button>

        <Dialog
          open={isAddDialogOpen}
          onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) {
              resetForm();
            }
          }}
        >
          <DialogContent closeClassName="text-white data-[state=open]:text-white">
            <DialogHeader>
              <DialogTitle>새 부서 추가</DialogTitle>
              <DialogDescription>
                새로운 부서를 생성하고 코드와 설명을 설정합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>부서 이름</Label>
                <Input
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="예: 인사팀"
                />
                {nameError && (
                  <p className="text-xs text-red-500 mt-1">{nameError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>부서 코드</Label>
                <div className="flex gap-2">
                  <Input
                    value={newDeptCode}
                    onChange={(e) => setNewDeptCode(e.target.value)}
                    placeholder="예: HR001"
                  />
                  <Button type="button" variant="outline" onClick={handleGenerateCode}>
                    자동 생성
                  </Button>
                </div>
                {codeError && (
                  <p className="text-xs text-red-500 mt-1">{codeError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>설명</Label>
                <Textarea
                  value={newDeptDescription}
                  onChange={(e) => setNewDeptDescription(e.target.value)}
                  placeholder="부서 역할 및 설명을 입력하세요"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {departments.map((dept) => {
            const deptCategories = categories.filter(
              (c) => c.departmentId === dept.id
            );
            const deptDocuments = documents.filter(
              (d) => d.departmentId === dept.id
            );

            return (
              <Card
                key={dept.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/admin/departments/${dept.id}`)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="bg-[#2563eb] p-3 rounded-xl">
                      <Building2 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{dept.name}</CardTitle>
                      <p className="text-sm text-slate-500">{dept.code}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-slate-500" />
                          <span className="text-xs text-slate-500 whitespace-nowrap">문서</span>
                        </div>
                        <p className="text-2xl font-bold">{deptDocuments.length}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-slate-500" />
                          <span className="text-xs text-slate-500 whitespace-nowrap">카테고리</span>
                        </div>
                        <p className="text-2xl font-bold">
                          {deptCategories.length}
                        </p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-slate-500" />
                          <span className="text-xs text-slate-500 whitespace-nowrap">팀원</span>
                        </div>
                        <p className="text-2xl font-bold">{memberCounts[dept.id] ?? 0}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-slate-700">
                        주요 카테고리
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {deptCategories.slice(0, 3).map((cat) => (
                          <span
                            key={cat.id}
                            className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md"
                          >
                            {cat.name}
                          </span>
                        ))}
                        {deptCategories.length > 3 && (
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md">
                            +{deptCategories.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
