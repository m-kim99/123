import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, FolderOpen, Archive, Star, Clock, Users, ChevronRight } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import { useFavoriteStore } from '@/store/favoriteStore';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { V1StatTile, V1CardHeader, v1Card } from '@/components/ui/v1-components';

const card = v1Card;

export function TeamDashboard() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const departments = useDocumentStore((state) => state.departments);
  const documents = useDocumentStore((state) => state.documents);
  const parentCategories = useDocumentStore((state) => state.parentCategories);
  const subcategories = useDocumentStore((state) => state.subcategories);
  const navigate = useNavigate();

  const favorites = useFavoriteStore((state) => state.favorites);
  const recentVisits = useFavoriteStore((state) => state.recentVisits);
  const { fetchFavorites, fetchRecentVisits } = useFavoriteStore();

  const [accessibleDepartmentIds, setAccessibleDepartmentIds] = useState<string[]>([]);
  const [memberCount, setMemberCount] = useState(0);

  useEffect(() => {
    fetchFavorites();
    fetchRecentVisits(5);
  }, [fetchFavorites, fetchRecentVisits]);

  useEffect(() => {
    const fetchAccessibleDepartments = async () => {
      if (!user?.id) { setAccessibleDepartmentIds([]); return; }
      const ownDeptId = user.departmentId;
      const { data: permissionData } = await supabase
        .from('user_permissions')
        .select('department_id')
        .eq('user_id', user.id)
        .neq('role', 'none');
      const permDeptIds = permissionData?.map((p: any) => p.department_id) || [];
      const allIds = new Set<string>([...(ownDeptId ? [ownDeptId] : []), ...permDeptIds]);
      setAccessibleDepartmentIds(Array.from(allIds));
    };
    fetchAccessibleDepartments();
  }, [user?.id, user?.departmentId]);

  useEffect(() => {
    const fetchMemberCount = async () => {
      if (!user?.departmentId) return;
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('department_id', user.departmentId);
      setMemberCount(count ?? 0);
    };
    fetchMemberCount();
  }, [user?.departmentId]);

  const userDepartment = departments.find((d) => d.id === user?.departmentId);
  const userDocuments = documents.filter((d) => accessibleDepartmentIds.includes(d.departmentId));
  const userParentCategories = parentCategories.filter(
    (pc) => accessibleDepartmentIds.includes(pc.departmentId),
  );
  const userSubcategories = subcategories.filter(
    (sc) => accessibleDepartmentIds.includes(sc.departmentId),
  );

  const today = new Date();
  const dateStr = today.toLocaleDateString(i18n.language === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  const stats = [
    { title: t('dashboard.accessibleDocuments'),       value: userDocuments.length,       icon: FileText, color: '#2563eb' },
    { title: t('dashboard.accessibleParentCategories'), value: userParentCategories.length, icon: FolderOpen, color: '#10b981' },
    { title: t('dashboard.accessibleSubcategories'),   value: userSubcategories.length,   icon: Archive,  color: '#8b5cf6' },
    { title: t('dashboard.myTeamMembers'),             value: memberCount,                 icon: Users,    color: '#f59e0b' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Greeting */}
        <div>
          <p className="text-sm text-slate-500 font-medium mb-1.5">{dateStr}</p>
          <h1 className="text-[28px] sm:text-[30px] font-bold tracking-tight leading-tight text-slate-900">
            {i18n.language === 'ko'
              ? `안녕하세요, ${user?.name || ''}님 👋`
              : `Hello, ${user?.name || ''}!`}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {userDepartment?.name}{userDepartment?.code ? ` · ${userDepartment.code}` : ''}
          </p>
        </div>

        {/* KPI tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((s) => (
            <V1StatTile key={s.title} title={s.title} value={s.value} icon={s.icon} color={s.color} />
          ))}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4 sm:gap-6">
          {/* 접근 가능한 상위 카테고리 현황 */}
          <div className={card}>
            <V1CardHeader
              title={t('dashboard.parentCategoryDocStatus')}
              icon={FolderOpen}
              iconColor="#2563eb"
              action={
                <button
                  onClick={() => navigate('/team/parent-categories')}
                  className="text-xs font-medium text-slate-500 border border-[#e5e7eb] rounded-[10px] px-3 py-1.5 hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  {t('common.viewAll')}
                </button>
              }
            />
            <div>
              {userParentCategories.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">
                  {t('statistics.addParentCategory')}
                </p>
              ) : (
                userParentCategories.slice(0, 6).map((category) => {
                  const docCount = documents.filter((d) => d.parentCategoryId === category.id).length;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => navigate(`/team/parent-category/${category.id}`)}
                      className="w-full flex items-center gap-3 sm:gap-4 px-5 sm:px-6 py-3.5 border-b border-slate-50 last:border-b-0 hover:bg-slate-50/60 transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-[10px] bg-[#eff6ff] flex items-center justify-center shrink-0">
                        <FolderOpen className="h-[18px] w-[18px] text-[#2563eb]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-900 truncate">{category.name}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{userDepartment?.name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xl font-bold text-slate-900">{docCount}</p>
                        <p className="text-[10px] text-slate-400">{t('common.documents')}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 우측 패널 */}
          <div className="flex flex-col gap-4">
            {/* 즐겨찾기 */}
            <div className={card}>
              <div className="px-4 py-3.5 border-b border-slate-100 flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <h2 className="text-sm font-semibold text-slate-900">{t('dashboard.favorites')}</h2>
              </div>
              <div className="py-1">
                {favorites.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-5">
                    {t('dashboard.noFavorites')}
                  </p>
                ) : (
                  favorites.slice(0, 4).map((fav) => (
                    <button
                      key={fav.id}
                      type="button"
                      onClick={() => {
                        if (!fav.parentCategoryId) return;
                        navigate(
                          `/team/parent-category/${fav.parentCategoryId}/subcategory/${fav.subcategoryId}`,
                        );
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-b-0"
                    >
                      <p className="font-medium text-sm text-slate-900 truncate">
                        {fav.subcategoryName || t('dashboard.unnamedSubcategory')}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {[fav.departmentName, fav.parentCategoryName].filter(Boolean).join(' · ')}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* 최근 방문 — 타임라인 */}
            <div className={card}>
              <div className="px-4 py-3.5 border-b border-slate-100 flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#2563eb]" />
                <h2 className="text-sm font-semibold text-slate-900">{t('dashboard.recentVisits')}</h2>
              </div>
              <div className="px-4 py-2">
                {recentVisits.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-5">
                    {t('dashboard.noRecentVisits')}
                  </p>
                ) : (
                  <div className="relative">
                    <div className="absolute left-2.5 top-3 bottom-3 w-px bg-slate-100" />
                    {recentVisits.slice(0, 5).map((visit) => (
                      <button
                        key={visit.id}
                        type="button"
                        onClick={() =>
                          navigate(
                            `/team/parent-category/${visit.parentCategoryId}/subcategory/${visit.subcategoryId}`,
                          )
                        }
                        className="relative flex items-start gap-3 py-2.5 w-full text-left"
                      >
                        <div className="w-5 h-5 rounded-full bg-[#eff6ff] border-2 border-white shadow-sm flex items-center justify-center shrink-0 z-10 mt-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#2563eb]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs text-slate-900 truncate">
                            {visit.subcategoryName || t('dashboard.unnamedSubcategory')}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {formatDistanceToNow(new Date(visit.visitedAt), {
                              locale: i18n.language === 'ko' ? ko : undefined,
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
