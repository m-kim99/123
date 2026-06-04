import { useEffect } from 'react';
import {
  Users,
  Building2,
  Flag,
  Clock,
  AlertTriangle,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { OperatorLayout } from '@/components/OperatorLayout';
import { useOperatorStore } from '@/store/operatorStore';
import {
  V1PageHeader,
  V1StatTile,
  V1CardHeader,
  V1Chip,
  v1Card,
  V1,
  V1OutlineButton,
} from '@/components/ui/v1-components';

export function OperatorDashboard() {
  const stats = useOperatorStore((s) => s.stats);
  const fetchDashboardStats = useOperatorStore((s) => s.fetchDashboardStats);
  const isLoading = useOperatorStore((s) => s.isLoading);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  const today = new Date();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')} ${dayNames[today.getDay()]}`;

  return (
    <OperatorLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <V1PageHeader
          eyebrow={`OPERATOR · ${dateStr}`}
          title="플랫폼 현황"
          sub={`지난 7일 신규 회원 +${stats?.newUsers7d ?? 0}명`}
        />

        {/* KPI Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/operator/members">
            <V1StatTile
              title="전체 회원"
              value={isLoading ? '...' : (stats?.totalUsers ?? 0).toLocaleString()}
              icon={Users}
              color={V1.blue}
              delta={stats?.newUsers7d ? `+${stats.newUsers7d}` : undefined}
              deltaTone="up"
              sub="명"
              data={[45, 52, 48, 61, 55, 67, 72]}
            />
          </Link>

          <Link to="/operator/companies">
            <V1StatTile
              title="활성 회사"
              value={isLoading ? '...' : (stats?.totalCompanies ?? 0).toLocaleString()}
              icon={Building2}
              color={V1.emerald}
              delta="+3"
              deltaTone="up"
              sub="개"
              data={[12, 14, 13, 15, 14, 16, 18]}
            />
          </Link>

          <Link to="/operator/reports">
            <V1StatTile
              title="미처리 신고"
              value={isLoading ? '...' : (stats?.pendingReports ?? 0).toLocaleString()}
              icon={Flag}
              color={V1.red}
              delta={(stats?.pendingReports ?? 0) > 0 ? 'WARN' : undefined}
              deltaTone="flat"
              sub="건"
              className={(stats?.pendingReports ?? 0) > 0 ? 'border-l-4 border-l-red-500' : ''}
            />
          </Link>

          <Link to="/operator/inquiries">
            <V1StatTile
              title="평균 응답"
              value={isLoading ? '...' : '2.4'}
              icon={Clock}
              color={V1.amber}
              delta={`${stats?.openInquiries ?? 0} 대기`}
              deltaTone="flat"
              sub="시간"
            />
          </Link>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          {/* Left: Priority Signals */}
          <div className={v1Card}>
            <V1CardHeader
              title="주의 신호"
              sub={`우선순위 높은 항목 ${(stats?.pendingReports ?? 0) + (stats?.openInquiries ?? 0)}건`}
              icon={AlertTriangle}
              iconColor={V1.red}
              action={
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs text-slate-500 dark:text-slate-400">Live</span>
                </div>
              }
            />
            <div className="divide-y divide-border/50">
              {(stats?.pendingReports ?? 0) > 0 && (
                <div className="flex items-start gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="w-1 h-full min-h-[40px] rounded-full bg-red-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">미처리 신고</span>
                      <V1Chip variant="red">{stats?.pendingReports}건 대기</V1Chip>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      긴급 처리가 필요한 신고가 있습니다
                    </p>
                  </div>
                  <Link to="/operator/reports">
                    <V1OutlineButton size="sm" icon={ArrowRight}>
                      큐 열기
                    </V1OutlineButton>
                  </Link>
                </div>
              )}

              {(stats?.openInquiries ?? 0) > 0 && (
                <div className="flex items-start gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="w-1 h-full min-h-[40px] rounded-full bg-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">미답변 문의</span>
                      <V1Chip variant="amber">{stats?.openInquiries}건 대기</V1Chip>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      24시간 내 응답이 필요합니다
                    </p>
                  </div>
                  <Link to="/operator/inquiries">
                    <V1OutlineButton size="sm" icon={ArrowRight}>
                      답변하기
                    </V1OutlineButton>
                  </Link>
                </div>
              )}

              {(stats?.activeSuspensions ?? 0) > 0 && (
                <div className="flex items-start gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="w-1 h-full min-h-[40px] rounded-full bg-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">활성 정지</span>
                      <V1Chip variant="neutral">{stats?.activeSuspensions}명</V1Chip>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      현재 정지 상태인 회원
                    </p>
                  </div>
                  <Link to="/operator/members?filter=suspended">
                    <V1OutlineButton size="sm" icon={ArrowRight}>
                      확인
                    </V1OutlineButton>
                  </Link>
                </div>
              )}

              {(stats?.pendingReports ?? 0) === 0 && (stats?.openInquiries ?? 0) === 0 && (stats?.activeSuspensions ?? 0) === 0 && (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
                    <Activity className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-sm text-muted-foreground">모든 항목이 처리되었습니다</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Today's Activity */}
          <div className={v1Card}>
            <V1CardHeader
              title="오늘의 활동"
              icon={Activity}
              iconColor={V1.violet}
            />
            <div className="p-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="text-xs text-muted-foreground w-12 shrink-0 pt-0.5">09:30</div>
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">신규 회원 가입</p>
                  <p className="text-xs text-muted-foreground">+{stats?.newUsers7d ?? 0}명 (7일)</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="text-xs text-muted-foreground w-12 shrink-0 pt-0.5">10:15</div>
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">신규 회사 등록</p>
                  <p className="text-xs text-muted-foreground">총 {stats?.totalCompanies ?? 0}개</p>
                </div>
              </div>

              {(stats?.pendingReports ?? 0) > 0 && (
                <div className="flex items-start gap-3">
                  <div className="text-xs text-muted-foreground w-12 shrink-0 pt-0.5">11:00</div>
                  <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">신규 신고 접수</p>
                    <p className="text-xs text-muted-foreground">{stats?.pendingReports}건 대기 중</p>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-border/50">
                <Link
                  to="/operator/logs"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  전체 활동 로그 보기 <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Growth Stats */}
        <div className={v1Card}>
          <V1CardHeader
            title="가입 현황"
            sub="최근 회원 가입 추이"
            icon={Users}
            iconColor={V1.blue}
          />
          <div className="p-5 grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <p className="text-xs text-muted-foreground">최근 7일 가입</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {isLoading ? '...' : (stats?.newUsers7d ?? 0).toLocaleString()}
                <span className="text-sm font-normal text-muted-foreground ml-1">명</span>
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <p className="text-xs text-muted-foreground">최근 30일 가입</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {isLoading ? '...' : (stats?.newUsers30d ?? 0).toLocaleString()}
                <span className="text-sm font-normal text-muted-foreground ml-1">명</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </OperatorLayout>
  );
}
