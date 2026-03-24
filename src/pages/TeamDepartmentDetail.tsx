import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { DocumentBreadcrumb } from '@/components/DocumentBreadcrumb';
import { BackButton } from '@/components/BackButton';

export function TeamDepartmentDetail() {
  const { t } = useTranslation();
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
          <BackButton />
          <p className="text-slate-500">{t('deptDetail.notFound')}</p>
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
                label: t('teamDeptDetail.viewDepts'),
                href: '/team/departments',
              },
              {
                label: department.name,
                isCurrentPage: true,
              },
            ]}
            className="mb-2"
          />

          <BackButton className="mb-4" />

          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">{department.name}</h1>
              <p className="text-sm text-slate-500">{t('deptDetail.deptCode')}: {department.code}</p>
              <p className="text-slate-500 mt-1">
                {department.description || t('deptDetail.noDescription')}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500 whitespace-nowrap">{t('deptDetail.docCount')}</p>
              <p className="text-2xl font-bold mt-2">{deptDocuments.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500 whitespace-nowrap">{t('deptDetail.parentCategoryCount')}</p>
              <p className="text-2xl font-bold mt-2">{deptParentCategories.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500 whitespace-nowrap">{t('deptDetail.teamMemberCount')}</p>
              <p className="text-2xl font-bold mt-2">{teamMembersCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500 whitespace-nowrap">{t('deptDetail.parentCategoryCount')}</p>
              <p className="text-2xl font-bold mt-2">{nfcCategoryCount}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('deptDetail.parentCategoryList')}</CardTitle>
              <CardDescription className="mt-1">
                {t('deptDetail.parentCategoryListDesc', { name: department.name })}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {deptParentCategories.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                {t('deptDetail.noParentCategories')}
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
                            {pc.description || t('parentCategoryDetail.noDescription')}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">{t('deptDetail.subcategories')}</span>
                          <span className="font-medium">{pc.subcategoryCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">{t('deptDetail.docCount')}</span>
                          <span className="font-medium">{pc.documentCount}</span>
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
