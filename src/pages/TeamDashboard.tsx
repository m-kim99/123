import { useEffect } from 'react';
import { FileText, TrendingUp, Building2, Star, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import { useFavoriteStore } from '@/store/favoriteStore';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export function TeamDashboard() {
  const user = useAuthStore((state) => state.user);
  const departments = useDocumentStore((state) => state.departments);
  const documents = useDocumentStore((state) => state.documents);
  const parentCategories = useDocumentStore((state) => state.parentCategories);
  const subcategories = useDocumentStore((state) => state.subcategories);
  const navigate = useNavigate();

  // Selector 최적화: 상태값은 개별 selector로
  const favorites = useFavoriteStore((state) => state.favorites);
  const recentVisits = useFavoriteStore((state) => state.recentVisits);
  const parentCategoryStats = useFavoriteStore((state) => state.parentCategoryStats);
  // 함수는 한 번에 가져오기 (참조 안정적)
  const { fetchFavorites, fetchRecentVisits, fetchParentCategoryStats } = useFavoriteStore();

  useEffect(() => {
    fetchFavorites();
    fetchRecentVisits(5);
    fetchParentCategoryStats();
  }, [fetchFavorites, fetchRecentVisits, fetchParentCategoryStats]);

  const userDepartment = departments.find((d) => d.id === user?.departmentId);
  const userDocuments = documents.filter((d) => d.departmentId === user?.departmentId);
  const userParentCategories = parentCategories.filter(
    (pc) => pc.departmentId === user?.departmentId,
  );
  const userSubcategories = subcategories.filter(
    (sc) => sc.departmentId === user?.departmentId,
  );

  const stats = [
    {
      title: '내 부서 문서',
      value: userDocuments.length,
      icon: FileText,
      color: '#2563eb',
    },
    {
      title: '내 부서 대분류',
      value: userParentCategories.length,
      icon: Building2,
      color: '#3B82F6',
    },
    {
      title: '내 부서 세부 카테고리',
      value: userSubcategories.length,
      icon: TrendingUp,
      color: '#8B5CF6',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {userDepartment?.name} 대시보드
          </h1>
          <p className="text-slate-500 mt-1">
            부서 코드: {userDepartment?.code}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                즐겨찾기
              </CardTitle>
            </CardHeader>
            <CardContent>
              {favorites.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  즐겨찾기한 세부 카테고리가 없습니다
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
                          `/team/parent-category/${fav.parentCategoryId}/subcategory/${fav.subcategoryId}`,
                        );
                      }}
                      className="w-full text-left p-3 rounded-lg border bg-white hover:bg-slate-50 transition-colors"
                    >
                      <p className="font-medium text-sm truncate">
                        {fav.subcategoryName || '이름 없는 세부 카테고리'}
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
                최근 방문
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentVisits.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  최근 방문 기록이 없습니다
                </p>
              ) : (
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {recentVisits.slice(0, 5).map((visit) => (
                    <button
                      key={visit.id}
                      type="button"
                      onClick={() =>
                        navigate(
                          `/team/parent-category/${visit.parentCategoryId}/subcategory/${visit.subcategoryId}`,
                        )
                      }
                      className="w-full text-left p-3 rounded-lg border bg-white hover:bg-slate-50 transition-colors"
                    >
                      <p className="font-medium text-sm truncate">
                        {visit.subcategoryName || '이름 없는 세부 카테고리'}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-slate-500 truncate">
                          {[visit.departmentName, visit.parentCategoryName]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatDistanceToNow(new Date(visit.visitedAt), {
                            locale: ko,
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
                <TrendingUp className="h-5 w-5 text-green-500" />
                많이 사용하는 대분류
              </CardTitle>
            </CardHeader>
            <CardContent>
              {parentCategoryStats.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  사용 통계가 없습니다
                </p>
              ) : (
                <div className="space-y-3 max-h-36 overflow-y-auto pr-1">
                  {parentCategoryStats.slice(0, 5).map((stat, index) => (
                    <button
                      key={stat.parentCategoryId}
                      type="button"
                      onClick={() =>
                        navigate(`/team/parent-category/${stat.parentCategoryId}`)
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
                              {stat.parentCategoryName}
                            </p>
                            <p className="text-xs text-slate-500">
                              방문 {stat.visitCount}회
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
              <CardTitle>대분류별 문서 현황</CardTitle>
              <Button
                variant="outline"
                onClick={() => navigate('/team/parent-categories')}
              >
                전체 보기
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userParentCategories.map((category) => {
                const categoryDocCount = documents.filter(
                  (doc) => doc.parentCategoryId === category.id
                ).length;
                return (
                  <Card
                    key={category.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate(`/team/parent-category/${category.id}`)}
                  >
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-[#2563eb] p-2 rounded-lg">
                          <FileText className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">{category.name}</p>
                          <p className="text-sm text-slate-500">
                            {userDepartment?.name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{categoryDocCount}</p>
                        <p className="text-xs text-slate-500">문서</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {userParentCategories.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">
                  등록된 대분류가 없습니다
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
