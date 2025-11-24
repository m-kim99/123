import { FileText, Calendar, Building2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
import { useAuthStore } from '@/store/authStore';

export function Statistics() {
  const user = useAuthStore((state) => state.user);
  const { departments, documents, categories } = useDocumentStore();
  const isAdmin = user?.role === 'admin';
  const primaryColor = '#2563eb';

  const now = new Date();

  const thisMonthCount = documents.filter((doc) => {
    if (!doc.uploadDate) return false;
    const docDate = new Date(doc.uploadDate);
    return (
      docDate.getFullYear() === now.getFullYear() &&
      docDate.getMonth() === now.getMonth()
    );
  }).length;

  const stats = [
    {
      title: '총 문서',
      value: documents.length,
      icon: FileText,
      color: '#2563eb',
    },
    {
      title: '이번 달',
      value: thisMonthCount,
      icon: Calendar,
      color: '#3B82F6',
    },
    {
      title: '전체 부서',
      value: departments.length,
      icon: Building2,
      color: '#8B5CF6',
    },
  ];

  const getMonthlyData = () => {
    const monthlyData: { month: string; count: number }[] = [];
    const baseDate = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 1);
      const monthStr = `${date.getMonth() + 1}월`;

      const count = documents.filter((doc) => {
        if (!doc.uploadDate) return false;
        const docDate = new Date(doc.uploadDate);
        return (
          docDate.getFullYear() === date.getFullYear() &&
          docDate.getMonth() === date.getMonth()
        );
      }).length;

      monthlyData.push({ month: monthStr, count });
    }

    return monthlyData;
  };

  const monthlyData = getMonthlyData();

  const categoryStats = categories
    .map((cat) => ({
      name: cat.name,
      count: documents.filter((doc) => doc.categoryId === cat.id).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">통계</h1>
          <p className="text-slate-500 mt-1">문서 관리 현황을 분석합니다</p>
        </div>

        {documents.length === 0 && (
          <p className="text-sm text-slate-500">
            아직 업로드된 문서가 없습니다.
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>월별 업로드 현황</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value: number) => `${value}건`} />
                  <Bar dataKey="count" fill={primaryColor} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>카테고리별 문서 수</CardTitle>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <p className="text-sm text-slate-500">카테고리를 추가하세요.</p>
              ) : (
                <div className="space-y-4">
                  {categoryStats.map((cat, index) => (
                    <div
                      key={cat.name}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-medium">
                          {index + 1}
                        </div>
                        <span className="font-medium">{cat.name}</span>
                      </div>
                      <span className="text-2xl font-bold">{cat.count}</span>
                    </div>
                  ))}
                </div>
              )}
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
