import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FolderOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';

export function TeamDepartmentDetail() {
  const { departmentId } = useParams<{ departmentId: string }>();
  const navigate = useNavigate();
  
  // Selector 최적화: 상태값은 개별 selector로
  const departments = useDocumentStore((state) => state.departments);
  const parentCategories = useDocumentStore((state) => state.parentCategories);
  const documents = useDocumentStore((state) => state.documents);

  const department = departments.find((d) => d.id === departmentId);
  const deptParentCategories = parentCategories.filter(
    (pc) => pc.departmentId === departmentId,
  );
  const deptDocuments = documents.filter((d) => d.departmentId === departmentId);

  if (!department) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-slate-500">부서를 찾을 수 없습니다.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => navigate('/team/departments')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>

          <h1 className="text-3xl font-bold text-slate-900">{department.name}</h1>
          <p className="text-slate-500 mt-1">{department.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">부서 코드</p>
              <p className="text-2xl font-bold mt-2">{department.code}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">총 대분류</p>
              <p className="text-2xl font-bold mt-2">{deptParentCategories.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">총 문서</p>
              <p className="text-2xl font-bold mt-2">{deptDocuments.length}</p>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-4">대분류 목록</h2>

          {deptParentCategories.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FolderOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">대분류가 없습니다.</p>
              </CardContent>
            </Card>
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
                      <CardTitle className="text-lg">{pc.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-500 mb-4">{pc.description}</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">문서 수</span>
                        <span className="font-medium">{pc.documentCount}개</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
