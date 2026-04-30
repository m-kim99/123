import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Building2, Star, Clock, FolderOpen, Archive } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
import { useNavigate } from 'react-router-dom';
import { useFavoriteStore } from '@/store/favoriteStore';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const departments = useDocumentStore((state) => state.departments);
  const documents = useDocumentStore((state) => state.documents);
  const parentCategories = useDocumentStore((state) => state.parentCategories);
  const subcategories = useDocumentStore((state) => state.subcategories);
  const navigate = useNavigate();

  // Selector 최적화: 상태값은 개별 selector로
  const favorites = useFavoriteStore((state) => state.favorites);
  const recentVisits = useFavoriteStore((state) => state.recentVisits);
  const departmentStats = useFavoriteStore((state) => state.departmentStats);
  // 함수는 한 번에 가져오기 (참조 안정적)
  const { fetchFavorites, fetchRecentVisits, fetchDepartmentStats } = useFavoriteStore();

  useEffect(() => {
    fetchFavorites();
    fetchRecentVisits(5);
    fetchDepartmentStats();
  }, [fetchFavorites, fetchRecentVisits, fetchDepartmentStats]);

  const stats = [
    {
      title: t('dashboard.totalDepartments'),
      value: departments.length,
      icon: Building2,
      color: '#2563eb',
    },
    {
      title: t('dashboard.totalDocuments'),
      value: documents.length,
      icon: FileText,
      color: '#3B82F6',
    },
    {
      title: t('dashboard.totalParentCategories'),
      value: parentCategories.length,
      icon: FolderOpen,
      color: '#3b82f6',
    },
    {
      title: t('dashboard.totalSubcategories'),
      value: subcategories.length,
      icon: Archive,
      color: '#8B5CF6',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('dashboard.title')}</h1>
          <p className="text-slate-500 mt-1">{t('dashboard.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        {stat.title}
                      </p>
                      <p className="text-3xl font-bold mt-2">{stat.value}</p>
                    </div>
                    <div
                      className="p-3 rounded-xl"
                      style={{ backgroundColor: `${stat.color}20` }}
                    >
                      <Icon className="h-6 w-6" style={{ color: stat.color }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                {t('dashboard.favorites')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {favorites.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  {t('dashboard.noFavorites')}
                </p>
              ) : (
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {favorites.slice(0, 5).map((fav) => (
                    <button
                      key={fav.id}
                      type="button"
                      onClick={() => {
                        if (!fav.parentCategoryId) return;
                        navigate(
                          `/admin/parent-category/${fav.parentCategoryId}/subcategory/${fav.subcategoryId}`,
                        );
                      }}
                      className="w-full text-left p-3 rounded-lg border bg-white hover:bg-slate-50 transition-colors"
                    >
                      <p className="font-medium text-sm truncate">
                        {fav.subcategoryName || t('dashboard.unnamedSubcategory')}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {[fav.departmentName, fav.parentCategoryName]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                {t('dashboard.recentVisits')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentVisits.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  {t('dashboard.noRecentVisits')}
                </p>
              ) : (
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {recentVisits.slice(0, 5).map((visit) => (
                    <button
                      key={visit.id}
                      type="button"
                      onClick={() =>
                        navigate(
                          `/admin/parent-category/${visit.parentCategoryId}/subcategory/${visit.subcategoryId}`,
                        )
                      }
                      className="w-full text-left p-3 rounded-lg border bg-white hover:bg-slate-50 transition-colors"
                    >
                      <p className="font-medium text-sm truncate">
                        {visit.subcategoryName || t('dashboard.unnamedSubcategory')}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-slate-500 truncate">
                          {[visit.departmentName, visit.parentCategoryName]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                        <p className="text-xs text-slate-400">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-500" />
                {t('dashboard.topDepartments')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {departmentStats.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  {t('dashboard.noUsageStats')}
                </p>
              ) : (
                <div className="space-y-3 max-h-36 overflow-y-auto pr-1">
                  {departmentStats.slice(0, 5).map((stat, index) => (
                    <button
                      key={stat.departmentId}
                      type="button"
                      onClick={() =>
                        navigate(`/admin/departments/${stat.departmentId}`)
                      }
                      className="w-full text-left p-3 rounded-lg border bg-white hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {stat.departmentName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {t('dashboard.visitCount', { count: stat.visitCount })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('dashboard.deptDocStatus')}</CardTitle>
              <Button
                variant="outline"
                onClick={() => navigate('/admin/departments')}
              >
                {t('common.viewAll')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {departments.map((dept) => (
                <Card
                  key={dept.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/admin/departments/${dept.id}`)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-[#2563eb] p-2 rounded-lg">
                        <Building2 className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">{dept.name}</p>
                        <p className="text-sm text-slate-500">{dept.code}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{dept.documentCount}</p>
                      <p className="text-xs text-slate-500">{t('common.documents')}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
