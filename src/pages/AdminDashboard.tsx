import { Users, FileText, Building2, TrendingUp, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
import { useNavigate } from 'react-router-dom';

export function AdminDashboard() {
  const departments = useDocumentStore((state) => state.departments);
  const documents = useDocumentStore((state) => state.documents);
  const navigate = useNavigate();

  const stats = [
    {
      title: '총 부서',
      value: departments.length,
      icon: Building2,
      color: '#2563eb',
    },
    {
      title: '총 문서',
      value: documents.length,
      icon: FileText,
      color: '#3B82F6',
    },
    {
      title: '활성 사용자',
      value: 20,
      icon: Users,
      color: '#3b82f6',
    },
    {
      title: '이번 달 업로드',
      value: 156,
      icon: TrendingUp,
      color: '#8B5CF6',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">대시보드</h1>
          <p className="text-slate-500 mt-1">시스템 현황을 한눈에 확인하세요</p>
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
                  placeholder="문서명, 부서, 카테고리로 검색..."
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
              <CardTitle>부서별 문서 현황</CardTitle>
              <Button
                variant="outline"
                onClick={() => navigate('/admin/departments')}
              >
                전체 보기
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
                      <p className="text-xs text-slate-500">문서</p>
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
