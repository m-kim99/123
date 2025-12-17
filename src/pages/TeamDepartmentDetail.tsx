import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { DocumentBreadcrumb } from '@/components/DocumentBreadcrumb';

export function TeamDepartmentDetail() {
  const { departmentId } = useParams<{ departmentId: string }>();
  const navigate = useNavigate();
  const [teamMembersCount, setTeamMembersCount] = useState<number>(0);
  const user = useAuthStore((state) => state.user);
  
  // Selector 최적화: 상태값은 개별 selector로
  const departments = useDocumentStore((state) => state.departments);
  const parentCategories = useDocumentStore((state) => state.parentCategories);
  const documents = useDocumentStore((state) => state.documents);

  const department = departments.find((d) => d.id === departmentId);
  const deptParentCategories = parentCategories.filter(
    (pc) => pc.departmentId === departmentId,
  );
  const deptDocuments = documents.filter((d) => d.departmentId === departmentId);
  const nfcCategoryCount = deptParentCategories.length;

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <DocumentBreadcrumb
            items={[
              {
                label: '부서 보기',
                href: '/team/departments',
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
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500 whitespace-nowrap">문서 수</p>
              <p className="text-2xl font-bold mt-2">{deptDocuments.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500 whitespace-nowrap">카테고리 수</p>
              <p className="text-2xl font-bold mt-2">{deptParentCategories.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500 whitespace-nowrap">팀원 수</p>
              <p className="text-2xl font-bold mt-2">{teamMembersCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500 whitespace-nowrap">대분류 수</p>
              <p className="text-2xl font-bold mt-2">{nfcCategoryCount}개</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>대분류 목록</CardTitle>
              <CardDescription className="mt-1">
                {department.name} 부서에 속한 대분류입니다
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {deptParentCategories.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                이 부서에 등록된 대분류가 없습니다
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deptParentCategories.map((pc) => (
                  <Card
                    key={pc.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate(`/team/parent-category/${pc.id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{pc.name}</CardTitle>
                          <CardDescription className="mt-1">
                            {pc.description || '설명이 없습니다.'}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">세부 카테고리</span>
                          <span className="font-medium">{pc.subcategoryCount}개</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">문서 수</span>
                          <span className="font-medium">{pc.documentCount}개</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
