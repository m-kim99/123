import { useEffect } from 'react';
import {
  Users,
  Building2,
  Flag,
  MessageSquare,
  ShieldOff,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { OperatorLayout } from '@/components/OperatorLayout';
import { useOperatorStore } from '@/store/operatorStore';
import { cn } from '@/lib/utils';

export function OperatorDashboard() {
  const { stats, fetchDashboardStats, isLoading } = useOperatorStore();

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  const statCards = [
    {
      label: '전체 사용자',
      value: stats?.totalUsers ?? '-',
      icon: Users,
      color: 'bg-blue-500',
      link: '/operator/members',
    },
    {
      label: '전체 회사',
      value: stats?.totalCompanies ?? '-',
      icon: Building2,
      color: 'bg-emerald-500',
      link: '/operator/companies',
    },
    {
      label: '미처리 신고',
      value: stats?.pendingReports ?? '-',
      icon: Flag,
      color: 'bg-red-500',
      link: '/operator/reports',
      highlight: (stats?.pendingReports ?? 0) > 0,
    },
    {
      label: '미답변 문의',
      value: stats?.openInquiries ?? '-',
      icon: MessageSquare,
      color: 'bg-amber-500',
      link: '/operator/inquiries',
      highlight: (stats?.openInquiries ?? 0) > 0,
    },
    {
      label: '활성 정지',
      value: stats?.activeSuspensions ?? '-',
      icon: ShieldOff,
      color: 'bg-slate-500',
      link: '/operator/members?filter=suspended',
    },
    {
      label: '신규 가입 (7일)',
      value: stats?.newUsers7d ?? '-',
      icon: TrendingUp,
      color: 'bg-violet-500',
      link: '/operator/members?sort=recent',
    },
  ];

  return (
    <OperatorLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">대시보드</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            플랫폼 운영 현황을 한눈에 확인하세요.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.label}
                to={card.link}
                className={cn(
                  'bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow',
                  card.highlight && 'ring-2 ring-red-500 ring-offset-2'
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      {isLoading ? '...' : card.value.toLocaleString()}
                    </p>
                  </div>
                  <div className={cn('p-2 rounded-lg', card.color)}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Reports */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 dark:text-white">최근 신고</h2>
              <Link
                to="/operator/reports"
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                전체 보기 <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="p-4">
              {(stats?.pendingReports ?? 0) > 0 ? (
                <div className="text-center py-8">
                  <Flag className="w-10 h-10 text-red-400 mx-auto mb-2" />
                  <p className="text-slate-600 dark:text-slate-300">
                    처리 대기 중인 신고가 <strong>{stats?.pendingReports}건</strong> 있습니다.
                  </p>
                  <Link
                    to="/operator/reports"
                    className="inline-block mt-3 text-sm text-blue-600 hover:underline"
                  >
                    신고 처리하러 가기 →
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Flag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p>처리 대기 중인 신고가 없습니다.</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Inquiries */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 dark:text-white">미답변 문의</h2>
              <Link
                to="/operator/inquiries"
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                전체 보기 <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="p-4">
              {(stats?.openInquiries ?? 0) > 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-10 h-10 text-amber-400 mx-auto mb-2" />
                  <p className="text-slate-600 dark:text-slate-300">
                    답변 대기 중인 문의가 <strong>{stats?.openInquiries}건</strong> 있습니다.
                  </p>
                  <Link
                    to="/operator/inquiries"
                    className="inline-block mt-3 text-sm text-blue-600 hover:underline"
                  >
                    문의 답변하러 가기 →
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p>답변 대기 중인 문의가 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Growth Stats */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">가입 현황</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <p className="text-sm text-slate-500 dark:text-slate-400">최근 7일 가입</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                {isLoading ? '...' : (stats?.newUsers7d ?? 0).toLocaleString()}
                <span className="text-sm font-normal text-slate-500 ml-1">명</span>
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <p className="text-sm text-slate-500 dark:text-slate-400">최근 30일 가입</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                {isLoading ? '...' : (stats?.newUsers30d ?? 0).toLocaleString()}
                <span className="text-sm font-normal text-slate-500 ml-1">명</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </OperatorLayout>
  );
}
