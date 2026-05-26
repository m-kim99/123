import { FileText, Building2, ChevronDown, Upload, TrendingUp, FolderOpen, BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useMemo } from 'react';
import { V1StatTile, V1CardHeader, V1PageHeader, v1Card } from '@/components/ui/v1-components';
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

  const sparklineData = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (7 - i));
      return documents.filter(doc => {
        if (!doc.uploadDate) return false;
        const dd = new Date(doc.uploadDate);
        return dd.getFullYear() === d.getFullYear() && dd.getMonth() === d.getMonth();
      }).length;
    }), [documents]);

  const lastMonthCount = useMemo(() => {
    const lm = new Date();
    lm.setMonth(lm.getMonth() - 1);
    return documents.filter(doc => {
      if (!doc.uploadDate) return false;
      const dd = new Date(doc.uploadDate);
      return dd.getFullYear() === lm.getFullYear() && dd.getMonth() === lm.getMonth();
    }).length;
  }, [documents]);

  const uploadDelta = thisMonthCount - lastMonthCount;

  const stats = [
    {
      title: t('statistics.totalDocuments'),
      value: documents.length,
      icon: FileText,
      color: '#2563eb',
      delta: thisMonthCount > 0 ? `+${thisMonthCount}` : undefined,
      data: sparklineData,
    },
    {
      title: t('statistics.thisMonthUploads'),
      value: thisMonthCount,
      icon: Upload,
      color: '#8b5cf6',
      delta: lastMonthCount > 0 ? (uploadDelta >= 0 ? `+${uploadDelta}` : `${uploadDelta}`) : undefined,
      deltaTone: (uploadDelta >= 0 ? 'up' : 'down') as 'up' | 'down',
      data: sparklineData.slice(-4),
    },
    {
      title: t('statistics.totalDepartments'),
      value: departments.length,
      icon: Building2,
      color: '#10b981',
    },
    {
      title: t('statistics.docsByParentCategory', { defaultValue: '대분류' }),
      value: parentCategories.length,
      icon: FolderOpen,
      color: '#f59e0b',
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

  const deptColors = ['#2563eb', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6'];

  const deptDistribution = useMemo(() =>
    departments.map((dept, i) => ({
      name: dept.name,
      count: dept.documentCount || 0,
      color: deptColors[i % deptColors.length],
    })).filter(d => d.count > 0)
  , [departments]);

  const deptMonthlyComparison = useMemo(() => {
    const tm = new Date();
    const lm = new Date();
    lm.setMonth(lm.getMonth() - 1);
    return departments.slice(0, 6).map((dept) => {
      const thisM = documents.filter(doc =>
        doc.uploadDate && doc.departmentId === dept.id &&
        new Date(doc.uploadDate).getFullYear() === tm.getFullYear() &&
        new Date(doc.uploadDate).getMonth() === tm.getMonth()
      ).length;
      const lastM = documents.filter(doc =>
        doc.uploadDate && doc.departmentId === dept.id &&
        new Date(doc.uploadDate).getFullYear() === lm.getFullYear() &&
        new Date(doc.uploadDate).getMonth() === lm.getMonth()
      ).length;
      return { dept: dept.name, thisM, lastM };
    });
  }, [departments, documents]);

  const deptBarMax = Math.max(...deptMonthlyComparison.flatMap(d => [d.thisM, d.lastM]), 1);
  const parentMax = Math.max(...parentCategoryStats.map(c => c.count), 1);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton className="mb-4" />

        <V1PageHeader
          eyebrow={`${selectedYear}${t('statistics.yearRange', { defaultValue: '년' })}`}
          title={t('statistics.title')}
          sub={t('statistics.subtitle')}
          right={
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1 rounded-[10px] border-[#e5e7eb] text-slate-700">
                    {t('statistics.yearLabel', { year: selectedYear })}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {availableYears.map((year) => (
                    <DropdownMenuItem key={year} onClick={() => setSelectedYear(year)} className={selectedYear === year ? 'bg-accent' : ''}>
                      {t('statistics.yearLabel', { year })}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        />

        {documents.length === 0 && (
          <p className="text-sm text-slate-500">{t('statistics.noDocuments')}</p>
        )}

        {/* ─── 4 KPI Stat Tiles ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((stat) => (
            <V1StatTile key={stat.title} {...stat} />
          ))}
        </div>

        {/* ─── Row 1: Area Chart + Donut ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          {/* Monthly Trend Area Chart */}
          <div className={v1Card}>
            <V1CardHeader
              title={t('statistics.monthlyUploads')}
              icon={TrendingUp}
              iconColor="#2563eb"
              action={
                <div className="flex items-center gap-3 text-[11.5px] text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#2563eb]" />
                    {t('statistics.thisMonthUploads', { defaultValue: '업로드' })}
                  </span>
                </div>
              }
            />
            <div className="p-5 sm:p-6">
              <div className="flex items-baseline gap-6 mb-4 flex-wrap">
                <div>
                  <div className="text-[11px] text-slate-500 font-medium mb-0.5">{t('statistics.thisMonthUploads')}</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold tracking-tight tabular-nums">{thisMonthCount}</span>
                    {lastMonthCount > 0 && (
                      <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${uploadDelta >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
                        {uploadDelta >= 0 ? `+${uploadDelta}` : uploadDelta}
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-px h-8 bg-slate-200 hidden sm:block" />
                <div className="hidden sm:block">
                  <div className="text-[11px] text-slate-500 font-medium mb-0.5">{t('statistics.totalDocuments')}</div>
                  <span className="text-2xl font-bold tracking-tight tabular-nums">{documents.length}</span>
                </div>
              </div>

              {(() => {
                const W = 540, H = 200, PL = 36, PR = 10, PT = 14, PB = 26;
                const pW = W - PL - PR, pH = H - PT - PB;
                const maxVal = Math.max(...monthlyData.map(d => d.count), 1);
                const pts = monthlyData.map((d, i) => [
                  PL + (i / Math.max(monthlyData.length - 1, 1)) * pW,
                  PT + pH - (d.count / maxVal) * pH,
                ]);
                return (
                  <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block" preserveAspectRatio="xMidYMid meet">
                    <defs>
                      <linearGradient id="stat-area-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[0, 0.25, 0.5, 0.75, 1].map(p => (
                      <line key={p} x1={PL} x2={W - PR} y1={PT + pH * p} y2={PT + pH * p} stroke="#f1f5f9" strokeWidth="1" />
                    ))}
                    {[0, 0.5, 1].map(p => (
                      <text key={p} x={PL - 6} y={PT + pH * (1 - p) + 4} fontSize="9" fill="#94a3b8" textAnchor="end" fontFamily="ui-monospace,monospace">{Math.round(maxVal * p)}</text>
                    ))}
                    <polygon fill="url(#stat-area-grad)" points={`${PL},${PT + pH} ${pts.map(p => p.join(',')).join(' ')} ${W - PR},${PT + pH}`} />
                    <polyline fill="none" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={pts.map(p => p.join(',')).join(' ')} />
                    {pts.map((p, i) => (
                      <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 3.5 : 2.5} fill="#fff" stroke="#2563eb" strokeWidth="1.5" />
                    ))}
                    {monthlyData.map((d, i) => (
                      <text key={i} x={PL + (i / Math.max(monthlyData.length - 1, 1)) * pW} y={H - 6} fontSize="9.5" fill="#94a3b8" textAnchor="middle" fontFamily="ui-monospace,monospace">{d.month}</text>
                    ))}
                    <line x1={pts[pts.length - 1][0]} y1={PT} x2={pts[pts.length - 1][0]} y2={PT + pH} stroke="#2563eb" strokeWidth="1" strokeDasharray="2 3" opacity="0.4" />
                  </svg>
                );
              })()}
            </div>
          </div>

          {/* Department Donut Chart */}
          <div className={v1Card}>
            <V1CardHeader title={t('statistics.docsByDepartment')} icon={Building2} iconColor="#2563eb" />
            <div className="p-5 sm:p-6">
              {deptDistribution.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">{t('statistics.noDocuments')}</p>
              ) : (() => {
                const total = deptDistribution.reduce((s, d) => s + d.count, 0);
                const r = 56, cx = 76, cy = 76, strokeW = 16;
                const circumference = 2 * Math.PI * r;
                let offset = 0;
                return (
                  <div className="flex flex-col items-center gap-4">
                    <svg width="152" height="152" className="shrink-0">
                      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={strokeW} />
                      {deptDistribution.map((d, i) => {
                        const len = (d.count / total) * circumference;
                        const el = (
                          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={strokeW}
                            strokeDasharray={`${len} ${circumference - len}`} strokeDashoffset={-offset}
                            transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="butt" />
                        );
                        offset += len;
                        return el;
                      })}
                      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="26" fontWeight="700" fill="#0f172a" style={{ letterSpacing: '-0.03em' }}>{total}</text>
                      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="#64748b">{t('common.documents', { defaultValue: '문서' })}</text>
                    </svg>
                    <div className="flex-1 flex flex-col gap-2.5 w-full min-w-0">
                      {deptDistribution.map(d => (
                        <div key={d.name} className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
                          <span className="text-[12.5px] font-medium text-slate-900 flex-1 truncate">{d.name}</span>
                          <span className="text-xs font-semibold text-slate-900 tabular-nums w-7 text-right">{d.count}</span>
                          <span className="text-[11px] text-slate-400 tabular-nums w-9 text-right">{((d.count / total) * 100).toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* ─── Row 2: Leaderboard + Monthly Bars ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Parent Categories Leaderboard */}
          <div className={v1Card}>
            <V1CardHeader title={t('statistics.docsByParentCategory')} icon={FolderOpen} iconColor="#2563eb" />
            <div className="px-5 sm:px-6 py-4 flex flex-col gap-3">
              {parentCategories.length === 0 ? (
                <p className="text-sm text-slate-500">{t('statistics.addParentCategory')}</p>
              ) : parentCategoryStats.map((cat, i) => (
                <div key={cat.name} className="grid grid-cols-[20px_1fr_36px] gap-3 items-center">
                  <span className="text-xs text-slate-400 font-mono font-semibold">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[13px] font-medium text-slate-900">{cat.name}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(cat.count / parentMax) * 100}%`, background: deptColors[i % deptColors.length] }} />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-900 text-right tabular-nums">{cat.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Department Comparison Bars */}
          {isAdmin && (
            <div className={v1Card}>
              <V1CardHeader
                title={t('statistics.docsByDepartment')}
                icon={BarChart3}
                iconColor="#2563eb"
                action={
                  <div className="flex items-center gap-3 text-[11.5px] text-slate-500">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#2563eb]" />{t('statistics.thisMonthUploads', { defaultValue: '이번 달' })}</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#cbd5e1]" />{t('statistics.lastMonth', { defaultValue: '지난 달' })}</span>
                  </div>
                }
              />
              <div className="px-5 sm:px-6 py-4 flex flex-col gap-3.5">
                {deptMonthlyComparison.map(d => (
                  <div key={d.dept} className="grid grid-cols-[minmax(50px,70px)_1fr_80px] gap-3 items-center">
                    <span className="text-[12.5px] font-medium text-slate-900 truncate">{d.dept}</span>
                    <div className="flex flex-col gap-1">
                      <div className="h-2.5 relative rounded-sm overflow-hidden bg-slate-50">
                        <div className="absolute inset-y-0 left-0 rounded-sm bg-[#2563eb]" style={{ width: `${(d.thisM / deptBarMax) * 100}%` }} />
                      </div>
                      <div className="h-2.5 relative rounded-sm overflow-hidden bg-slate-50">
                        <div className="absolute inset-y-0 left-0 rounded-sm bg-[#cbd5e1]" style={{ width: `${(d.lastM / deptBarMax) * 100}%` }} />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1.5 justify-end">
                      <span className="text-sm font-bold tabular-nums text-slate-900">{d.thisM}</span>
                      {(d.thisM !== 0 || d.lastM !== 0) && (
                        <span className={`text-[11px] font-semibold ${d.thisM >= d.lastM ? 'text-emerald-700' : 'text-red-700'}`}>
                          {d.thisM >= d.lastM ? '↑' : '↓'} {Math.abs(d.thisM - d.lastM)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
