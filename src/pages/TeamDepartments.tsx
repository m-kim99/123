import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { V1Chip, v1Card } from '@/components/ui/v1-components';
import { Building2, FileText, Users, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useDocumentStore } from '@/store/documentStore';
import { BackButton } from '@/components/BackButton';

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
  const { t } = useTranslation();
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
        <BackButton className="mb-4" />
        <div className="min-w-0">
          <h1 className="text-[28px] sm:text-[30px] font-bold tracking-tight text-slate-900">{t('teamDepts.title')}</h1>
          <p className="text-sm text-slate-500 mt-1.5">{t('teamDepts.subtitle')}</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-slate-500">{t('teamDepts.loadingDepts')}</p>
          </div>
        ) : departments.length === 0 ? (
          <div className={v1Card}>
            <div className="py-12 text-center">
              <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">{t('teamDepts.noDepts')}</p>
              <p className="text-sm text-slate-400 mt-2">
                {t('teamDepts.requestAccess')}
              </p>
            </div>
          </div>
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
                <div
                  key={dept.id}
                  className={`${v1Card} cursor-pointer hover:shadow-md transition-shadow`}
                  onClick={() => navigate(`/team/department/${dept.id}`)}
                >
                  <div className="px-5 py-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[10px] bg-[#eff6ff] flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5 text-[#2563eb]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-slate-900 truncate">{dept.name}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{dept.code}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                  </div>
                  <div className="px-5 pb-5">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-slate-50 rounded-[10px] p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="text-[10px] text-slate-500 leading-tight">{t('common.documents')}</span>
                        </div>
                        <p className="text-xl font-bold text-slate-900">{deptDocuments.length}</p>
                      </div>
                      <div className="bg-slate-50 rounded-[10px] p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="text-[10px] text-slate-500 leading-tight">{t('sharedDocs.category')}</span>
                        </div>
                        <p className="text-xl font-bold text-slate-900">{deptCategories.length}</p>
                      </div>
                      <div className="bg-slate-50 rounded-[10px] p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="text-[10px] text-slate-500 leading-tight">{t('common.team')}</span>
                        </div>
                        <p className="text-xl font-bold text-slate-900">{dept.member_count ?? 0}</p>
                      </div>
                    </div>

                    {deptCategories.length > 0 && (
                      <div className="space-y-2 pt-3">
                        <p className="text-[11px] font-medium text-slate-500">
                          {t('teamDepts.mainCategories')}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {deptCategories.slice(0, 3).map((cat) => (
                            <V1Chip key={cat.id} variant="blue">
                              {cat.name}
                            </V1Chip>
                          ))}
                          {deptCategories.length > 3 && (
                            <V1Chip variant="neutral">
                              +{deptCategories.length - 3}
                            </V1Chip>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
