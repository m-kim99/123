import { TrendingUp, FileText, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
import { useAuthStore } from '@/store/authStore';

export function Statistics() {
  const user = useAuthStore((state) => state.user);
  const { departments, documents } = useDocumentStore();
  const isAdmin = user?.role === 'admin';
  const primaryColor = isAdmin ? '#FF8C42' : '#10B981';

  const monthlyData = [
    { month: '1월', uploads: 45 },
    { month: '2월', uploads: 52 },
    { month: '3월', uploads: 59 },
  ];

  const topCategories = [
    { name: '급여 명세', count: 189 },
    { name: '기술 문서', count: 234 },
    { name: '프로젝트 계획서', count: 198 },
    { name: '예산 보고서', count: 134 },
    { name: '캠페인 보고서', count: 89 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">통계</h1>
          <p className="text-slate-500 mt-1">문서 관리 현황을 분석합니다</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">총 문서</p>
                  <p className="text-3xl font-bold mt-2">{documents.length}</p>
                </div>
                <div
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: `${primaryColor}20` }}
                >
                  <FileText className="h-6 w-6" style={{ color: primaryColor }} />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">이번 달</p>
                  <p className="text-3xl font-bold mt-2">59</p>
                </div>
                <div
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: `${primaryColor}20` }}
                >
                  <Calendar className="h-6 w-6" style={{ color: primaryColor }} />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">증가율</p>
                  <p className="text-3xl font-bold mt-2">+13%</p>
                </div>
                <div
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: `${primaryColor}20` }}
                >
                  <TrendingUp className="h-6 w-6" style={{ color: primaryColor }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>월별 업로드 현황</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {monthlyData.map((data) => (
                  <div key={data.month} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{data.month}</span>
                      <span className="text-slate-500">{data.uploads}건</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          backgroundColor: primaryColor,
                          width: `${(data.uploads / 100) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>카테고리별 문서 수</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topCategories.map((cat, index) => (
                  <div
                    key={cat.name}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold"
                        style={{
                          backgroundColor: `${primaryColor}20`,
                          color: primaryColor,
                        }}
                      >
                        {index + 1}
                      </div>
                      <span className="font-medium">{cat.name}</span>
                    </div>
                    <span className="font-bold">{cat.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>부서별 문서 분포</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {departments.map((dept) => (
                  <div key={dept.id} className="text-center p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500 mb-2">{dept.name}</p>
                    <p className="text-3xl font-bold" style={{ color: primaryColor }}>
                      {dept.documentCount}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">문서</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
