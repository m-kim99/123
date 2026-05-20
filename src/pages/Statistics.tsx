import { FileText, Building2, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { V1StatTile, V1CardHeader, v1Card } from '@/components/ui/v1-components';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
import { useAuthStore } from '@/store/authStore';
import { BackButton } from '@/components/BackButton';

export function Statistics() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  
  // Selector 최적화: 상태값은 개별 selector로
  const departments = useDocumentStore((state) => state.departments);
  const documents = useDocumentStore((state) => state.documents);
  const parentCategories = useDocumentStore((state) => state.parentCategories);
  const isAdmin = user?.role === 'admin';
  const primaryColor = '#2563eb';

  const now = new Date();
  const currentYear = now.getFullYear();
  
  // 연도 선택 상태
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [companyCreatedYear, setCompanyCreatedYear] = useState(currentYear);
  
  // 문서 데이터에서 가장 오래된 연도 계산
  useEffect(() => {
    if (documents.length === 0) return;
    
    let oldestYear = currentYear;
    
    documents.forEach((doc) => {
      if (doc.uploadDate) {
        const docDate = new Date(doc.uploadDate);
        const docYear = docDate.getFullYear();
        if (docYear < oldestYear && docYear > 2000) {
          oldestYear = docYear;
        }
      }
    });
    
    console.log('Oldest document year:', oldestYear);
    setCompanyCreatedYear(oldestYear);
  }, [documents, currentYear]);
  
  // 디버깅: documents 데이터 확인
  useEffect(() => {
    if (documents.length > 0) {
      console.log('Sample document:', documents[0]);
      console.log('uploadDate sample:', documents[0]?.uploadDate);
    }
  }, [documents]);
  
  // 선택 가능한 연도 목록 생성 (가장 오래된 문서 연도부터 현재 연도까지)
  const availableYears = [];
  for (let year = companyCreatedYear; year <= currentYear; year++) {
    availableYears.push(year);
  }

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
      title: t('statistics.totalDocuments'),
      value: documents.length,
      icon: FileText,
      color: '#2563eb',
    },
    {
      title: t('statistics.thisMonthUploads'),
      value: thisMonthCount,
      icon: FileText,
      color: '#3B82F6',
    },
    {
      title: t('statistics.totalDepartments'),
      value: departments.length,
      icon: Building2,
      color: '#8B5CF6',
    },
  ];

  // 선택된 연도의 1~12월 데이터 생성
  const getMonthlyData = (year: number) => {
    const monthlyData: { month: string; count: number }[] = [];

    for (let month = 0; month < 12; month++) {
      const monthStr = t(`months.${month + 1}`);

      const count = documents.filter((doc) => {
        if (!doc.uploadDate) return false;
        const docDate = new Date(doc.uploadDate);
        return (
          docDate.getFullYear() === year &&
          docDate.getMonth() === month
        );
      }).length;

      monthlyData.push({ month: monthStr, count });
    }

    return monthlyData;
  };

  const monthlyData = getMonthlyData(selectedYear);

  const parentCategoryStats = parentCategories
    .map((cat) => ({
      name: cat.name,
      count: documents.filter((doc) => doc.parentCategoryId === cat.id).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton className="mb-4" />
        <div>
          <h1 className="text-[28px] sm:text-[30px] font-bold tracking-tight text-slate-900">{t('statistics.title')}</h1>
          <p className="text-sm text-slate-500 mt-1.5">{t('statistics.subtitle')}</p>
        </div>

        {documents.length === 0 && (
          <p className="text-sm text-slate-500">
            {t('statistics.noDocuments')}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {stats.map((stat) => (
            <V1StatTile key={stat.title} title={stat.title} value={stat.value} icon={stat.icon} color={stat.color} />
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={v1Card}>
            <V1CardHeader
              title={t('statistics.monthlyUploads')}
              action={
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    {t('statistics.yearLabel', { year: selectedYear })}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {availableYears.map((year) => (
                    <DropdownMenuItem
                      key={year}
                      onClick={() => setSelectedYear(year)}
                      className={selectedYear === year ? 'bg-accent' : ''}
                    >
                      {t('statistics.yearLabel', { year })}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              }
            />
            <div className="p-5 sm:p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value: number) => t('statistics.count', { count: value })} />
                  <Bar dataKey="count" fill={primaryColor} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={v1Card}>
            <V1CardHeader title={t('statistics.docsByParentCategory')} />
            <div className="p-5 sm:p-6">
              {parentCategories.length === 0 ? (
                <p className="text-sm text-slate-500">{t('statistics.addParentCategory')}</p>
              ) : (
                <div className="space-y-4">
                  {parentCategoryStats.map((cat, index) => (
                    <div
                      key={cat.name}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 text-[#2563eb] rounded-full w-8 h-8 flex items-center justify-center font-medium">
                          {index + 1}
                        </div>
                        <span className="font-medium">{cat.name}</span>
                      </div>
                      <span className="text-2xl font-bold">{cat.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className={v1Card}>
            <V1CardHeader title={t('statistics.docsByDepartment')} />
            <div className="p-5 sm:p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {departments.map((dept) => (
                  <div key={dept.id} className="text-center p-4 bg-slate-50 rounded-[10px]">
                    <p className="text-sm text-slate-500 mb-2">{dept.name}</p>
                    <p className="text-[28px] font-bold text-[#2563eb]">
                      {dept.documentCount}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{t('common.documents')}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
