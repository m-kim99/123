import { useEffect } from 'react';
import { FileText, TrendingUp, Search, Download, Building2, Star, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import { formatDateTimeSimple } from '@/lib/utils';
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
  const departmentStats = useFavoriteStore((state) => state.departmentStats);
  // 함수는 한 번에 가져오기 (참조 안정적)
  const { fetchFavorites, fetchRecentVisits, fetchDepartmentStats } = useFavoriteStore();

  useEffect(() => {
    fetchFavorites();
    fetchRecentVisits(5);
    fetchDepartmentStats();
  }, [fetchFavorites, fetchRecentVisits, fetchDepartmentStats]);

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
                많이 사용하는 부서
              </CardTitle>
            </CardHeader>
            <CardContent>
              {departmentStats.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  사용 통계가 없습니다
                </p>
              ) : (
                <div className="space-y-3 max-h-36 overflow-y-auto pr-1">
                  {departmentStats.slice(0, 5).map((stat, index) => (
                    <button
                      key={stat.departmentId}
                      type="button"
                      onClick={() =>
                        navigate(`/team/department/${stat.departmentId}`)
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
            <CardTitle>빠른 검색</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="문서명, 대분류/세부 카테고리로 검색..."
                  className="pl-9"
                />
              </div>
              <Button>검색</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>최근 문서</CardTitle>
              <Button
                variant="outline"
                onClick={() => navigate('/team/documents')}
              >
                전체 보기
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userDocuments.slice(0, 5).map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="bg-[#2563eb] p-2 rounded-lg">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-slate-500">
                        {formatDateTimeSimple(doc.uploadDate)} · {doc.uploader}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
