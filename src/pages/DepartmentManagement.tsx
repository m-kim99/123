import { Building2, FileText, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';

export function DepartmentManagement() {
  const { departments, categories, documents } = useDocumentStore();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">부서 관리</h1>
          <p className="text-slate-500 mt-1">전체 부서 현황을 관리합니다</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {departments.map((dept) => {
            const deptCategories = categories.filter(
              (c) => c.departmentId === dept.id
            );
            const deptDocuments = documents.filter(
              (d) => d.departmentId === dept.id
            );

            return (
              <Card key={dept.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="bg-[#FF8C42] p-3 rounded-xl">
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
                          <span className="text-xs text-slate-500">문서</span>
                        </div>
                        <p className="text-2xl font-bold">{deptDocuments.length}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-slate-500" />
                          <span className="text-xs text-slate-500">카테고리</span>
                        </div>
                        <p className="text-2xl font-bold">
                          {deptCategories.length}
                        </p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-slate-500" />
                          <span className="text-xs text-slate-500">팀원</span>
                        </div>
                        <p className="text-2xl font-bold">5</p>
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
                            className="px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded-md"
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
