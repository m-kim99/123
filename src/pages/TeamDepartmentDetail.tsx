import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/components/DashboardLayout';
import { V1StatTile, V1CardHeader, v1Card, V1PageHeader } from '@/components/ui/v1-components';
import { FileText, FolderOpen, Users, ChevronRight } from 'lucide-react';
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

          <V1PageHeader
            eyebrow={`${t('deptDetail.deptCode')}: ${department.code}`}
            title={department.name}
            sub={department.description || t('deptDetail.noDescription')}
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <V1StatTile title={t('deptDetail.docCount')} value={deptDocuments.length} icon={FileText} color="#2563eb" />
          <V1StatTile title={t('deptDetail.parentCategoryCount')} value={deptParentCategories.length} icon={FolderOpen} color="#10b981" />
          <V1StatTile title={t('deptDetail.teamMemberCount')} value={teamMembersCount} icon={Users} color="#8b5cf6" />
          <V1StatTile title={t('deptDetail.parentCategoryCount')} value={nfcCategoryCount} icon={FolderOpen} color="#f59e0b" />
        </div>

        <div className={v1Card}>
          <V1CardHeader
            title={t('deptDetail.parentCategoryList')}
            sub={t('deptDetail.parentCategoryListDesc', { name: department.name })}
            icon={FolderOpen}
            iconColor="#2563eb"
          />
          <div className="p-5 sm:p-6">
            {deptParentCategories.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                {t('deptDetail.noParentCategories')}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deptParentCategories.map((pc) => (
                  <div
                    key={pc.id}
                    className={`${v1Card} hover:shadow-lg transition-shadow cursor-pointer`}
                    onClick={() => navigate(`/team/parent-category/${pc.id}`)}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-semibold text-slate-900 truncate">{pc.name}</p>
                          <p className="text-xs text-slate-500 mt-1 truncate">
                            {pc.description || t('parentCategoryDetail.noDescription')}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300 shrink-0 mt-1" />
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">{t('deptDetail.subcategories')}</span>
                          <span className="font-semibold text-slate-900">{pc.subcategoryCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">{t('deptDetail.docCount')}</span>
                          <span className="font-semibold text-slate-900">{pc.documentCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
