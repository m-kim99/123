import { useEffect, useState } from 'react';
import {
  Building2,
  Search,
  Users,
  FileText,
  Calendar,
  CalendarPlus,
  Crown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { OperatorLayout } from '@/components/OperatorLayout';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  V1PageHeader,
  V1Chip,
  v1Card,
  V1ModalHeader,
  V1ModalBody,
  V1ModalFooter,
  V1,
} from '@/components/ui/v1-components';

interface CompanySubscription {
  id: string;
  status: string;
  currentPeriodEnd: string | null;
  planName: string | null;
}

interface Company {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  memberCount: number;
  documentCount: number;
  departmentCount: number;
  subscription: CompanySubscription | null;
}

// 구독 상태 칩 (운영자 회원 관리와 동일한 표기: 무료/체험/유료/만료)
function SubscriptionChip({ subscription }: { subscription: CompanySubscription | null }) {
  if (!subscription) {
    return <V1Chip variant="neutral">무료</V1Chip>;
  }
  const planLabel = subscription.planName || '-';
  const endsAt = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;
  const isExpired = endsAt ? endsAt.getTime() < Date.now() : false;

  if (isExpired) {
    return <V1Chip variant="red">{planLabel} · 만료</V1Chip>;
  }
  if (subscription.status === 'trialing') {
    return <V1Chip variant="amber">{planLabel} · 체험</V1Chip>;
  }
  return <V1Chip variant="blue" icon={Crown}>{planLabel}</V1Chip>;
}

export function CompanyManagement() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const limit = 20;

  useEffect(() => {
    loadCompanies();
  }, [page]);

  const loadCompanies = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('companies')
        .select('id, name, code, created_at', { count: 'exact' });

      if (search) {
        query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
      }

      query = query
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      const { data, count, error } = await query;

      if (error) throw error;

      const companyIds = data?.map((c: any) => c.id) || [];

      if (companyIds.length === 0) {
        setCompanies([]);
        setTotal(0);
        return;
      }

      const [userCounts, docCounts, deptCounts, subRows] = await Promise.all([
        supabase.from('users').select('company_id').in('company_id', companyIds),
        supabase.from('documents').select('company_id').in('company_id', companyIds).is('deleted_at', null),
        supabase.from('departments').select('company_id').in('company_id', companyIds),
        supabase
          .from('subscriptions')
          .select('id, company_id, status, current_period_end, plans(name)')
          .in('company_id', companyIds)
          .order('created_at', { ascending: false }),
      ]);

      const countByCompany = (items: any[]) =>
        items.reduce((acc, item) => {
          acc[item.company_id] = (acc[item.company_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      const userMap = countByCompany(userCounts.data || []);
      const docMap = countByCompany(docCounts.data || []);
      const deptMap = countByCompany(deptCounts.data || []);

      // 회사별 대표 구독 선택: active > trialing > 기타 (같은 우선순위면 최신 행)
      const statusPriority = (s: string) => (s === 'active' ? 0 : s === 'trialing' ? 1 : 2);
      const subMap: Record<string, CompanySubscription> = {};
      (subRows.data || []).forEach((row: any) => {
        const candidate: CompanySubscription = {
          id: row.id,
          status: row.status,
          currentPeriodEnd: row.current_period_end,
          planName: row.plans?.name ?? null,
        };
        const existing = subMap[row.company_id];
        if (!existing || statusPriority(candidate.status) < statusPriority(existing.status)) {
          subMap[row.company_id] = candidate;
        }
      });

      const companiesWithStats: Company[] = (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        createdAt: c.created_at,
        memberCount: userMap[c.id] || 0,
        documentCount: docMap[c.id] || 0,
        departmentCount: deptMap[c.id] || 0,
        subscription: subMap[c.id] || null,
      }));

      setCompanies(companiesWithStats);
      setTotal(count || 0);
    } catch (error) {
      console.error('회사 목록 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadCompanies();
  };

  // ===== 체험/구독 기간 연장 (해외 유저 등 결제 불가 회사 수동 대응) =====
  const [extendTarget, setExtendTarget] = useState<Company | null>(null);
  const [extendMonths, setExtendMonths] = useState(1);
  const [isExtending, setIsExtending] = useState(false);

  const openExtendDialog = (company: Company) => {
    setExtendMonths(1);
    setExtendTarget(company);
  };

  const handleExtend = async () => {
    if (!extendTarget || isExtending) return;
    setIsExtending(true);
    try {
      const sub = extendTarget.subscription;
      const now = new Date();
      // 남은 기간이 있으면 종료일 기준, 이미 만료됐으면 오늘 기준으로 연장
      const base = sub?.currentPeriodEnd && new Date(sub.currentPeriodEnd) > now ? new Date(sub.currentPeriodEnd) : now;
      const newEnd = new Date(base);
      newEnd.setMonth(newEnd.getMonth() + extendMonths);

      if (sub) {
        // 유료(active)는 상태 유지하고 기간만 연장, 그 외(만료 체험/past_due 등)는 체험으로 재활성화
        const nextStatus = sub.status === 'active' ? 'active' : 'trialing';
        const updatePayload: Record<string, string> = {
          status: nextStatus,
          current_period_end: newEnd.toISOString(),
        };
        if (nextStatus === 'trialing') {
          updatePayload.trial_ends_at = newEnd.toISOString();
        }
        const { error } = await supabase.from('subscriptions').update(updatePayload).eq('id', sub.id);
        if (error) throw error;
      } else {
        // 구독 행이 없는 회사: 체험 구독 새로 부여 (플랜은 pro > basic > free 순)
        const { data: plans, error: planError } = await supabase
          .from('plans')
          .select('id, name')
          .in('name', ['pro', 'basic', 'free'])
          .eq('is_active', true);
        if (planError) throw planError;
        const plan = ['pro', 'basic', 'free']
          .map((name) => (plans || []).find((p: any) => p.name === name))
          .find(Boolean);
        if (!plan) throw new Error('사용 가능한 플랜이 없습니다.');
        const { error } = await supabase.from('subscriptions').insert({
          company_id: extendTarget.id,
          plan_id: plan.id,
          status: 'trialing',
          billing_cycle: 'monthly',
          trial_ends_at: newEnd.toISOString(),
          current_period_start: now.toISOString(),
          current_period_end: newEnd.toISOString(),
        });
        if (error) throw error;
      }

      toast({
        title: '기간 연장 완료',
        description: `${extendTarget.name}의 이용 기간이 ${newEnd.toLocaleDateString('ko-KR')}까지 연장되었습니다.`,
      });
      setExtendTarget(null);
      loadCompanies();
    } catch (error: any) {
      console.error('기간 연장 실패:', error);
      toast({
        title: '기간 연장 실패',
        description: error?.message || '잠시 후 다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setIsExtending(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <OperatorLayout>
      <div className="space-y-6">
        {/* Header */}
        <V1PageHeader
          eyebrow={`총 ${total.toLocaleString()}개 회사`}
          title="회사 관리"
          sub="등록된 회사를 조회하고 관리합니다."
        />

        {/* Table Card */}
        <div className={v1Card}>
          {/* Search in card header */}
          <div className="px-5 py-4 border-b border-border/50">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex gap-3 flex-1 max-w-md">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="회사명 또는 코드로 검색..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10 rounded-[10px]"
                  />
                </div>
                <Button onClick={handleSearch} className="rounded-[10px]">검색</Button>
              </div>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                총 {total.toLocaleString()}건
              </span>
            </div>
          </div>

          {/* Company List */}
          <div className="divide-y divide-border/50">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                로딩 중...
              </div>
            ) : companies.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p>검색 결과가 없습니다.</p>
              </div>
            ) : (
              companies.map((company) => (
                <div
                  key={company.id}
                  className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
                        style={{ background: `${V1.emerald}15` }}
                      >
                        <Building2 className="w-5 h-5" style={{ color: V1.emerald }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {company.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          코드: {company.code}
                        </p>
                        <div className="flex items-center gap-3 mt-3 flex-wrap">
                          <V1Chip variant="blue" icon={Users}>
                            {company.memberCount}명
                          </V1Chip>
                          <V1Chip variant="neutral" icon={FileText}>
                            {company.documentCount}건
                          </V1Chip>
                          <V1Chip variant="emerald" icon={Building2}>
                            {company.departmentCount}부서
                          </V1Chip>
                          <SubscriptionChip subscription={company.subscription} />
                          {company.subscription?.currentPeriodEnd && (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              ~ {new Date(company.subscription.currentPeriodEnd).toLocaleDateString('ko-KR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {company.createdAt ? new Date(company.createdAt).toLocaleDateString('ko-KR') : '-'}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openExtendDialog(company)}
                        className="rounded-lg text-xs h-7 px-2.5"
                      >
                        <CalendarPlus className="w-3.5 h-3.5 mr-1" />
                        기간 연장
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-border/50 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {(page - 1) * limit + 1} - {Math.min(page * limit, total)} / {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 체험/구독 기간 연장 다이얼로그 */}
      <Dialog open={extendTarget !== null} onOpenChange={(open) => { if (!open) setExtendTarget(null); }}>
        <DialogContent className="p-0 gap-0">
          <V1ModalHeader
            icon={CalendarPlus}
            iconColor={V1.emerald}
            title="이용 기간 연장"
            sub={`${extendTarget?.name ?? ''} 회사의 체험/구독 기간을 연장합니다. (해외 유저 등 결제 불가 회사 대응)`}
          />
          <V1ModalBody>
            <div className="space-y-4">
              <div className="p-3 rounded-[10px] bg-slate-50 dark:bg-slate-800/50 border border-border/50 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">현재 상태</span>
                  <SubscriptionChip subscription={extendTarget?.subscription ?? null} />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">현재 종료일</span>
                  <span className="font-medium">
                    {extendTarget?.subscription?.currentPeriodEnd
                      ? new Date(extendTarget.subscription.currentPeriodEnd).toLocaleDateString('ko-KR')
                      : '없음'}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>연장 기간</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 6].map((months) => (
                    <button
                      key={months}
                      type="button"
                      onClick={() => setExtendMonths(months)}
                      className={`h-9 rounded-[10px] text-sm font-medium border transition-colors ${
                        extendMonths === months
                          ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300'
                          : 'border-border bg-transparent text-muted-foreground hover:border-slate-300'
                      }`}
                    >
                      {months}개월
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  남은 기간이 있으면 종료일 기준, 이미 만료됐으면 오늘 기준으로 연장됩니다. 구독이 없는 회사는 체험 구독이 새로 부여됩니다.
                </p>
              </div>
            </div>
          </V1ModalBody>
          <V1ModalFooter>
            <Button variant="outline" onClick={() => setExtendTarget(null)} className="rounded-[10px]" disabled={isExtending}>
              취소
            </Button>
            <Button onClick={handleExtend} className="rounded-[10px]" disabled={isExtending}>
              {isExtending ? '처리 중...' : '연장하기'}
            </Button>
          </V1ModalFooter>
        </DialogContent>
      </Dialog>
    </OperatorLayout>
  );
}
