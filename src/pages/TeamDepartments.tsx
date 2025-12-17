import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, FileText, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useDocumentStore } from '@/store/documentStore';

interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  created_at: string;
  document_count?: number;
  member_count?: number;
}

export function TeamDepartments() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  
  // Selector 최적화: 상태값은 개별 selector로
  const categories = useDocumentStore((state) => state.categories);
  const documents = useDocumentStore((state) => state.documents);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setIsLoading(true);
    try {
      if (!user?.companyId) {
        setDepartments([]);
        return;
      }

      // 1. 자신이 속한 부서는 자동으로 접근 가능
      const ownDepartmentId = user?.departmentId;

      // 2. 추가로 권한이 부여된 부서 가져오기 (role이 none이 아닌 경우)
      const { data: permissionData, error: permError } = await supabase
        .from('user_permissions')
        .select('department_id, role')
        .eq('user_id', user?.id)
        .neq('role', 'none');

      if (permError) throw permError;

      // 3. 자신의 부서 + 권한 부여된 부서 합치기 (중복 제거)
      const permissionDeptIds = permissionData?.map((p: any) => p.department_id) || [];
      const allDepartmentIds = new Set<string>([
        ...(ownDepartmentId ? [ownDepartmentId] : []),
        ...permissionDeptIds,
      ]);
      const departmentIds = Array.from(allDepartmentIds);

      if (departmentIds.length === 0) {
        setDepartments([]);
        setIsLoading(false);
        return;
      }

      // 부서 정보 가져오기
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .in('id', departmentIds)
        .eq('company_id', user.companyId)
        .order('name');

      if (deptError) throw deptError;

      // 각 부서의 문서 수 및 팀원 수 계산
      const departmentsWithCount = await Promise.all(
        (deptData || []).map(async (dept: any) => {
          const { count: documentCount } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('department_id', dept.id);

          const { count: memberCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', user.companyId)
            .eq('department_id', dept.id)
            .eq('role', 'team');

          return {
            ...dept,
            document_count: documentCount || 0,
            member_count: memberCount || 0,
          } as Department;
        })
      );

      setDepartments(departmentsWithCount);
    } catch (error) {
      console.error('부서 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">전체 부서 보기</h1>
          <p className="text-slate-500 mt-1">접근 가능한 부서 목록입니다</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-slate-500">부서를 불러오는 중...</p>
          </div>
        ) : departments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">접근 가능한 부서가 없습니다.</p>
              <p className="text-sm text-slate-400 mt-2">
                관리자에게 부서 접근 권한을 요청하세요.
              </p>
            </CardContent>
          </Card>
        ) : (
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
                  onClick={() => navigate(`/team/department/${dept.id}`)}
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
                          <p className="text-2xl font-bold">{deptCategories.length}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="h-4 w-4 text-slate-500" />
                            <span className="text-xs text-slate-500 whitespace-nowrap">팀원</span>
                          </div>
                          <p className="text-2xl font-bold">{dept.member_count ?? 0}</p>
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
        )}
      </div>
    </DashboardLayout>
  );
}
